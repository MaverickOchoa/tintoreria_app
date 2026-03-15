"""add cash_cuts table

Revision ID: a1b2c3d4e5f6
Revises: ff0bf9f178fd
Create Date: 2026-03-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'ff0bf9f178fd'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cash_cuts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('cut_by', sa.String(length=120), nullable=False),
        sa.Column('cut_at', sa.DateTime(), nullable=False),
        sa.Column('period_from', sa.DateTime(), nullable=True),
        sa.Column('period_to', sa.DateTime(), nullable=False),
        sa.Column('orders_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('expected_cash', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('counted_cash', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('difference', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('card_total', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('points_total', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('cash_cuts')
