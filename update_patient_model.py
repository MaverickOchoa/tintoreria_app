import re
content = open('platform/verticals/clinic/models.py', encoding='utf-8').read()

target = 'chief_complaint = Column(Text, nullable=True)        # Motivo de consulta'
replacement = target + '''

    # Recalls (Seguimientos automatizados)
    recall_date = Column(DateTime, nullable=True)        # Fecha recomendada para su próxima cita de seguimiento
    recall_reason = Column(Text, nullable=True)          # Razón del seguimiento (ej. "Limpieza semestral")'''

content = content.replace(target, replacement)

# Update to_dict
target_dict = '"chief_complaint": self.chief_complaint,'
replacement_dict = target_dict + '''
            "recall_date": self.recall_date.isoformat() if self.recall_date else None,
            "recall_reason": self.recall_reason,'''

content = content.replace(target_dict, replacement_dict)
open('platform/verticals/clinic/models.py', 'w', encoding='utf-8').write(content)
