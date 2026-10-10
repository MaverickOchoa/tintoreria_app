from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    contact_name = Column(String(150), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(20), nullable=True)
    notes = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # In a full relational model we would link businesses and admins to agencies.
    # Since we can't alter businesses or admins easily via Alembic right now, 
    # we use an association table or just manage relations in Python logic.
    # However, for the sake of rapid implementation:
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "contact_name": self.contact_name,
            "email": self.email,
            "phone": self.phone,
            "notes": self.notes,
            "is_active": self.is_active,
            "business_count": 0, # Will be filled dynamically
            "admin_count": 0 # Will be filled dynamically
        }

class AgencyBusiness(Base):
    __tablename__ = "agency_businesses"
    
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="CASCADE"), primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), primary_key=True)

class AgencyAdminUser(Base):
    __tablename__ = "agency_admins"
    
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="CASCADE"), primary_key=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), primary_key=True)

