from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app import db

class ClinicalForm(db.Model):
    __tablename__ = "clinical_forms"
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    pdf_url = Column(String(500), nullable=True)  # path or URL to uploaded PDF
    version = Column(Integer, default=1)
    schema = Column(JSON, nullable=True)  # optional JSON schema derived from PDF
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    business = relationship('Business', back_populates='clinical_forms')

    def to_dict(self):
        return {
            'id': self.id,
            'business_id': self.business_id,
            'name': self.name,
            'description': self.description,
            'pdf_url': self.pdf_url,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
