import json
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    CollaborationSpace,
    Group,
    GroupMember,
    GroupStatus,
    Intent,
    IntentInterest,
    IntentStatus,
    IntentType,
    MemberStatus,
    Skill,
    User,
    UserSkill,
)
from app.schemas.schemas import (
    EmergentEventSuggestion,
    GroupCreate,
    GroupUpdate,
    IntentCreate,
    IntentParseResponse,
    IntentUpdate,
    MatchedUser,
    MatchingResponse,
    UserSkillCreate,
)


def _dump_json(data: Any) -> str | None:
    if data is None:
        return None
    return json.dumps(data)


def _load_json(data: str | None) -> Any:
    if not data:
        return None
    return json.loads(data)


def get_or_create_skill(db: Session, name: str, category: str | None = None) -> Skill:
    skill = db.query(Skill).filter(Skill.name.ilike(name.strip())).first()
    if skill:
        return skill
    skill = Skill(name=name.strip(), category=category)
    db.add(skill)
    db.flush()
    return skill


def set_user_skills(db: Session, user: User, skills: list[UserSkillCreate]) -> None:
    db.query(UserSkill).filter(UserSkill.user_id == user.id).delete()
    for item in skills:
        skill = get_or_create_skill(db, item.skill_name)
        db.add(UserSkill(user_id=user.id, skill_id=skill.id, proficiency=item.proficiency))


def build_user_public(user: User) -> dict[str, Any]:
    skills = []
    for us in user.skills:
        skills.append(
            {
                "skill_name": us.skill.name,
                "proficiency": us.proficiency,
                "category": us.skill.category,
            }
        )
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "university": user.university,
        "bio": user.bio,
        "location": user.location,
        "working_style": user.working_style,
        "commitment_level": user.commitment_level,
        "goals": user.goals,
        "availability": user.availability,
        "skills": skills,
    }


def create_intent(db: Session, creator: User, data: IntentCreate) -> Intent:
    intent = Intent(
        creator_id=creator.id,
        raw_text=data.raw_text,
        title=data.title,
        intent_type=data.intent_type or IntentType.OTHER,
        group_size_needed=data.group_size_needed,
        location=data.location,
        time_constraint=data.time_constraint,
        expires_at=data.expires_at,
        structured_data=_dump_json(data.structured_data),
        required_skills=_dump_json(data.required_skills),
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)
    return intent


def update_intent(db: Session, intent: Intent, data: IntentUpdate) -> Intent:
    updates = data.model_dump(exclude_unset=True)
    if "structured_data" in updates:
        updates["structured_data"] = _dump_json(updates["structured_data"])
    if "required_skills" in updates:
        updates["required_skills"] = _dump_json(updates["required_skills"])
    for key, value in updates.items():
        setattr(intent, key, value)
    db.commit()
    db.refresh(intent)
    return intent


def serialize_intent(intent: Intent) -> dict[str, Any]:
    return {
        "id": intent.id,
        "raw_text": intent.raw_text,
        "title": intent.title,
        "intent_type": intent.intent_type,
        "status": intent.status,
        "structured_data": _load_json(intent.structured_data),
        "group_size_needed": intent.group_size_needed,
        "location": intent.location,
        "time_constraint": intent.time_constraint,
        "required_skills": _load_json(intent.required_skills) or [],
        "expires_at": intent.expires_at,
        "created_at": intent.created_at,
        "creator": {
            "id": intent.creator.id,
            "name": intent.creator.name,
            "university": intent.creator.university,
        },
        "interest_count": len(intent.interests),
    }


def expire_stale_intents(db: Session) -> int:
    now = datetime.now(UTC)
    stale = (
        db.query(Intent)
        .filter(Intent.status == IntentStatus.ACTIVE, Intent.expires_at.isnot(None), Intent.expires_at < now)
        .all()
    )
    for intent in stale:
        intent.status = IntentStatus.EXPIRED
    if stale:
        db.commit()
    return len(stale)


def parse_intent_stub(raw_text: str) -> IntentParseResponse:
    """Basic rule-based parser placeholder until AI team plugs in LLM."""

    text = raw_text.lower()
    intent_type = IntentType.OTHER
    title = raw_text[:80]
    group_size = 1
    required_skills: list[str] = []
    location = None
    time_constraint = None

    if any(word in text for word in ["study", "cram", "revise", "exam"]):
        intent_type = IntentType.STUDY
        title = "Study session"
    elif "hackathon" in text:
        intent_type = IntentType.HACKATHON
        title = "Hackathon team"
    elif any(word in text for word in ["cofounder", "co-founder", "founder"]):
        intent_type = IntentType.COFOUNDER
        title = "Cofounder search"
    elif any(word in text for word in ["volunteer", "society", "club"]):
        intent_type = IntentType.VOLUNTEER
        title = "Volunteer opportunity"
    elif any(word in text for word in ["investor", "funding", "vc"]):
        intent_type = IntentType.INVESTMENT
        title = "Investment intent"
    elif any(word in text for word in ["coffee", "meet", "chat"]):
        intent_type = IntentType.SOCIAL
        title = "Spontaneous connection"

    if "frontend" in text:
        required_skills.append("Frontend")
    if "backend" in text:
        required_skills.append("Backend")
    if "designer" in text or "design" in text:
        required_skills.append("Design")
    if "ml" in text or "machine learning" in text:
        required_skills.append("Machine Learning")

    for n in range(2, 11):
        if f"{n} people" in text or f"{n} person" in text:
            group_size = n
            break
    if "three people" in text:
        group_size = 3

    if "tonight" in text or "after 6" in text or "7 pm" in text:
        time_constraint = "Tonight"
    if "uni" in text or "campus" in text:
        location = "Campus"

    return IntentParseResponse(
        intent_type=intent_type,
        title=title,
        group_size_needed=group_size,
        location=location,
        time_constraint=time_constraint,
        required_skills=required_skills,
        structured_data={
            "intent": intent_type.value,
            "group_size": group_size,
            "location": location,
            "time": time_constraint,
            "skills": required_skills,
        },
    )


def find_matches(
    db: Session,
    required_skills: list[str],
    group_size_needed: int,
    exclude_user_ids: list[int],
) -> MatchingResponse:
    """Simple skill-based matching placeholder for AI/optimization team."""

    query = (
        db.query(User)
        .options(joinedload(User.skills).joinedload(UserSkill.skill))
        .filter(User.is_active.is_(True))
    )
    if exclude_user_ids:
        query = query.filter(User.id.notin_(exclude_user_ids))

    candidates: list[MatchedUser] = []
    required_lower = [s.lower() for s in required_skills]

    for user in query.all():
        user_skill_names = [us.skill.name.lower() for us in user.skills]
        matched = [s for s in required_skills if s.lower() in user_skill_names]
        if required_skills and not matched:
            continue

        score = 0.5
        reasons: list[str] = []
        if matched:
            score += 0.3 * (len(matched) / len(required_skills))
            reasons.append(f"Has skills: {', '.join(matched)}")
        if user.availability:
            score += 0.1
            reasons.append("Availability listed")
        if user.commitment_level:
            score += 0.1
            reasons.append(f"Commitment: {user.commitment_level.value}")

        candidates.append(
            MatchedUser(
                user_id=user.id,
                name=user.name,
                match_score=round(min(score, 1.0), 2),
                matched_skills=matched,
                reasons=reasons or ["General compatibility"],
            )
        )

    candidates.sort(key=lambda c: c.match_score, reverse=True)
    return MatchingResponse(
        candidates=candidates[: group_size_needed * 3],
        suggested_group_size=group_size_needed,
    )


def create_group(db: Session, creator: User, data: GroupCreate) -> Group:
    group = Group(
        name=data.name,
        objective=data.objective,
        source_intent_id=data.source_intent_id,
        meeting_time=data.meeting_time,
        location=data.location,
        status=GroupStatus.FORMING,
    )
    db.add(group)
    db.flush()

    member_ids = set(data.member_ids)
    member_ids.add(creator.id)

    for user_id in member_ids:
        status = MemberStatus.ACCEPTED if user_id == creator.id else MemberStatus.INVITED
        db.add(
            GroupMember(
                group_id=group.id,
                user_id=user_id,
                role=data.roles.get(user_id),
                status=status,
            )
        )

    db.add(CollaborationSpace(group_id=group.id))
    db.commit()
    db.refresh(group)
    return group


def update_group(db: Session, group: Group, data: GroupUpdate) -> Group:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return group


def serialize_group(group: Group) -> dict[str, Any]:
    members = []
    for member in group.members:
        members.append(
            {
                "id": member.id,
                "user_id": member.user_id,
                "user_name": member.user.name,
                "role": member.role,
                "status": member.status,
                "joined_at": member.joined_at,
            }
        )
    space = None
    if group.collaboration_space:
        space = {
            "id": group.collaboration_space.id,
            "group_id": group.collaboration_space.group_id,
            "notes": group.collaboration_space.notes,
            "created_at": group.collaboration_space.created_at,
        }
    return {
        "id": group.id,
        "name": group.name,
        "objective": group.objective,
        "status": group.status,
        "meeting_time": group.meeting_time,
        "location": group.location,
        "next_steps": group.next_steps,
        "source_intent_id": group.source_intent_id,
        "created_at": group.created_at,
        "members": members,
        "collaboration_space": space,
    }


def detect_emergent_events(db: Session, min_cluster_size: int = 3) -> list[EmergentEventSuggestion]:
    """Cluster similar active intents for Vandanaa's emergent event feature."""

    intents = (
        db.query(Intent)
        .filter(Intent.status == IntentStatus.ACTIVE)
        .order_by(Intent.created_at.desc())
        .all()
    )
    clusters: dict[tuple[str, str | None], list[Intent]] = defaultdict(list)

    for intent in intents:
        key = (intent.intent_type.value, intent.title)
        clusters[key].append(intent)

    suggestions: list[EmergentEventSuggestion] = []
    for (intent_type, title), cluster in clusters.items():
        if len(cluster) < min_cluster_size:
            continue
        locations = [i.location for i in cluster if i.location]
        times = [i.time_constraint for i in cluster if i.time_constraint]
        suggestions.append(
            EmergentEventSuggestion(
                title=title or f"{intent_type.title()} session",
                intent_type=IntentType(intent_type),
                intent_count=len(cluster),
                intent_ids=[i.id for i in cluster],
                suggested_time=times[0] if times else None,
                suggested_location=locations[0] if locations else None,
            )
        )
    return suggestions


def express_interest(db: Session, intent: Intent, user: User, message: str | None) -> IntentInterest:
    existing = (
        db.query(IntentInterest)
        .filter(IntentInterest.intent_id == intent.id, IntentInterest.user_id == user.id)
        .first()
    )
    if existing:
        return existing
    interest = IntentInterest(intent_id=intent.id, user_id=user.id, message=message)
    db.add(interest)
    db.commit()
    db.refresh(interest)
    return interest
