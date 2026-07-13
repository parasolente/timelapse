"""create events and activities tables

Revision ID: 002
Revises: 001
Create Date: 2026-07-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_uid", sa.String(36), sa.ForeignKey("users.user_uid"), nullable=False, index=True),
        sa.Column("category", sa.Enum("work", "sleep", "leisure", "fitness", "transport", "personal", "eat",
                                     name="eventcategory"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "activities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id"), nullable=False, index=True),
        sa.Column("user_uid", sa.String(36), sa.ForeignKey("users.user_uid"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("events")
    sa.Enum(name="eventcategory").drop(op.get_bind())
