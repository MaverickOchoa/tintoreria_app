"""add user role and branch_id

Revision ID: 8875ba2edc5d
Revises: 34f19087ac35
Create Date: 2026-02-12 01:23:45.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "8875ba2edc5d"
down_revision = "34f19087ac35"
branch_labels = None
depends_on = None


def upgrade():
    # 1) Agrega role primero (solo columna) para evitar problemas de batch en SQLite
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(length=40), nullable=True))

    # 2) Agrega branch_id + FK en un batch separado (evita CircularDependencyError)
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("branch_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_user_branch_id",
            "branches",
            ["branch_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    # Ojo: primero quitar FK, luego columnas (en orden inverso)
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_user_branch_id", type_="foreignkey")
        batch_op.drop_column("branch_id")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("role")
