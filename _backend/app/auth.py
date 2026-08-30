import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.models import PasswordResetToken, RefreshToken, User
from app.schemas.schemas import TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(db: Session, user_id: int) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw_token


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(raw_token)).first()
    if token:
        token.revoked = True
        db.commit()


def validate_refresh_token(db: Session, raw_token: str) -> User | None:
    token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(raw_token)).first()
    if not token or token.revoked:
        return None
    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        return None
    return get_user_by_id(db, token.user_id)


def create_password_reset_token(db: Session, user_id: int) -> str:
    # Invalidate prior unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.used.is_(False),
    ).update({"used": True})

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.password_reset_expire_minutes)
    db.add(
        PasswordResetToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw_token


def consume_password_reset_token(db: Session, raw_token: str) -> User | None:
    token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == hash_token(raw_token))
        .first()
    )
    if not token or token.used:
        return None
    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        return None
    token.used = True
    db.commit()
    return get_user_by_id(db, token.user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username.strip()).first()


def get_user_by_login(db: Session, login: str) -> User | None:
    login = login.strip()
    user = get_user_by_email(db, login)
    if user:
        return user
    return get_user_by_username(db, login)


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, login: str, password: str) -> User | None:
    user = get_user_by_login(db, login)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "access":
            raise credentials_exception
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id))
    except (JWTError, ValueError):
        raise credentials_exception

    user = get_user_by_id(db, token_data.user_id)  # type: ignore[arg-type]
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = get_user_by_id(db, int(user_id))
        if user is None or not user.is_active:
            return None
        return user
    except (JWTError, ValueError):
        return None
