"""add require_scan to businesses

Revision ID: c7d8e9f0a1b2
Revises: 56493a8df0dc
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'c7d8e9f0a1b2'
down_revision = '56493a8df0dc'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('businesses', sa.Column('require_scan', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade():
    op.drop_column('businesses', 'require_scan')
