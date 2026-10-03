"""merge heads

Revision ID: a7a5639037d9
Revises: 3bb7c603c1c3, 8875ba2edc5d
Create Date: 2026-02-13 20:52:27.082078
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a7a5639037d9"
down_revision = ("3bb7c603c1c3", "8875ba2edc5d")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
