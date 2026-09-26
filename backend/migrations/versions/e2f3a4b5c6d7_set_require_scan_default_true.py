"""set require_scan default true on existing branches

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE branches SET require_scan = TRUE WHERE require_scan IS NULL")
    op.alter_column('branches', 'require_scan',
                    existing_type=sa.Boolean(),
                    nullable=False,
                    server_default=sa.true())


def downgrade():
    op.alter_column('branches', 'require_scan',
                    existing_type=sa.Boolean(),
                    nullable=True,
                    server_default=None)
