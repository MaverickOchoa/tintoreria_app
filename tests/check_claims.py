from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/login")
    page.locator("input").first.fill("tany")
    page.locator('input[type="password"]').fill("tany")
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(2000)
    claims = page.evaluate("localStorage.getItem('user_claims')")
    token = page.evaluate("localStorage.getItem('access_token')")
    print("URL:", page.url)
    print("claims:", claims)
    print("has_token:", bool(token))
    # Now go to employees/new
    page.goto("http://localhost:5173/employees/new")
    page.wait_for_timeout(1500)
    print("employees/new URL:", page.url)
    browser.close()
