from app.extensions import db


class BranchItemOverride(db.Model):
    """
    Override de PRECIO por sucursal para un Item (que es base por negocio).

    Regla:
    - Si existe override(branch_id, item_id) => usar price_override
    - Si NO existe => usar item.price (precio base)
    """
    __tablename__ = "branch_item_overrides"

    id = db.Column(db.Integer, primary_key=True)

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id", name="fk_bio_branch_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("items.id", name="fk_bio_item_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Precio override por sucursal (MXN normalmente)
    price_override = db.Column(db.Numeric(10, 2), nullable=False)

    __table_args__ = (
        # Un solo override por sucursal por item
        db.UniqueConstraint("branch_id", "item_id", name="uq_bio_branch_item"),
    )

    # Relaciones (strings para evitar problemas de import/mapper)
    branch = db.relationship("Branch", back_populates="item_overrides")
    item = db.relationship("Item", back_populates="branch_overrides")

    def __repr__(self) -> str:
        return (
            f"<BranchItemOverride id={self.id} branch_id={self.branch_id} "
            f"item_id={self.item_id} price_override={self.price_override}>"
        )
