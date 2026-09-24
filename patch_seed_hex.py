import re

with open('platform/verticals/laundry/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We will inject a new route at the end of the file.
new_route = """

@router.get("/seed_hex")
def seed_hex_colors(db: Session = Depends(get_db)):
    hex_map = {
        'Rojo': '#FF0000', 'Negro': '#000000', 'Blanco': '#FFFFFF', 
        'Gris Oxford': '#4A4A4A', 'Gris': '#808080', 'Gris Claro': '#D3D3D3', 
        'Cafe': '#4B3621', 'Cafe Claro': '#C4A484', 'Cafe Obscuro': '#3E2723', 
        'Azul': '#0000FF', 'Azul Cielo': '#87CEEB', 'Azul Claro': '#ADD8E6', 
        'Azul Rey': '#4169E1', 'Azul Marino': '#000080', 'Lila': '#C8A2C8', 
        'Morado': '#800080', 'Mora': '#4B0082', 'Verde': '#008000', 
        'Verde Pistache': '#93C572', 'Verde Claro': '#90EE90', 'Verde Seco': '#8A9A5B', 
        'Verde Militar': '#4B5320', 'Verde Limon': '#32CD32', 'Verde Agua': '#20B2AA', 
        'Hueso': '#F5F5DC', 'Crema': '#FFFDD0', 'Naranja': '#FFA500', 
        'Rojo Ladrillo': '#B22222', 'Shedron': '#D2691E', 'Guinda': '#800000', 
        'Vino': '#722F37', 'Rosa': '#FFC0CB', 'Palo De Rosa': '#D1929E', 
        'Durazno': '#FFE5B4', 'Melon': '#FDBCB4', 'Coral': '#FF7F50', 
        'Fiusha': '#FF00FF', 'Amarillo': '#FFFF00', 'Amarillo Palido': '#FFFACD', 
        'Mostaza': '#FFDB58', 'Varios Colores': '#CCCCCC', 'Dorado': '#FFD700', 
        'Plateado': '#C0C0C0', 'Beige': '#F5F5DC', 'Amarillo Oscuro': '#B8860B'
    }
    from verticals.laundry.models import Color
    updated = 0
    for name, hex_c in hex_map.items():
        c = db.query(Color).filter(Color.name == name).first()
        if c and not c.hex_code:
            c.hex_code = hex_c
            updated += 1
    db.commit()
    return {"message": "Colores actualizados", "updated": updated}
"""

if "def seed_hex_colors" not in content:
    content += new_route

with open('platform/verticals/laundry/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
