import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''    # SEED DATA INJECTED
    try:
        services_data = \["Tintorería", "Planchado", "Sastrería", "Miscelánea"\]
.*?
        for d_name in defects_data:
            if not db\.query\(Defect\)\.filter\(Defect\.name == d_name\)\.first\(\):
                db\.add\(Defect\(name=d_name\)\)
                db\.commit\(\)
    except Exception as e:
        import traceback
        return \{"error": str\(e\), "traceback": traceback\.format_exc\(\)\}'''

replacement = '''    # SEED DATA INJECTED
    from sqlalchemy import func
    services_data = [("Tintoreria", "Tintorería"), ("Planchado", "Planchado"), ("Sastreria", "Sastrería"), ("Miscelanea", "Miscelánea")]
    svc_objs = {}
    for safe_name, real_name in services_data:
        try:
            svc = db.query(Service).filter(func.lower(Service.name) == safe_name.lower()).first()
            if not svc:
                svc = Service(name=real_name)
                db.add(svc)
                db.commit()
                db.refresh(svc)
            svc_objs[real_name] = svc
        except Exception as e:
            db.rollback()
            print("SEED SVC ERROR", e)
            
    cats_data = [
        ("Trajes", "Tintorería"),
        ("Camisas", "Planchado"),
        ("Vestidos", "Tintorería"),
        ("Pantalones", "Planchado")
    ]
    for c_name, s_name in cats_data:
        try:
            svc = svc_objs.get(s_name)
            if svc:
                cat = db.query(Category).filter(Category.name == c_name, Category.service_id == svc.id).first()
                if not cat:
                    cat = Category(name=c_name, service_id=svc.id)
                    db.add(cat)
                    db.commit()
        except Exception as e:
            db.rollback()
            print("SEED CAT ERROR", e)

    colors_data = ['Rojo', 'Negro', 'Blanco', 'Gris Oxford', 'Gris', 'Gris Claro', 'Cafe', 'Cafe Claro', 'Cafe Obscuro', 'Azul', 'Azul Cielo', 'Azul Claro', 'Azul Rey', 'Azul Marino', 'Lila', 'Morado', 'Mora', 'Verde', 'Verde Pistache', 'Verde Claro', 'Verde Seco', 'Verde Militar', 'Verde Limon', 'Verde Agua', 'Hueso', 'Crema', 'Naranja', 'Rojo Ladrillo', 'Shedron', 'Guinda', 'Vino', 'Rosa', 'Palo De Rosa', 'Durazno', 'Melon', 'Coral', 'Fiusha', 'Amarillo', 'Amarillo Palido', 'Mostaza', 'Varios Colores', 'Dorado', 'Plateado', 'Beige', 'Amarillo Oscuro']
    for c_name in colors_data:
        try:
            if not db.query(Color).filter(Color.name == c_name).first():
                db.add(Color(name=c_name))
                db.commit()
        except Exception as e:
            db.rollback()
            print("SEED COLOR ERROR", e)

    prints_data = ['Liso', 'Bolitas', 'Rayas', 'Gales', 'Encaje', 'Flores', 'Jaspeado', 'Tejido', 'Cuadros', 'Dos Todos', 'Palmas', 'Cuadro Chico', 'Cuadro Grande', 'Rombos', 'Panel', 'Moscata']
    for p_name in prints_data:
        try:
            if not db.query(Print).filter(Print.name == p_name).first():
                db.add(Print(name=p_name))
                db.commit()
        except Exception as e:
            db.rollback()
            print("SEED PRINT ERROR", e)

    defects_data = ['Quemado', 'Manchado', 'Sin Raya', 'Boton Roto', 'Falta Boton', 'Luido', 'Color Corrido', 'Agujerado', 'Tela Abierta', 'Brillado', 'Encogido', 'Llorado', 'Percudido', 'Rasgado', 'Hilo Jalado', 'Adornos Maltratados', 'Tela Pelada', 'Quebrado', 'Bajo Riesgo Del Cliente', 'Sin Garantia']
    for d_name in defects_data:
        try:
            if not db.query(Defect).filter(Defect.name == d_name).first():
                db.add(Defect(name=d_name))
                db.commit()
        except Exception as e:
            db.rollback()
            print("SEED DEFECT ERROR", e)'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
