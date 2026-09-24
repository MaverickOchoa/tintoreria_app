import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace list_services
pattern = r'''@router\.get\("/services"\)
def list_services\(db: Session = Depends\(get_db\)\):
    services = db\.query\(Service\)\.all\(\)
    return \[s\.to_dict\(\) for s in services\]'''

replacement = '''@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service, Category, Color, Print, Defect
    
    # SEED DATA INJECTED
    try:
        services_data = ["Tintorería", "Planchado", "Sastrería", "Miscelánea"]
        svc_objs = {}
        for s_name in services_data:
            svc = db.query(Service).filter(Service.name == s_name).first()
            if not svc:
                svc = Service(name=s_name)
                db.add(svc)
                db.commit()
                db.refresh(svc)
            svc_objs[s_name] = svc

        cats_data = [
            ("Trajes", "Tintorería"),
            ("Camisas", "Planchado"),
            ("Vestidos", "Tintorería"),
            ("Pantalones", "Planchado")
        ]
        for c_name, s_name in cats_data:
            svc = svc_objs[s_name]
            cat = db.query(Category).filter(Category.name == c_name, Category.service_id == svc.id).first()
            if not cat:
                cat = Category(name=c_name, service_id=svc.id)
                db.add(cat)
                db.commit()

        colors_data = ['Rojo', 'Negro', 'Blanco', 'Gris Oxford', 'Gris', 'Gris Claro', 'Cafe', 'Cafe Claro', 'Cafe Obscuro', 'Azul', 'Azul Cielo', 'Azul Claro', 'Azul Rey', 'Azul Marino', 'Lila', 'Morado', 'Mora', 'Verde', 'Verde Pistache', 'Verde Claro', 'Verde Seco', 'Verde Militar', 'Verde Limon', 'Verde Agua', 'Hueso', 'Crema', 'Naranja', 'Rojo Ladrillo', 'Shedron', 'Guinda', 'Vino', 'Rosa', 'Palo De Rosa', 'Durazno', 'Melon', 'Coral', 'Fiusha', 'Amarillo', 'Amarillo Palido', 'Mostaza', 'Varios Colores', 'Dorado', 'Plateado', 'Beige', 'Amarillo Oscuro']
        for c_name in colors_data:
            if not db.query(Color).filter(Color.name == c_name).first():
                db.add(Color(name=c_name))
                db.commit()

        prints_data = ['Liso', 'Bolitas', 'Rayas', 'Gales', 'Encaje', 'Flores', 'Jaspeado', 'Tejido', 'Cuadros', 'Dos Todos', 'Palmas', 'Cuadro Chico', 'Cuadro Grande', 'Rombos', 'Panel', 'Moscata']
        for p_name in prints_data:
            if not db.query(Print).filter(Print.name == p_name).first():
                db.add(Print(name=p_name))
                db.commit()

        defects_data = ['Quemado', 'Manchado', 'Sin Raya', 'Boton Roto', 'Falta Boton', 'Luido', 'Color Corrido', 'Agujerado', 'Tela Abierta', 'Brillado', 'Encogido', 'Llorado', 'Percudido', 'Rasgado', 'Hilo Jalado', 'Adornos Maltratados', 'Tela Pelada', 'Quebrado', 'Bajo Riesgo Del Cliente', 'Sin Garantia']
        for d_name in defects_data:
            if not db.query(Defect).filter(Defect.name == d_name).first():
                db.add(Defect(name=d_name))
                db.commit()
    except Exception as e:
        print("SEED ERROR", e)

    services = db.query(Service).all()
    return [s.to_dict() for s in services]'''

content = re.sub(pattern, replacement, content)

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
