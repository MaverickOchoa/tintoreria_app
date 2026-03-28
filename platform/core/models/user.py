from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from core.database import Base

employee_roles = Table(
    "employee_roles",
    Base.metadata,
    Column("employee_id", Integer, ForeignKey("employees.id"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "description": self.description}


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    is_super_admin = Column(Boolean, default=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)

    business = relationship("Business", back_populates="admin_user")
    branch = relationship("Branch", back_populates="users")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    roles = relationship("Role", secondary=employee_roles, lazy="joined",
                         backref="employees")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "username": self.username, "full_name": self.full_name,
            "phone": self.phone, "branch_id": self.branch_id, "business_id": self.business_id,
            "is_active": self.is_active, "roles": [r.name for r in self.roles],
        }
