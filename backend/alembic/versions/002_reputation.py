"""add reputation trust and metadata fields

Revision ID: 002_reputation
Revises: 001_initial
Create Date: 2026-08-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "002_reputation"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns("users")}

    if "reputation_signal_count" not in existing:
        op.add_column(
            "users",
            sa.Column("reputation_signal_count", sa.Integer(), nullable=False, server_default="0"),
        )
    if "reputation_trusted" not in existing:
        op.add_column(
            "users",
            sa.Column("reputation_trusted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if "reputation_updated_at" not in existing:
        op.add_column(
            "users",
            sa.Column("reputation_updated_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns("users")}
    if "reputation_updated_at" in existing:
        op.drop_column("users", "reputation_updated_at")
    if "reputation_trusted" in existing:
        op.drop_column("users", "reputation_trusted")
    if "reputation_signal_count" in existing:
        op.drop_column("users", "reputation_signal_count")
