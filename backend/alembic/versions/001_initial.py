"""empty message

Revision ID: 001_initial
Revises:
Create Date: 2026-08-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("university", sa.String(length=120), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("working_style", sa.Enum("collaborative", "independent", "leader", "supportive", name="workingstyle"), nullable=True),
        sa.Column("commitment_level", sa.Enum("low", "medium", "high", name="commitmentlevel"), nullable=True),
        sa.Column("goals", sa.Text(), nullable=True),
        sa.Column("availability", sa.Text(), nullable=True),
        sa.Column("reputation_score", sa.Float(), nullable=False, server_default="3.0"),
        sa.Column("reputation_signal_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reputation_trusted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reputation_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_skills_id", "skills", ["id"])
    op.create_index("ix_skills_name", "skills", ["name"], unique=True)

    op.create_table(
        "user_skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("proficiency", sa.Integer(), nullable=False, server_default="3"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
    )

    intent_type = sa.Enum(
        "study", "hackathon", "project", "cofounder", "volunteer",
        "mentorship", "investment", "social", "other",
        name="intenttype",
    )
    intent_status = sa.Enum(
        "active", "matching", "fulfilled", "expired", "cancelled",
        name="intentstatus",
    )
    group_status = sa.Enum("forming", "active", "completed", "dissolved", name="groupstatus")
    member_status = sa.Enum("invited", "accepted", "declined", "left", name="memberstatus")

    op.create_table(
        "intents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("creator_id", sa.Integer(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("intent_type", intent_type, nullable=False),
        sa.Column("status", intent_status, nullable=False),
        sa.Column("structured_data", sa.Text(), nullable=True),
        sa.Column("group_size_needed", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("time_constraint", sa.String(length=200), nullable=True),
        sa.Column("required_skills", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_intents_id", "intents", ["id"])
    op.create_index("ix_intents_status", "intents", ["status"])

    op.create_table(
        "intent_interests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("intent_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["intent_id"], ["intents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("intent_id", "user_id", name="uq_intent_interest"),
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_intent_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("objective", sa.Text(), nullable=True),
        sa.Column("status", group_status, nullable=False),
        sa.Column("meeting_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("next_steps", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_intent_id"], ["intents.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_groups_id", "groups", ["id"])
    op.create_index("ix_groups_status", "groups", ["status"])

    op.create_table(
        "group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=True),
        sa.Column("status", member_status, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    op.create_table(
        "collaboration_spaces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id"),
    )

    op.create_table(
        "collaboration_signals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("rater_id", sa.Integer(), nullable=False),
        sa.Column("rated_id", sa.Integer(), nullable=False),
        sa.Column("showed_up", sa.Boolean(), nullable=True),
        sa.Column("completed_goal", sa.Boolean(), nullable=True),
        sa.Column("would_collaborate_again", sa.Boolean(), nullable=True),
        sa.Column("reliability_score", sa.Float(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rated_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rater_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("collaboration_signals")
    op.drop_table("collaboration_spaces")
    op.drop_table("group_members")
    op.drop_table("groups")
    op.drop_table("intent_interests")
    op.drop_table("intents")
    op.drop_table("user_skills")
    op.drop_table("skills")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS memberstatus")
    op.execute("DROP TYPE IF EXISTS groupstatus")
    op.execute("DROP TYPE IF EXISTS intentstatus")
    op.execute("DROP TYPE IF EXISTS intenttype")
    op.execute("DROP TYPE IF EXISTS commitmentlevel")
    op.execute("DROP TYPE IF EXISTS workingstyle")
