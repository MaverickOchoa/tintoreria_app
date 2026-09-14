from datetime import datetime
start_date = '2026-09-12T06:00:00.000Z'
sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
print(repr(sd))
# Convert to naive UTC to be absolutely safe
sd_naive = sd.replace(tzinfo=None)
print(repr(sd_naive))
