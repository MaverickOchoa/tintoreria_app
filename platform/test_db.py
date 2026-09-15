from core.database import Base, engine
from verticals.clinic.models import ClinicExpense
Base.metadata.create_all(bind=engine)
print('SUCCESS!')
