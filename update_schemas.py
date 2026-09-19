import re
content = open('platform/verticals/clinic/schemas.py', encoding='utf-8').read()

target = '    notes: Optional[str] = None'
replacement = target + '''
    recall_date: Optional[str] = None
    recall_reason: Optional[str] = None'''

content = content.replace('class AppointmentUpdate(BaseModel):\n    doctor_id: Optional[int] = None\n    clinic_service_id: Optional[int] = None\n    scheduled_at: Optional[datetime] = None\n    duration_minutes: Optional[int] = None\n    status: Optional[str] = None\n    reason: Optional[str] = None\n    notes: Optional[str] = None', 
'''class AppointmentUpdate(BaseModel):
    doctor_id: Optional[int] = None
    clinic_service_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    recall_date: Optional[str] = None
    recall_reason: Optional[str] = None''')

open('platform/verticals/clinic/schemas.py', 'w', encoding='utf-8').write(content)
