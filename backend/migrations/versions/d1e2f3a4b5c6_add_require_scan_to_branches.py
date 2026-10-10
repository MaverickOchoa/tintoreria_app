"""add require_scan to branches

Revision ID: d1e2f3a4b5c6
Revises: c7d8e9f0a1b2
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'd1e2f3a4b5c6'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('branches', sa.Column('require_scan', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.execute("UPDATE branches SET require_scan = TRUE WHERE require_scan IS NULL")


def downgrade():
    op.drop_column('branches', 'require_scan')
