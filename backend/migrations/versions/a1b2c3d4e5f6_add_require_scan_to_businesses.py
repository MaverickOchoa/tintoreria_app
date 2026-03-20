"""add require_scan to businesses

Revision ID: a1b2c3d4e5f6
Revises: ff0bf9f178fd
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'ff0bf9f178fd'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('businesses', sa.Column('require_scan', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade():
    op.drop_column('businesses', 'require_scan')
