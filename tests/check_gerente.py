import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f"{BASE}/login")
    page.locator("input").first.fill("testusr9265@Reforma")
    page.locator('input[type="password"]').fill("Test1234!")
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(2500)
    url = page.url
    claims_raw = page.evaluate("localStorage.getItem('user_claims') || '{}'")
    claims = json.loads(claims_raw)
    print(f"URL: {url}")
    print(f"Role: {claims.get('role')}")
    if "/business-admin-dashboard" in url:
        print("PASS: Gerente → business-admin-dashboard")
    elif "/login" in url:
        err = page.locator('.MuiAlert-root, [role="alert"]').first.inner_text() if page.locator('.MuiAlert-root').count() else "(sin mensaje)"
        print(f"FAIL: login fallido — {err}")
    else:
        print(f"URL inesperada: {url}")
    browser.close()
