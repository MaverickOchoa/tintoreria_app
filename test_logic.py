from datetime import datetime
from pydantic import BaseModel

sd = datetime.fromisoformat("2026-09-09T06:00:00.000Z".replace('Z', '+00:00')).replace(tzinfo=None)
ed = datetime.fromisoformat("2026-09-16T05:59:59.999Z".replace('Z', '+00:00')).replace(tzinfo=None)
print("SD:", sd)
print("ED:", ed)
