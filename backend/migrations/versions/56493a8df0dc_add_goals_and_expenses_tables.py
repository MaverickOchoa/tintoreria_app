"""add goals and expenses tables

Revision ID: 56493a8df0dc
Revises: a1b2c3d4e5f6
Create Date: 2026-03-17 22:54:29.112918

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '56493a8df0dc'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('expenses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('expense_date', sa.Date(), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('item_name', sa.String(length=120), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=10, scale=3), nullable=False),
    sa.Column('unit', sa.String(length=20), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('total_cost', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by', sa.String(length=120), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('monthly_goals',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=True),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('month', sa.Integer(), nullable=False),
    sa.Column('goal_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('business_id', 'branch_id', 'year', 'month', name='uq_goal')
    )


def downgrade():
    op.drop_table('monthly_goals')
    op.drop_table('expenses')
