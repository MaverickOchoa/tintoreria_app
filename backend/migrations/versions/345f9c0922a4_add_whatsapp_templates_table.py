"""add whatsapp_templates table

Revision ID: 345f9c0922a4
Revises: 67a84970fe0d
Create Date: 2026-03-21 00:34:11.442929

"""
from alembic import op
import sqlalchemy as sa


revision = '345f9c0922a4'
down_revision = '67a84970fe0d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'whatsapp_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('message_body', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('business_id', 'trigger_type', name='uq_whatsapp_template_business_trigger')
    )


def downgrade():
    op.drop_table('whatsapp_templates')
