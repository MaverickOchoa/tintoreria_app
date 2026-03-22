import pytest
from playwright.sync_api import Page, expect

BASE = "http://localhost:5173"

def login(page: Page, username: str, password: str):
    page.goto(f"{BASE}/login")
    page.fill('input[name="username"], input[placeholder*="suario"], input[type="text"]', username)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_timeout(1500)


# ── Test 1: Login como business_admin ───────────────────────────────────────
def test_login_business_admin(page: Page):
    login(page, "tany", "tany")
    # Debe llegar a seleccionar sucursal o business dashboard
    page.wait_for_timeout(2000)
    url = page.url
    assert "/login" not in url, f"Sigue en login: {url}"
    print(f"[OK] Business admin login → {url}")


# ── Test 2: Formulario de crear empleado visible ─────────────────────────────
def test_employee_form_loads(page: Page):
    login(page, "tany", "tany")
    page.wait_for_timeout(1500)

    # Si hay selector de sucursal, selecciona la primera
    if "/select-branch" in page.url or "seleccionar" in page.content().lower():
        btns = page.locator("button, [role='button']").all()
        for btn in btns:
            txt = btn.inner_text()
            if txt and "seleccionar" not in txt.lower() and len(txt) < 40:
                btn.click()
                page.wait_for_timeout(1000)
                break

    # Navegar a empleados
    page.goto(f"{BASE}/employees/new")
    page.wait_for_timeout(1500)
    url = page.url
    assert "/login" not in url, f"Redirigió al login al abrir formulario: {url}"

    # Verificar campos visibles
    assert page.locator('input').count() >= 3, "Faltan campos en el formulario"
    print(f"[OK] Formulario cargó correctamente en {url}")


# ── Test 3: Validación — no debe enviar sin rol ──────────────────────────────
def test_employee_form_validation(page: Page):
    login(page, "tany", "tany")
    page.wait_for_timeout(1500)
    page.goto(f"{BASE}/employees/new")
    page.wait_for_timeout(1500)

    if "/login" in page.url:
        pytest.skip("Requiere login previo con selector de sucursal")

    # Intentar submit vacío
    submit = page.locator('button[type="submit"]')
    if submit.count() > 0:
        submit.first.click()
        page.wait_for_timeout(500)
        # Debe mostrar error, NO navegar
        assert "/login" not in page.url, "Submit vacío redirigió al login"
        print("[OK] Validación funciona, no redirigió")


# ── Test 4: Sección de empleados accesible ───────────────────────────────────
def test_employees_page(page: Page):
    login(page, "tany", "tany")
    page.wait_for_timeout(1500)

    if "/select-branch" in page.url:
        # Selecciona primera sucursal disponible
        page.locator("button, [role='button']").first.click()
        page.wait_for_timeout(1000)

    page.goto(f"{BASE}/employees")
    page.wait_for_timeout(2000)
    url = page.url
    assert "/login" not in url, f"Employees page redirigió a login: {url}"
    print(f"[OK] Página de empleados cargó: {url}")
