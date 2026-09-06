"""fix fk cycle users-businesses

Revision ID: 1a6d5a57a14e
Revises: 7a61a0ae5b60
Create Date: 2025-12-24 14:56:39.685377
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "1a6d5a57a14e"
down_revision = "7a61a0ae5b60"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name if bind is not None else ""

    # SQLite no maneja nombres reales de constraints FK.
    # Este migration (drop/recreate FK por nombre) es para engines como Postgres.
    if dialect == "sqlite":
        return

    with op.batch_alter_table("businesses", schema=None) as batch_op:
        batch_op.drop_constraint(
            batch_op.f("businesses_owner_user_id_fkey"),
            type_="foreignkey",
        )
        batch_op.create_foreign_key(
            "fk_business_owner_user_id",
            "users",
            ["owner_user_id"],
            ["id"],
            ondelete="SET NULL",
            use_alter=True,
        )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint(
            batch_op.f("users_business_id_fkey"),
            type_="foreignkey",
        )
        batch_op.create_foreign_key(
            "fk_user_business_id",
            "businesses",
            ["business_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name if bind is not None else ""

    if dialect == "sqlite":
        return

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_user_business_id", type_="foreignkey")
        batch_op.create_foreign_key(
            batch_op.f("users_business_id_fkey"),
            "businesses",
            ["business_id"],
            ["id"],
        )

    with op.batch_alter_table("businesses", schema=None) as batch_op:
        batch_op.drop_constraint("fk_business_owner_user_id", type_="foreignkey")
        batch_op.create_foreign_key(
            batch_op.f("businesses_owner_user_id_fkey"),
            "users",
            ["owner_user_id"],
            ["id"],
        )
