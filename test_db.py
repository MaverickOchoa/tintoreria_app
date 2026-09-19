from platform.core.database import Base, engine
from platform.verticals.clinic.models import ClinicExpense
Base.metadata.create_all(bind=engine)
print('SUCCESS!')
