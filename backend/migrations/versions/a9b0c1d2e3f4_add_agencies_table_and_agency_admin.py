"""add agencies table and agency_admin support

Revision ID: a9b0c1d2e3f4
Revises: 345f9c0922a4
Create Date: 2026-03-21 02:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = 'a9b0c1d2e3f4'
down_revision = '345f9c0922a4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'agencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('contact_name', sa.String(150), nullable=True),
        sa.Column('email', sa.String(120), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('businesses', sa.Column('agency_id', sa.Integer(), sa.ForeignKey('agencies.id'), nullable=True))
    from alembic import op as _op
    from sqlalchemy import inspect
    conn = _op.get_bind()
    insp = inspect(conn)
    biz_cols = [c['name'] for c in insp.get_columns('businesses')]
    adm_cols = [c['name'] for c in insp.get_columns('admins')]
    if 'vertical_type' not in biz_cols:
        op.add_column('businesses', sa.Column('vertical_type', sa.String(30), nullable=False, server_default='laundry'))
    if 'is_agency_admin' not in adm_cols:
        op.add_column('admins', sa.Column('is_agency_admin', sa.Boolean(), nullable=False, server_default='false'))
    if 'agency_id' not in adm_cols:
        op.add_column('admins', sa.Column('agency_id', sa.Integer(), sa.ForeignKey('agencies.id'), nullable=True))


def downgrade():
    op.drop_column('admins', 'agency_id')
    op.drop_column('admins', 'is_agency_admin')
    op.drop_column('businesses', 'vertical_type')
    op.drop_column('businesses', 'agency_id')
    op.drop_table('agencies')
