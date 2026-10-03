"""add branches table

Revision ID: 08bcd82845ca
Revises: c76b101b76e4
Create Date: 2025-12-20 23:45:39.796265

"""
from alembic import op
import sqlalchemy as sa

revision = "08bcd82845ca"
down_revision = "c76b101b76e4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            name="fk_branch_business_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_branches_business_id", "branches", ["business_id"], unique=False)


def downgrade():
    op.drop_index("ix_branches_business_id", table_name="branches")
    op.drop_table("branches")
