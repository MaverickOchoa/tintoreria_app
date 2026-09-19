from sqlalchemy import create_engine, Column, Integer, Boolean, DateTime, String, func
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer)
    is_paid = Column(Boolean)
    scheduled_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
db = Session()

apt = Appointment(
    business_id=1,
    is_paid=True,
    scheduled_at=datetime(2026, 9, 13, 10, 0, 0),
    completed_at=datetime(2026, 9, 13, 13, 6, 0)
)
db.add(apt)
db.commit()

sd = datetime(2026, 9, 9, 0, 0, 0)
ed = datetime(2026, 9, 15, 23, 59, 59)

q = db.query(Appointment).filter(
    Appointment.business_id == 1,
    Appointment.is_paid == True,
    func.coalesce(Appointment.completed_at, Appointment.scheduled_at) >= sd,
    func.coalesce(Appointment.completed_at, Appointment.scheduled_at) <= ed
)
print("Count:", q.count())
