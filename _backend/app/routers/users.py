from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models.models import Skill, User, UserSkill
from app.schemas.schemas import (
    CollaborationPartner,
    PaginatedResponse,
    ReputationSummary,
    UserPublic,
    UserSkillCreate,
    UserUpdate,
)
from app.services.intent_service import build_user_public, set_user_skills
from app.services.reputation import get_collaboration_partners, get_reputation_summary, pair_compatibility

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=PaginatedResponse[UserPublic])
def list_users(
    q: str | None = Query(default=None, description="Search by name, username, or university"),
    skill: str | None = Query(default=None, description="Filter by skill name"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    trusted_only: bool = Query(default=False, description="Only users with trusted reputation"),
    db: Session = Depends(get_db),
):
    query = db.query(User).options(joinedload(User.skills).joinedload(UserSkill.skill)).filter(User.is_active.is_(True))

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (User.name.ilike(pattern)) | (User.username.ilike(pattern)) | (User.university.ilike(pattern))
        )

    if skill:
        query = query.join(User.skills).join(UserSkill.skill).filter(Skill.name.ilike(f"%{skill}%"))

    if trusted_only:
        query = query.filter(User.reputation_trusted.is_(True))

    total = query.count()
    users = (
        query.order_by(User.reputation_trusted.desc(), User.reputation_score.desc(), User.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(
        items=[build_user_public(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/me/collaborators", response_model=list[CollaborationPartner])
def my_collaborators(
    works_well_only: bool = Query(default=False),
    min_compatibility: float = Query(default=0.0, ge=0, le=5),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_collaboration_partners(
        db,
        current_user.id,
        min_compatibility=min_compatibility,
        works_well_only=works_well_only,
        limit=limit,
    )


@router.get("/me/reputation", response_model=ReputationSummary)
def my_reputation(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_reputation_summary(db, current_user.id)


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.skills).joinedload(UserSkill.skill))
        .filter(User.id == user_id, User.is_active.is_(True))
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return build_user_public(user)


@router.get("/{user_id}/reputation", response_model=ReputationSummary)
def user_reputation(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return get_reputation_summary(db, user_id)


@router.get("/{user_id}/collaborators", response_model=list[CollaborationPartner])
def user_collaborators(
    user_id: int,
    works_well_only: bool = Query(default=False),
    min_compatibility: float = Query(default=0.0, ge=0, le=5),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return get_collaboration_partners(
        db,
        user_id,
        min_compatibility=min_compatibility,
        works_well_only=works_well_only,
        limit=limit,
    )


@router.get("/{user_id}/compatibility/{other_id}", response_model=CollaborationPartner)
def user_pair_compatibility(user_id: int, other_id: int, db: Session = Depends(get_db)):
    if user_id == other_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot compare a user with themselves")
    edge = pair_compatibility(db, user_id, other_id)
    if not edge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No collaboration history between these users")
    return edge


@router.patch("/me", response_model=UserPublic)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return build_user_public(current_user)


@router.put("/me/skills", response_model=UserPublic)
def update_my_skills(
    skills: list[UserSkillCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    set_user_skills(db, current_user, skills)
    db.commit()
    db.refresh(current_user)
    return build_user_public(current_user)
