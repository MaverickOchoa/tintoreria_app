from app.extensions import db


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)

    # Visible en UI (ej: "Traje 2 piezas", "Abrigo largo", etc.)
    name = db.Column(db.String(160), nullable=False)

    # Precio base por negocio (en MXN normalmente)
    # Numeric evita errores de float. (10,2) = hasta 99,999,999.99
    price = db.Column(db.Numeric(10, 2), nullable=False)

    # Activo / inactivo (por si un negocio ya no lo ofrece)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # FK: a qué categoría global pertenece (global)
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # FK: a qué negocio pertenece (precio base por negocio)
    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Evita duplicados por negocio dentro de una misma categoría:
    # Ej: En business 4, category 12, no puede existir "Traje" dos veces.
    __table_args__ = (
        db.UniqueConstraint(
            "business_id", "category_id", "name", name="uq_item_business_category_name"
        ),
    )

    # Relaciones
    category = db.relationship("Category", back_populates="items")
    business = db.relationship("Business", back_populates="items")

    # Overrides por sucursal (solo PRECIO)
    branch_overrides = db.relationship(
        "BranchItemOverride",
        back_populates="item",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="BranchItemOverride.id.asc()",
    )

    def __repr__(self) -> str:
        return (
            f"<Item id={self.id} business_id={self.business_id} "
            f"category_id={self.category_id} name={self.name!r} price={self.price}>"
        )
