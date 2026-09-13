"""link business owner to user

Revision ID: 28bf610acfa1
Revises: 08bcd82845ca
Create Date: 2025-12-21 00:10:31.712958

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "28bf610acfa1"
down_revision = "08bcd82845ca"
branch_labels = None
depends_on = None


def upgrade():
    # --- BRANCHES ---
    # En SQLite, el FK branches.business_id NO tiene por qué llamarse "branches_business_id_fkey".
    # No lo intentes dropear por nombre. Solo modifica lo necesario.
    with op.batch_alter_table("branches", schema=None) as batch_op:
        # el índice sí existe porque lo creaste en 08bcd...
        batch_op.drop_index(batch_op.f("ix_branches_business_id"))

        # NO: batch_op.drop_constraint(batch_op.f('branches_business_id_fkey'), ...)
        # NO: batch_op.create_foreign_key(None, ...)
        # Deja el FK como esté; el batch recrea la tabla con lo que siga siendo válido.

        batch_op.drop_column("address")
        batch_op.drop_column("created_at")

    # --- BUSINESSES ---
    with op.batch_alter_table("businesses", schema=None) as batch_op:
        batch_op.add_column(sa.Column("owner_user_id", sa.Integer(), nullable=True))

        # Nombres explícitos (SQLite-friendly)
        batch_op.create_unique_constraint("uq_businesses_owner_user_id", ["owner_user_id"])
        batch_op.create_foreign_key(
            "fk_business_owner_user_id",
            "users",
            ["owner_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

        batch_op.drop_column("created_at")

    # --- USERS ---
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_superadmin", sa.Boolean(), nullable=False, server_default=sa.text("0")))
        batch_op.add_column(sa.Column("business_id", sa.Integer(), nullable=True))

        batch_op.create_foreign_key(
            "fk_user_business_id",
            "businesses",
            ["business_id"],
            ["id"],
            ondelete="SET NULL",
        )

        batch_op.drop_column("user_type")
        batch_op.drop_column("created_at")

    # quitar default temporal (opcional pero limpio)
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("is_superadmin", server_default=None)


def downgrade():
    # --- USERS ---
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("created_at", postgresql.TIMESTAMP(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column("user_type", sa.VARCHAR(length=50), autoincrement=False, nullable=False))

        batch_op.drop_constraint("fk_user_business_id", type_="foreignkey")
        batch_op.drop_column("business_id")
        batch_op.drop_column("is_superadmin")

    # --- BUSINESSES ---
    with op.batch_alter_table("businesses", schema=None) as batch_op:
        batch_op.add_column(sa.Column("created_at", postgresql.TIMESTAMP(), autoincrement=False, nullable=False))

        batch_op.drop_constraint("fk_business_owner_user_id", type_="foreignkey")
        batch_op.drop_constraint("uq_businesses_owner_user_id", type_="unique")
        batch_op.drop_column("owner_user_id")

    # --- BRANCHES ---
    with op.batch_alter_table("branches", schema=None) as batch_op:
        batch_op.add_column(sa.Column("created_at", postgresql.TIMESTAMP(), autoincrement=False, nullable=False))
        batch_op.add_column(sa.Column("address", sa.VARCHAR(length=255), autoincrement=False, nullable=True))

        # recrea índice (como estaba antes)
        batch_op.create_index(batch_op.f("ix_branches_business_id"), ["business_id"], unique=False)

        # Si necesitas forzar el FK con nombre consistente:
        # OJO: solo si en tu versión previa NO existía o quedó mal.
        # En general puedes omitirlo, pero aquí lo dejamos bien.
        # Primero intenta dropear cualquier FK existente por nombre conocido (si existiera)
        # pero sin adivinar nombres: mejor crear uno con nombre estable al reconstruir.
        batch_op.create_foreign_key(
            "fk_branch_business_id",
            "businesses",
            ["business_id"],
            ["id"],
            ondelete="CASCADE",
        )
