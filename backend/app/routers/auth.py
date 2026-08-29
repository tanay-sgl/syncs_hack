from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
)
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import Token, UserMe, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserMe, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        university=data.university,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "university": user.university,
        "bio": user.bio,
        "location": user.location,
        "working_style": user.working_style,
        "commitment_level": user.commitment_level,
        "goals": user.goals,
        "availability": user.availability,
        "skills": [],
        "created_at": user.created_at,
    }


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserMe)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.intent_service import build_user_public

    return {**build_user_public(current_user), "email": current_user.email, "created_at": current_user.created_at}
