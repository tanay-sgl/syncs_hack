from datetime import datetime
import html
import re
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.models import (
    CommitmentLevel,
    GroupStatus,
    IntentStatus,
    IntentType,
    MemberStatus,
    WorkingStyle,
)

T = TypeVar("T")

PASSWORD_RULES_MSG = (
    "Password must be 8+ characters with at least one lowercase letter, "
    "one uppercase letter, one number, and one special character"
)


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[^a-zA-Z0-9]", value):
        raise ValueError("Password must contain at least one special character")
    return value


def sanitize_text(value: str, max_length: int | None = None) -> str:
    """Trim whitespace, strip HTML tags, unescape entities, enforce max length."""
    cleaned = re.sub(r"<[^>]+>", "", value)
    cleaned = html.unescape(cleaned).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        raise ValueError("Text cannot be empty or whitespace only")
    if max_length is not None and len(cleaned) > max_length:
        raise ValueError(f"Text must be at most {max_length} characters")
    return cleaned


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # Returned only in development so the reset flow is testable without email
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    university: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        username = value.strip()
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]{2,29}", username):
            raise ValueError(
                "Username must be 3-30 characters, start with a letter, and contain only letters, numbers, or underscores"
            )
        return username

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return sanitize_text(value, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserSkillCreate(BaseModel):
    skill_name: str
    proficiency: int = Field(default=3, ge=1, le=5)


class UserSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_name: str
    proficiency: int
    category: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    university: str | None = None
    bio: str | None = None
    location: str | None = None
    working_style: WorkingStyle | None = None
    commitment_level: CommitmentLevel | None = None
    goals: str | None = None
    availability: str | None = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    name: str
    university: str | None
    bio: str | None
    location: str | None
    working_style: WorkingStyle | None
    commitment_level: CommitmentLevel | None
    goals: str | None
    availability: str | None
    reputation_score: float = 3.0
    reputation_signal_count: int = 0
    reputation_trusted: bool = False
    skills: list[UserSkillResponse] = []


class ReputationSummary(BaseModel):
    user_id: int
    reputation_score: float
    reputation_signal_count: int
    reputation_trusted: bool
    min_signals_for_trust: int
    signals_until_trusted: int
    last_signal_at: datetime | None = None
    raw_weighted_score: float
    half_life_days: float
    idle_decay_days: float


class CollaborationPartner(BaseModel):
    user_id: int
    username: str
    name: str
    university: str | None = None
    reputation_score: float = 3.0
    reputation_trusted: bool = False
    compatibility_score: float
    mutual: bool
    outbound_score: float | None = None
    inbound_score: float | None = None
    signal_count: int
    shared_group_count: int
    would_collaborate_again_rate: float | None = None
    works_well_together: bool


class IntentCreatorSummary(BaseModel):
    id: int
    name: str
    username: str | None = None
    university: str | None
    reputation_score: float = 3.0
    reputation_trusted: bool = False


class UserMe(UserPublic):
    email: EmailStr
    created_at: datetime


class SkillCreate(BaseModel):
    name: str
    category: str | None = None


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str | None


class IntentCreate(BaseModel):
    raw_text: str = Field(min_length=3, max_length=2000)
    title: str | None = Field(default=None, max_length=200)
    intent_type: IntentType | None = None
    group_size_needed: int = Field(default=1, ge=1, le=50)
    location: str | None = Field(default=None, max_length=200)
    time_constraint: str | None = Field(default=None, max_length=200)
    expires_at: datetime | None = None
    structured_data: dict[str, Any] | None = None
    required_skills: list[str] | None = None

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, value: str) -> str:
        return sanitize_text(value, max_length=2000)

    @field_validator("title", "location", "time_constraint")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return sanitize_text(value, max_length=200)

    @field_validator("required_skills")
    @classmethod
    def validate_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = []
        for skill in value[:20]:
            cleaned.append(sanitize_text(skill, max_length=80))
        return cleaned


class IntentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    status: IntentStatus | None = None
    intent_type: IntentType | None = None
    group_size_needed: int | None = Field(default=None, ge=1, le=50)
    location: str | None = Field(default=None, max_length=200)
    time_constraint: str | None = Field(default=None, max_length=200)
    expires_at: datetime | None = None
    structured_data: dict[str, Any] | None = None
    required_skills: list[str] | None = None
    raw_text: str | None = Field(default=None, min_length=3, max_length=2000)

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return sanitize_text(value, max_length=2000)

    @field_validator("title", "location", "time_constraint")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return sanitize_text(value, max_length=200)


class IntentParseRequest(BaseModel):
    raw_text: str = Field(min_length=3, max_length=2000)

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, value: str) -> str:
        return sanitize_text(value, max_length=2000)


class IntentParseResponse(BaseModel):
    """Placeholder response shape for AI intent parser integration."""

    intent_type: IntentType
    title: str
    group_size_needed: int
    location: str | None = None
    time_constraint: str | None = None
    required_skills: list[str] = []
    structured_data: dict[str, Any] = {}


class IntentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    raw_text: str
    title: str | None
    intent_type: IntentType
    status: IntentStatus
    structured_data: dict[str, Any] | None = None
    group_size_needed: int
    location: str | None
    time_constraint: str | None
    required_skills: list[str] = []
    expires_at: datetime | None
    created_at: datetime
    creator: IntentCreatorSummary
    interest_count: int = 0


class IntentInterestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=500)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return sanitize_text(value, max_length=500)


class IntentInterestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    message: str | None
    created_at: datetime


class GroupMemberCreate(BaseModel):
    user_id: int
    role: str | None = None


class GroupMemberUpdate(BaseModel):
    status: MemberStatus | None = None
    role: str | None = None


class GroupMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    role: str | None
    status: MemberStatus
    joined_at: datetime


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    objective: str | None = Field(default=None, max_length=2000)
    source_intent_id: int | None = None
    meeting_time: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    member_ids: list[int] = []
    roles: dict[int, str] = {}

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return sanitize_text(value, max_length=200)


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    objective: str | None = Field(default=None, max_length=2000)
    status: GroupStatus | None = None
    meeting_time: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    next_steps: str | None = Field(default=None, max_length=2000)


class CollaborationSpaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    notes: str | None
    created_at: datetime


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    objective: str | None
    status: GroupStatus
    meeting_time: datetime | None
    location: str | None
    next_steps: str | None
    source_intent_id: int | None
    created_at: datetime
    members: list[GroupMemberResponse] = []
    collaboration_space: CollaborationSpaceResponse | None = None


class MatchingRequest(BaseModel):
    """Input for the matching engine (Tanay's team)."""

    intent_id: int | None = None
    raw_text: str | None = None
    required_skills: list[str] = []
    group_size_needed: int = 1
    exclude_user_ids: list[int] = []


class MatchedUser(BaseModel):
    user_id: int
    name: str
    match_score: float
    matched_skills: list[str] = []
    reasons: list[str] = []
    reputation_score: float = 3.0
    reputation_trusted: bool = False
    prior_compatibility: float | None = None
    worked_well_before: bool = False


class MatchingResponse(BaseModel):
    candidates: list[MatchedUser]
    suggested_group_size: int


class CollaborationSignalCreate(BaseModel):
    rated_id: int
    showed_up: bool | None = None
    completed_goal: bool | None = None
    would_collaborate_again: bool | None = None
    reliability_score: float | None = Field(default=None, ge=0, le=5)
    comment: str | None = Field(default=None, max_length=500)


class CollaborationSignalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    rater_id: int
    rated_id: int
    showed_up: bool | None
    completed_goal: bool | None
    would_collaborate_again: bool | None
    reliability_score: float | None
    comment: str | None
    created_at: datetime


class EmergentEventSuggestion(BaseModel):
    """Cluster of similar intents that could form an emergent event."""

    title: str
    intent_type: IntentType
    intent_count: int
    intent_ids: list[int]
    suggested_time: str | None = None
    suggested_location: str | None = None
