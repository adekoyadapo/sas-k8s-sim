"""add server_type to deployments

Revision ID: 0003_server_type
Revises: 0002_user_settings
Create Date: 2025-10-20 00:00:00.000002
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_server_type"
down_revision = "0002_user_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("deployments", sa.Column("server_type", sa.String(32), nullable=True))
    # optional: set default to 'nginx'
    op.execute("UPDATE deployments SET server_type='nginx' WHERE server_type IS NULL")


def downgrade() -> None:
    op.drop_column("deployments", "server_type")

