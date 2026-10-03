"""cleanup businesses legacy columns

Revision ID: 3bb7c603c1c3
Revises: 34f19087ac35
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "3bb7c603c1c3"
down_revision = "34f19087ac35"
branch_labels = None
depends_on = None


def upgrade():
    """
    Fix real DB schema mismatch:
    - DB still has legacy NOT NULL businesses.admin_id (and other legacy columns)
    - App models expect businesses.owner_user_id and no admin_id/email/phone/address

    SQLite + old unnamed constraints make batch_op.drop_constraint unreliable,
    so we rebuild the table safely: create -> copy -> drop -> rename.
    """
    conn = op.get_bind()

    # Best-effort: disable FK checks during table rebuild (SQLite)
    try:
        conn.exec_driver_sql("PRAGMA foreign_keys=OFF;")
    except Exception:
        pass

    # 1) Create clean table (only the columns we truly want)
    op.execute(
        """
        CREATE TABLE businesses_new (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            owner_user_id INTEGER NULL,
            CONSTRAINT uq_businesses_name UNIQUE (name),
            CONSTRAINT uq_businesses_owner_user_id UNIQUE (owner_user_id),
            CONSTRAINT fk_business_owner_user_id
                FOREIGN KEY(owner_user_id) REFERENCES users(id)
                ON DELETE SET NULL
        );
        """
    )

    # 2) Copy data (preserve ids + names + owner_user_id if present)
    # If owner_user_id column doesn't exist in some weird edge case, this would fail;
    # but your current DB already has owner_user_id.
    op.execute(
        """
        INSERT INTO businesses_new (id, name, owner_user_id)
        SELECT id, name, owner_user_id
        FROM businesses;
        """
    )

    # 3) Drop old table and rename new
    op.execute("DROP TABLE businesses;")
    op.execute("ALTER TABLE businesses_new RENAME TO businesses;")

    # 4) (Optional) explicit index on owner_user_id for lookup speed
    # Unique constraint already creates an index, but keeping this is harmless.
    try:
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_businesses_owner_user_id ON businesses(owner_user_id);"
        )
    except Exception:
        pass

    # Re-enable FK checks
    try:
        conn.exec_driver_sql("PRAGMA foreign_keys=ON;")
    except Exception:
        pass


def downgrade():
    """
    Recreate a legacy-ish businesses table.
    NOTE: We can't safely restore old NOT NULL admin_id without data,
    so downgrade makes admin_id nullable to avoid breaking.
    """
    conn = op.get_bind()

    try:
        conn.exec_driver_sql("PRAGMA foreign_keys=OFF;")
    except Exception:
        pass

    op.execute(
        """
        CREATE TABLE businesses_old (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            address VARCHAR(255) NULL,
            phone VARCHAR(30) NULL,
            email VARCHAR(120) NULL,
            admin_id INTEGER NULL,
            owner_user_id INTEGER NULL,
            CONSTRAINT uq_businesses_name UNIQUE (name),
            CONSTRAINT uq_businesses_email UNIQUE (email),
            CONSTRAINT uq_businesses_admin_id UNIQUE (admin_id),
            CONSTRAINT fk_businesses_admin_id
                FOREIGN KEY(admin_id) REFERENCES users(id),
            CONSTRAINT fk_business_owner_user_id
                FOREIGN KEY(owner_user_id) REFERENCES users(id)
                ON DELETE SET NULL
        );
        """
    )

    # Preserve what we can
    op.execute(
        """
        INSERT INTO businesses_old (id, name, owner_user_id)
        SELECT id, name, owner_user_id
        FROM businesses;
        """
    )

    op.execute("DROP TABLE businesses;")
    op.execute("ALTER TABLE businesses_old RENAME TO businesses;")

    try:
        conn.exec_driver_sql("PRAGMA foreign_keys=ON;")
    except Exception:
        pass
