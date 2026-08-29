from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models.models import Skill, User, UserSkill
from app.schemas.schemas import SkillCreate, SkillResponse, UserPublic, UserSkillCreate, UserUpdate
from app.services.intent_service import build_user_public, get_or_create_skill, set_user_skills

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserPublic])
def list_users(
    q: str | None = Query(default=None, description="Search by name, username, or university"),
    skill: str | None = Query(default=None, description="Filter by skill name"),
    limit: int = Query(default=50, ge=1, le=100),
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

    users = query.limit(limit).all()
    return [build_user_public(user) for user in users]


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
