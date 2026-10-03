# backend_new/app/models/category.py

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)

    # Global, pero depende de un servicio global
    service_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "services.id",
            name="fk_category_service_id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name = db.Column(db.String(120), nullable=False)

    __table_args__ = (
        # Evita duplicados por servicio: "Trajes" dentro de "Tintorería" una sola vez
        db.UniqueConstraint("service_id", "name", name="uq_categories_service_name"),
    )

    # Relaciones
    service = db.relationship("Service", back_populates="categories")

    # Items (por negocio) ligados a esta categoría
    items = db.relationship(
        "Item",
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="select",
        order_by="Item.id",
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id} service_id={self.service_id} name={self.name}>"
