from playwright.sync_api import sync_playwright
import json, time

BASE = "http://localhost:5173"

def login(page, username, password):
    page.goto(f"{BASE}/login")
    page.locator("input").first.fill(username)
    page.locator('input[type="password"]').fill(password)
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(2000)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    page = browser.new_page()

    # ── 1. Login como business_admin ──────────────────────────────────────────
    print("\n=== TEST 1: Login bussiness_admin ===")
    login(page, "tany", "tany")
    print(f"URL: {page.url}")
    assert "/login" not in page.url, "FAIL: quedó en login"
    print("PASS: login correcto")

    # ── 2. Abrir formulario de crear empleado ─────────────────────────────────
    print("\n=== TEST 2: Formulario /create-employee ===")
    page.goto(f"{BASE}/create-employee")
    page.wait_for_timeout(1500)
    assert "/login" not in page.url, f"FAIL: redirigió a login ({page.url})"
    heading = page.locator("h5, h4").first.inner_text()
    assert "Usuario" in heading or "Empleado" in heading, f"FAIL: heading inesperado '{heading}'"
    print(f"PASS: formulario cargó — '{heading}'")

    # ── 3. Crear empleado nuevo con rol Cajero ────────────────────────────────
    print("\n=== TEST 3: Crear empleado 'testusr' con rol Cajero ===")
    inputs = page.locator("input[type='text']").all()
    # Campo 1: username
    inputs[0].fill("testusr" + str(int(time.time()))[-4:])
    username_val = inputs[0].input_value()
    page.locator('input[type="password"]').fill("Test1234!")

    # Nombre y apellido
    if len(inputs) >= 3:
        inputs[1].fill("Test")
        inputs[2].fill("Usuario")

    # Seleccionar sucursal (primer MenuItem)
    page.locator('[role="combobox"]').first.click()
    page.wait_for_timeout(500)
    page.locator('[role="option"]').first.click()
    page.wait_for_timeout(500)

    # Seleccionar "Cajero" checkbox (primer checkbox)
    checkboxes = page.locator('input[type="checkbox"]').all()
    print(f"  Checkboxes disponibles: {len(checkboxes)}")
    if checkboxes:
        checkboxes[0].check()

    # Ver preview del usuario final
    preview = page.locator("text=Usuario final").first
    if preview.is_visible():
        print(f"  Preview: {preview.inner_text()}")

    # Submit
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(3000)

    # Verificar resultado
    dialog = page.locator('[role="dialog"], .MuiAlert-root').first
    url_after = page.url
    print(f"  URL después del submit: {url_after}")
    if "/create-employee" not in url_after and "/login" not in url_after:
        print("PASS: empleado creado, navegó a otra página")
    elif page.locator('.MuiAlert-root[severity="error"]').count() > 0:
        err = page.locator('.MuiAlert-root[severity="error"]').first.inner_text()
        print(f"FAIL: error al crear — {err}")
    else:
        print(f"Resultado: {url_after}")

    # ── 4. Verificar lista de empleados ───────────────────────────────────────
    print("\n=== TEST 4: Lista de empleados ===")
    login(page, "tany", "tany")
    page.goto(f"{BASE}/employees")
    page.wait_for_timeout(2000)
    rows = page.locator("tbody tr, [data-testid='employee-row']").count()
    print(f"  Filas en tabla: {rows}")
    assert "/login" not in page.url, "FAIL: redirigió a login"
    print(f"PASS: página empleados cargó ({rows} filas)")

    browser.close()
    print("\n=== TODOS LOS TESTS COMPLETADOS ===")
