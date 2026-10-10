from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "34f19087ac35"
down_revision = "6aa76e00553b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "branch_item_overrides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("price_override", sa.Numeric(precision=10, scale=2), nullable=False),

        sa.ForeignKeyConstraint(
            ["branch_id"],
            ["branches.id"],
            name="fk_bio_branch_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["item_id"],
            ["items.id"],
            name="fk_bio_item_id",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("branch_id", "item_id", name="uq_bio_branch_item"),
    )

    op.create_index(
        "ix_branch_item_overrides_branch_id",
        "branch_item_overrides",
        ["branch_id"],
        unique=False,
    )
    op.create_index(
        "ix_branch_item_overrides_item_id",
        "branch_item_overrides",
        ["item_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_branch_item_overrides_item_id", table_name="branch_item_overrides")
    op.drop_index("ix_branch_item_overrides_branch_id", table_name="branch_item_overrides")
    op.drop_table("branch_item_overrides")
