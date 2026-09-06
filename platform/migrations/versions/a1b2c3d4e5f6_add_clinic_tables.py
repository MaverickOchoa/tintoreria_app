"""add clinic tables: patients, clinic_services, appointments, clinical_records

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '56493a8df0dc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.id'), nullable=False, unique=True),
        sa.Column('blood_type', sa.String(10), nullable=True),
        sa.Column('allergies', sa.Text(), nullable=True),
        sa.Column('emergency_contact_name', sa.String(150), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(20), nullable=True),
        sa.Column('occupation', sa.String(100), nullable=True),
        sa.Column('medical_history', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'clinic_services',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('business_id', sa.Integer(), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    )

    op.create_table(
        'appointments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('business_id', sa.Integer(), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=False),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('doctor_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=True),
        sa.Column('clinic_service_id', sa.Integer(), sa.ForeignKey('clinic_services.id'), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('status', sa.String(30), nullable=False, server_default='Agendada'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_by', sa.String(120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'clinical_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True),
        sa.Column('doctor_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=True),
        sa.Column('business_id', sa.Integer(), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=False),
        sa.Column('chief_complaint', sa.Text(), nullable=True),
        sa.Column('diagnosis', sa.Text(), nullable=True),
        sa.Column('treatment', sa.Text(), nullable=True),
        sa.Column('prescription', sa.Text(), nullable=True),
        sa.Column('next_appointment_notes', sa.Text(), nullable=True),
        sa.Column('vital_signs', sa.Text(), nullable=True),
        sa.Column('record_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.String(120), nullable=True),
    )

    op.create_index('ix_appointments_business_branch', 'appointments', ['business_id', 'branch_id'])
    op.create_index('ix_appointments_scheduled_at', 'appointments', ['scheduled_at'])
    op.create_index('ix_clinical_records_patient', 'clinical_records', ['patient_id'])


def downgrade() -> None:
    op.drop_table('clinical_records')
    op.drop_table('appointments')
    op.drop_table('clinic_services')
    op.drop_table('patients')
    op.drop_column('businesses', 'vertical_type')
