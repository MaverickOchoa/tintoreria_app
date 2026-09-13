# backend_new/app/models/branch.py

from app.extensions import db


class Branch(db.Model):
    __tablename__ = "branches"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=True)

    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id", name="fk_branch_business_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- RELATIONSHIPS ---

    business = db.relationship("Business", back_populates="branches")

    # Overrides de precio por sucursal para items (solo precio)
    item_overrides = db.relationship(
        "BranchItemOverride",
        back_populates="branch",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="BranchItemOverride.id.asc()",
    )

    def __repr__(self) -> str:
        return f"<Branch id={self.id} business_id={self.business_id} name={self.name!r}>"
