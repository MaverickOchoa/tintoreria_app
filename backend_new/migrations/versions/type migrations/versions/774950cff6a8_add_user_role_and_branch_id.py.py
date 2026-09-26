"""add user role and branch_id

Revision ID: 774950cff6a8
Revises: 34f19087ac35
Create Date: 2026-02-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "774950cff6a8"
down_revision = "34f19087ac35"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("branch_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_user_branch_id",
            "branches",
            ["branch_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_user_branch_id", type_="foreignkey")
        batch_op.drop_column("branch_id")
        batch_op.drop_column("role")
