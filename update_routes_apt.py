import re
content = open('platform/verticals/clinic/routes.py', encoding='utf-8').read()

target = '    if payload.notes is not None: apt.notes = payload.notes'
replacement = target + '''

    if getattr(payload, "recall_date", None) is not None:
        try:
            from dateutil import parser
            apt.patient.recall_date = parser.parse(payload.recall_date)
        except Exception:
            pass
    if getattr(payload, "recall_reason", None) is not None:
        apt.patient.recall_reason = payload.recall_reason
'''

content = content.replace(target, replacement)
open('platform/verticals/clinic/routes.py', 'w', encoding='utf-8').write(content)
