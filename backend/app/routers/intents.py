from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models.models import Intent, IntentInterest, IntentStatus, User
from app.schemas.schemas import (
    EmergentEventSuggestion,
    IntentCreate,
    IntentInterestCreate,
    IntentInterestResponse,
    IntentParseRequest,
    IntentParseResponse,
    IntentResponse,
    IntentUpdate,
    MatchingRequest,
    MatchingResponse,
)
from app.services.intent_service import (
    create_intent,
    detect_emergent_events,
    express_interest,
    expire_stale_intents,
    find_matches,
    parse_intent_stub,
    serialize_intent,
    update_intent,
)
from app.websocket.manager import manager

router = APIRouter(prefix="/intents", tags=["intents"])


@router.post("", response_model=IntentResponse, status_code=status.HTTP_201_CREATED)
async def create_intent_endpoint(
    data: IntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.structured_data and not data.intent_type:
        parsed = parse_intent_stub(data.raw_text)
        data.intent_type = parsed.intent_type
        data.title = data.title or parsed.title
        data.group_size_needed = data.group_size_needed or parsed.group_size_needed
        data.location = data.location or parsed.location
        data.time_constraint = data.time_constraint or parsed.time_constraint
        data.required_skills = data.required_skills or parsed.required_skills
        data.structured_data = parsed.structured_data

    intent = create_intent(db, current_user, data)
    intent = (
        db.query(Intent)
        .options(joinedload(Intent.creator), joinedload(Intent.interests))
        .filter(Intent.id == intent.id)
        .first()
    )
    payload = serialize_intent(intent)  # type: ignore[arg-type]
    await manager.broadcast({"type": "intent_created", "data": payload})
    return payload


@router.get("", response_model=list[IntentResponse])
def list_intents(
    status_filter: IntentStatus | None = Query(default=IntentStatus.ACTIVE, alias="status"),
    intent_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    expire_stale_intents(db)
    query = db.query(Intent).options(joinedload(Intent.creator), joinedload(Intent.interests))

    if status_filter:
        query = query.filter(Intent.status == status_filter)
    if intent_type:
        query = query.filter(Intent.intent_type == intent_type)

    intents = query.order_by(Intent.created_at.desc()).limit(limit).all()
    return [serialize_intent(intent) for intent in intents]


@router.get("/mine", response_model=list[IntentResponse])
def my_intents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    intents = (
        db.query(Intent)
        .options(joinedload(Intent.creator), joinedload(Intent.interests))
        .filter(Intent.creator_id == current_user.id)
        .order_by(Intent.created_at.desc())
        .all()
    )
    return [serialize_intent(intent) for intent in intents]


@router.get("/emergent-events", response_model=list[EmergentEventSuggestion])
def emergent_events(
    min_cluster_size: int = Query(default=3, ge=2, le=20),
    db: Session = Depends(get_db),
):
    return detect_emergent_events(db, min_cluster_size)


@router.post("/parse", response_model=IntentParseResponse)
def parse_intent(data: IntentParseRequest):
    """AI integration point — replace stub with LLM call from matching team."""
    return parse_intent_stub(data.raw_text)


@router.post("/match", response_model=MatchingResponse)
def match_candidates(data: MatchingRequest, db: Session = Depends(get_db)):
    """Matching engine integration point."""
    required_skills = data.required_skills
    group_size = data.group_size_needed
    exclude = list(data.exclude_user_ids)

    if data.intent_id:
        intent = db.query(Intent).filter(Intent.id == data.intent_id).first()
        if not intent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
        import json

        skills = json.loads(intent.required_skills) if intent.required_skills else []
        required_skills = required_skills or skills
        group_size = intent.group_size_needed
        exclude.append(intent.creator_id)

    if data.raw_text and not required_skills:
        parsed = parse_intent_stub(data.raw_text)
        required_skills = parsed.required_skills
        group_size = parsed.group_size_needed

    return find_matches(db, required_skills, group_size, exclude)


@router.get("/{intent_id}", response_model=IntentResponse)
def get_intent(intent_id: int, db: Session = Depends(get_db)):
    intent = (
        db.query(Intent)
        .options(joinedload(Intent.creator), joinedload(Intent.interests))
        .filter(Intent.id == intent_id)
        .first()
    )
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
    return serialize_intent(intent)


@router.patch("/{intent_id}", response_model=IntentResponse)
async def patch_intent(
    intent_id: int,
    data: IntentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    intent = db.query(Intent).filter(Intent.id == intent_id).first()
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
    if intent.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your intent")

    intent = update_intent(db, intent, data)
    intent = (
        db.query(Intent)
        .options(joinedload(Intent.creator), joinedload(Intent.interests))
        .filter(Intent.id == intent.id)
        .first()
    )
    payload = serialize_intent(intent)  # type: ignore[arg-type]
    await manager.broadcast({"type": "intent_updated", "data": payload})
    return payload


@router.delete("/{intent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_intent(
    intent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    intent = db.query(Intent).filter(Intent.id == intent_id).first()
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
    if intent.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your intent")

    intent.status = IntentStatus.CANCELLED
    db.commit()
    await manager.broadcast({"type": "intent_cancelled", "data": {"id": intent_id}})


@router.post("/{intent_id}/interest", response_model=IntentInterestResponse, status_code=status.HTTP_201_CREATED)
async def join_intent(
    intent_id: int,
    data: IntentInterestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    intent = db.query(Intent).filter(Intent.id == intent_id).first()
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
    if intent.creator_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot join your own intent")

    interest = express_interest(db, intent, current_user, data.message)
    payload = {
        "id": interest.id,
        "user_id": interest.user_id,
        "user_name": current_user.name,
        "message": interest.message,
        "created_at": interest.created_at,
    }
    await manager.send_to_user(intent.creator_id, {"type": "intent_interest", "data": {"intent_id": intent_id, **payload}})
    await manager.broadcast({"type": "intent_interest", "data": {"intent_id": intent_id, **payload}})
    return payload


@router.get("/{intent_id}/interests", response_model=list[IntentInterestResponse])
def list_interests(
    intent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    intent = db.query(Intent).filter(Intent.id == intent_id).first()
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intent not found")
    if intent.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can view interests")

    interests = (
        db.query(IntentInterest)
        .options(joinedload(IntentInterest.user))
        .filter(IntentInterest.intent_id == intent_id)
        .all()
    )
    return [
        {
            "id": i.id,
            "user_id": i.user_id,
            "user_name": i.user.name,
            "message": i.message,
            "created_at": i.created_at,
        }
        for i in interests
    ]
