import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkingStyle(str, enum.Enum):
    COLLABORATIVE = "collaborative"
    INDEPENDENT = "independent"
    LEADER = "leader"
    SUPPORTIVE = "supportive"


class CommitmentLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    university: Mapped[str | None] = mapped_column(String(120))
    bio: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(120))
    working_style: Mapped[WorkingStyle | None] = mapped_column(Enum(WorkingStyle))
    commitment_level: Mapped[CommitmentLevel | None] = mapped_column(Enum(CommitmentLevel))
    goals: Mapped[str | None] = mapped_column(Text)
    availability: Mapped[str | None] = mapped_column(Text)
    reputation_score: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)
    reputation_signal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reputation_trusted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reputation_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    skills: Mapped[list["UserSkill"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    intents: Mapped[list["Intent"]] = relationship(back_populates="creator", cascade="all, delete-orphan")
    group_memberships: Mapped[list["GroupMember"]] = relationship(back_populates="user")
    intent_interests: Mapped[list["IntentInterest"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(80))

    user_skills: Mapped[list["UserSkill"]] = relationship(back_populates="skill")


class UserSkill(Base):
    __tablename__ = "user_skills"
    __table_args__ = (UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    proficiency: Mapped[int] = mapped_column(Integer, default=3)  # 1-5 scale

    user: Mapped["User"] = relationship(back_populates="skills")
    skill: Mapped["Skill"] = relationship(back_populates="user_skills")


class IntentStatus(str, enum.Enum):
    ACTIVE = "active"
    MATCHING = "matching"
    FULFILLED = "fulfilled"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class IntentType(str, enum.Enum):
    STUDY = "study"
    HACKATHON = "hackathon"
    PROJECT = "project"
    COFOUNDER = "cofounder"
    VOLUNTEER = "volunteer"
    MENTORSHIP = "mentorship"
    INVESTMENT = "investment"
    SOCIAL = "social"
    OTHER = "other"


class Intent(Base):
    __tablename__ = "intents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    intent_type: Mapped[IntentType] = mapped_column(Enum(IntentType), default=IntentType.OTHER)
    status: Mapped[IntentStatus] = mapped_column(Enum(IntentStatus), default=IntentStatus.ACTIVE, index=True)
    structured_data: Mapped[str | None] = mapped_column(Text)  # JSON string from AI parser
    group_size_needed: Mapped[int] = mapped_column(Integer, default=1)
    location: Mapped[str | None] = mapped_column(String(200))
    time_constraint: Mapped[str | None] = mapped_column(String(200))
    required_skills: Mapped[str | None] = mapped_column(Text)  # JSON array of skill names
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator: Mapped["User"] = relationship(back_populates="intents")
    interests: Mapped[list["IntentInterest"]] = relationship(back_populates="intent", cascade="all, delete-orphan")
    groups: Mapped[list["Group"]] = relationship(back_populates="source_intent")


class IntentInterest(Base):
    __tablename__ = "intent_interests"
    __table_args__ = (UniqueConstraint("intent_id", "user_id", name="uq_intent_interest"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    intent_id: Mapped[int] = mapped_column(ForeignKey("intents.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    intent: Mapped["Intent"] = relationship(back_populates="interests")
    user: Mapped["User"] = relationship(back_populates="intent_interests")


class GroupStatus(str, enum.Enum):
    FORMING = "forming"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISSOLVED = "dissolved"


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_intent_id: Mapped[int | None] = mapped_column(ForeignKey("intents.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    objective: Mapped[str | None] = mapped_column(Text)
    status: Mapped[GroupStatus] = mapped_column(Enum(GroupStatus), default=GroupStatus.FORMING, index=True)
    meeting_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String(200))
    next_steps: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    source_intent: Mapped["Intent | None"] = relationship(back_populates="groups")
    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    collaboration_space: Mapped["CollaborationSpace | None"] = relationship(
        back_populates="group", uselist=False, cascade="all, delete-orphan"
    )


class MemberStatus(str, enum.Enum):
    INVITED = "invited"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    LEFT = "left"


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[MemberStatus] = mapped_column(Enum(MemberStatus), default=MemberStatus.INVITED)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="group_memberships")


class CollaborationSpace(Base):
    __tablename__ = "collaboration_spaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="collaboration_space")


class CollaborationSignal(Base):
    """Reputation signals from real collaboration outcomes."""

    __tablename__ = "collaboration_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    rater_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rated_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    showed_up: Mapped[bool | None] = mapped_column(Boolean)
    completed_goal: Mapped[bool | None] = mapped_column(Boolean)
    would_collaborate_again: Mapped[bool | None] = mapped_column(Boolean)
    reliability_score: Mapped[float | None] = mapped_column(Float)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
