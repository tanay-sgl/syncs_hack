from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import (
    CommitmentLevel,
    GroupStatus,
    IntentStatus,
    IntentType,
    MemberStatus,
    WorkingStyle,
)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    university: str | None = None


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
    name: str
    university: str | None
    bio: str | None
    location: str | None
    working_style: WorkingStyle | None
    commitment_level: CommitmentLevel | None
    goals: str | None
    availability: str | None
    skills: list[UserSkillResponse] = []


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
    raw_text: str = Field(min_length=3)
    title: str | None = None
    intent_type: IntentType | None = None
    group_size_needed: int = Field(default=1, ge=1, le=50)
    location: str | None = None
    time_constraint: str | None = None
    expires_at: datetime | None = None
  # Optional pre-parsed structured data from AI team
    structured_data: dict[str, Any] | None = None
    required_skills: list[str] | None = None


class IntentUpdate(BaseModel):
    title: str | None = None
    status: IntentStatus | None = None
    intent_type: IntentType | None = None
    group_size_needed: int | None = Field(default=None, ge=1, le=50)
    location: str | None = None
    time_constraint: str | None = None
    expires_at: datetime | None = None
    structured_data: dict[str, Any] | None = None
    required_skills: list[str] | None = None


class IntentParseRequest(BaseModel):
    raw_text: str = Field(min_length=3)


class IntentParseResponse(BaseModel):
    """Placeholder response shape for AI intent parser integration."""

    intent_type: IntentType
    title: str
    group_size_needed: int
    location: str | None = None
    time_constraint: str | None = None
    required_skills: list[str] = []
    structured_data: dict[str, Any] = {}


class IntentCreatorSummary(BaseModel):
    id: int
    name: str
    university: str | None


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
    message: str | None = None


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
    name: str
    objective: str | None = None
    source_intent_id: int | None = None
    meeting_time: datetime | None = None
    location: str | None = None
    member_ids: list[int] = []
    roles: dict[int, str] = {}


class GroupUpdate(BaseModel):
    name: str | None = None
    objective: str | None = None
    status: GroupStatus | None = None
    meeting_time: datetime | None = None
    location: str | None = None
    next_steps: str | None = None


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


class MatchingResponse(BaseModel):
    candidates: list[MatchedUser]
    suggested_group_size: int


class CollaborationSignalCreate(BaseModel):
    rated_id: int
    showed_up: bool | None = None
    completed_goal: bool | None = None
    would_collaborate_again: bool | None = None
    reliability_score: float | None = Field(default=None, ge=0, le=5)
    comment: str | None = None


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
