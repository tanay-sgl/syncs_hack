from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.models import Skill, User
from app.schemas.schemas import SkillCreate, SkillResponse
from app.services.intent_service import get_or_create_skill

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillResponse])
def list_skills(db: Session = Depends(get_db)):
    return db.query(Skill).order_by(Skill.name).all()


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    data: SkillCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Skill).filter(Skill.name.ilike(data.name.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill already exists")
    skill = get_or_create_skill(db, data.name, data.category)
    db.commit()
    db.refresh(skill)
    return skill
