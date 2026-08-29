from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import (
    authenticate_user,
    consume_password_reset_token,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
    revoke_refresh_token,
    validate_refresh_token,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    Token,
    UserMe,
    UserRegister,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _user_me_payload(user: User) -> dict:
    from app.services.intent_service import build_user_public

    return {**build_user_public(user), "email": user.email, "created_at": user.created_at}


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
        reputation_score=3.0,
        reputation_signal_count=0,
        reputation_trusted=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_me_payload(user)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(db, user.id),
    )


@router.post("/refresh", response_model=Token)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    user = validate_refresh_token(db, data.refresh_token)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    # Rotate: revoke old, issue new pair
    revoke_refresh_token(db, data.refresh_token)
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(db, user.id),
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return MessageResponse(message="Password updated successfully")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    # Always return the same message to avoid email enumeration
    response = ForgotPasswordResponse(
        message="If an account with that email exists, a reset token has been issued.",
    )
    if not user:
        return response

    token = create_password_reset_token(db, user.id)
    if settings.environment == "development":
        response.reset_token = token
    return response


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = consume_password_reset_token(db, data.token)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return MessageResponse(message="Password reset successfully")


@router.get("/me", response_model=UserMe)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_me_payload(current_user)
