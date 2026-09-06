"""add_consent_columns_to_clients

Revision ID: 67a84970fe0d
Revises: f3a4b5c6d7e8
Create Date: 2026-03-21 00:08:41.600904

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '67a84970fe0d'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('clients', sa.Column('whatsapp_consent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('clients', sa.Column('email_consent', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('clients', 'email_consent')
    op.drop_column('clients', 'whatsapp_consent')
