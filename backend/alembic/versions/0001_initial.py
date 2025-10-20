"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2025-10-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as psql


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("user_slug", sa.String(64), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "deployments",
        sa.Column("id", psql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=False),
        sa.Column("unique_id", sa.String(16), nullable=False),
        sa.Column("ingress_host", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_index("ix_deployments_user_unique", "deployments", ["user_id", "unique_id"], unique=True)
    op.create_index("ix_deployments_namespace", "deployments", ["namespace"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_deployments_namespace", table_name="deployments")
    op.drop_index("ix_deployments_user_unique", table_name="deployments")
    op.drop_table("deployments")
    op.drop_table("users")
