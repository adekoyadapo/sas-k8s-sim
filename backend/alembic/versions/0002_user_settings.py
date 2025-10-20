"""user settings

Revision ID: 0002_user_settings
Revises: 0001_initial
Create Date: 2025-10-20 00:00:00.000001
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_user_settings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("theme", sa.String(16), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("user_settings")

