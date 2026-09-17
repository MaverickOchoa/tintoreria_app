import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from core.database import SessionLocal
from core.models.auth import Client
from verticals.clinic.models import Appointment, Patient
import os

logger = logging.getLogger(__name__)

def _send_whatsapp_mock(phone: str, message: str):
    """
    Mock integration for Twilio WhatsApp.
    Once API keys are provided, replace this with actual Twilio client.
    """
    logger.info(f"MOCK WHATSAPP sent to {phone}: {message}")

def _send_email_mock(email: str, subject: str, body: str):
    """
    Mock integration for SendGrid/Resend.
    """
    logger.info(f"MOCK EMAIL sent to {email} - {subject}: {body}")

def run_daily_reminders():
    """
    Finds appointments happening in the next 24-48 hours and sends a reminder.
    Finds patients due for a recall today and sends a notification.
    """
    logger.info("[JOBS] Starting daily reminders and recalls check...")
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        tomorrow_start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_end = tomorrow_start + timedelta(days=1)
        
        # 1. Reminders for tomorrow's appointments
        upcoming = db.query(Appointment).filter(
            Appointment.scheduled_at >= tomorrow_start,
            Appointment.scheduled_at < tomorrow_end,
            Appointment.status == "Agendada"
        ).all()
        
        logger.info(f"[JOBS] Found {len(upcoming)} upcoming appointments for reminders.")
        for apt in upcoming:
            patient = apt.patient
            client = db.query(Client).filter_by(id=patient.client_id).first() if patient else None
            if not client: continue
            
            time_str = apt.scheduled_at.strftime("%H:%M")
            msg = f"Hola {client.full_name}, te recordamos tu cita mañana a las {time_str}. Por favor confirma tu asistencia."
            
            if client.phone:
                _send_whatsapp_mock(client.phone, msg)
            if client.email:
                _send_email_mock(client.email, "Recordatorio de Cita", msg)
        
        # 2. Recalls (Follow-ups due today)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        due_recalls = db.query(Patient).filter(
            Patient.recall_date >= today_start,
            Patient.recall_date < today_end
        ).all()
        
        logger.info(f"[JOBS] Found {len(due_recalls)} patients due for recall today.")
        for pat in due_recalls:
            client = db.query(Client).filter_by(id=pat.client_id).first()
            if not client: continue
            
            reason = pat.recall_reason or "seguimiento recomendado"
            msg = f"Hola {client.full_name}, es momento de agendar tu cita para: {reason}. ¡Te esperamos!"
            
            if client.phone:
                _send_whatsapp_mock(client.phone, msg)
            if client.email:
                _send_email_mock(client.email, "Aviso de Seguimiento", msg)
                
    except Exception as e:
        logger.error(f"[JOBS] Error in daily reminders: {e}")
    finally:
        db.close()

def setup_scheduler():
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler(timezone="UTC")
    
    # Run daily at 13:00 UTC (07:00 AM CST / 08:00 AM EST)
    scheduler.add_job(run_daily_reminders, 'cron', hour=13, minute=0)
    
    scheduler.start()
    logger.info("[JOBS] Background scheduler started.")
    return scheduler
