from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/login")
    page.locator("input").first.fill("tany")
    page.locator('input[type="password"]').fill("tany")
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(2000)
    print("After login:", page.url)

    # Go directly to create-employee
    page.goto("http://localhost:5173/create-employee")
    page.wait_for_timeout(2000)
    print("create-employee URL:", page.url)
    print("Page title/content snippet:", page.locator("h5, h4, h3").first.inner_text() if page.locator("h5, h4, h3").count() > 0 else "(no heading)")
    inputs = page.locator("input").all()
    print(f"Input fields found: {len(inputs)}")
    for i in inputs:
        print(" -", i.get_attribute("type") or "text", "|", i.get_attribute("placeholder") or "")
    browser.close()
