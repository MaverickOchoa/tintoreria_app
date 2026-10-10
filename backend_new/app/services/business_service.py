# backend_new/app/services/business_service.py

from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.user import User
from app.models.business import Business
from app.models.branch import Branch


def create_business_with_owner_and_main_branch(
    business_name: str,
    owner_username: str,
    owner_password: str,
    main_branch_name: str,
    main_branch_address: str | None = None,
):
    # Validaciones de unicidad básicas (antes de intentar commit)
    if User.query.filter_by(username=owner_username).first():
        raise ValueError("El username del dueño ya existe")

    if Business.query.filter_by(name=business_name).first():
        raise ValueError("El negocio ya existe")

    try:
        # 1) Crear dueño (Business Admin)
        owner = User(
            username=owner_username,
            password_hash=generate_password_hash(owner_password),
            is_superadmin=False,
            business_id=None,  # se setea después al crear el business
        )

        db.session.add(owner)
        db.session.flush()  # para obtener owner.id sin commit

        # 2) Crear negocio (con owner_user_id)
        business = Business(
            name=business_name,
            owner_user_id=owner.id,
        )
        db.session.add(business)
        db.session.flush()  # para obtener business.id

        # 3) (Importante) El dueño también "pertenece" al negocio
        owner.business_id = business.id

        # 4) Crear sucursal principal
        branch = Branch(
            name=main_branch_name,
            address=main_branch_address,
            business_id=business.id,
        )
        db.session.add(branch)
        db.session.flush()

        # 5) Guardar todo
        db.session.commit()

        return {
            "message": "Negocio creado (Business + Owner + Sucursal principal)",
            "business": {"id": business.id, "name": business.name},
            "owner": {"id": owner.id, "username": owner.username},
            "main_branch": {"id": branch.id, "name": branch.name},
        }

    except IntegrityError:
        db.session.rollback()
        raise ValueError("Conflicto de datos (posible duplicado)")
    except Exception:
        db.session.rollback()
        raise
