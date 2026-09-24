import re

with open('platform/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

seed_endpoint = '''

@app.get("/api/v1/seed_all_data")
def seed_all_data(db: Session = Depends(get_db)):
    from verticals.laundry.models import Service, Category, Color, Print, Defect
    
    # 1. Services
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

    # 2. Categories
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

    # 3. Colors
    colors_data = ['Rojo', 'Negro', 'Blanco', 'Gris Oxford', 'Gris', 'Gris Claro', 'Cafe', 'Cafe Claro', 'Cafe Obscuro', 'Azul', 'Azul Cielo', 'Azul Claro', 'Azul Rey', 'Azul Marino', 'Lila', 'Morado', 'Mora', 'Verde', 'Verde Pistache', 'Verde Claro', 'Verde Seco', 'Verde Militar', 'Verde Limon', 'Verde Agua', 'Hueso', 'Crema', 'Naranja', 'Rojo Ladrillo', 'Shedron', 'Guinda', 'Vino', 'Rosa', 'Palo De Rosa', 'Durazno', 'Melon', 'Coral', 'Fiusha', 'Amarillo', 'Amarillo Palido', 'Mostaza', 'Varios Colores', 'Dorado', 'Plateado', 'Beige', 'Amarillo Oscuro']
    for c_name in colors_data:
        if not db.query(Color).filter(Color.name == c_name).first():
            db.add(Color(name=c_name))
            db.commit()

    # 4. Prints
    prints_data = ['Liso', 'Bolitas', 'Rayas', 'Gales', 'Encaje', 'Flores', 'Jaspeado', 'Tejido', 'Cuadros', 'Dos Todos', 'Palmas', 'Cuadro Chico', 'Cuadro Grande', 'Rombos', 'Panel', 'Moscata']
    for p_name in prints_data:
        if not db.query(Print).filter(Print.name == p_name).first():
            db.add(Print(name=p_name))
            db.commit()

    # 5. Defects
    defects_data = ['Quemado', 'Manchado', 'Sin Raya', 'Boton Roto', 'Falta Boton', 'Luido', 'Color Corrido', 'Agujerado', 'Tela Abierta', 'Brillado', 'Encogido', 'Llorado', 'Percudido', 'Rasgado', 'Hilo Jalado', 'Adornos Maltratados', 'Tela Pelada', 'Quebrado', 'Bajo Riesgo Del Cliente', 'Sin Garantia']
    for d_name in defects_data:
        if not db.query(Defect).filter(Defect.name == d_name).first():
            db.add(Defect(name=d_name))
            db.commit()

    return {"message": "Data seeded successfully!"}

'''

content = content + seed_endpoint

with open('platform/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
