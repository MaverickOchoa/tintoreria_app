# backend_new/app/models/business.py

from app.extensions import db


class Business(db.Model):
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

    # Dueño (Business Admin) -> users.id
    # use_alter=True rompe el ciclo en migraciones (FK via ALTER después)
    owner_user_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id",
            name="fk_business_owner_user_id",
            ondelete="SET NULL",
            use_alter=True,
        ),
        unique=True,
        nullable=True,
        index=True,
    )

    # --- RELATIONSHIPS ---

    # Usuario dueño del negocio
    owner = db.relationship(
        "User",
        foreign_keys=[owner_user_id],
        back_populates="owned_business",
        uselist=False,
        lazy="select",
    )

    # Usuarios que pertenecen al negocio
    users = db.relationship(
        "User",
        foreign_keys="User.business_id",
        back_populates="business",
        lazy="select",
    )

    # Sucursales del negocio
    branches = db.relationship(
        "Branch",
        back_populates="business",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="select",
        order_by="Branch.id",
    )

    # Items por negocio (precios base por negocio)
    # OJO: order_by="Item.id" (sin .asc()) para no romper el mapper al iniciar.
    items = db.relationship(
        "Item",
        back_populates="business",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="select",
        order_by="Item.id",
    )

    def __repr__(self) -> str:
        return f"<Business id={self.id} name={self.name}>"
