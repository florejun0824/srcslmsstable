from playwright.sync_api import Page, expect

def test_google_slides_auth_redirect(page: Page):
    """
    This test verifies that clicking the 'Generate Google Slides' button
    initiates a redirect to the Google authentication page.
    """
    # 1. Arrange: Go to the Teacher Dashboard page.
    page.goto("http://localhost:5173/")
    print(page.content())
    page.screenshot(path="jules-scratch/verification/initial_page.png")

    # 2. Act: Find the "Generate Google Slides" button and click it.
    try:
        gen_button = page.get_by_role("button", name="Generate Google Slides")
        gen_button.click()
    except Exception as e:
        print(f"Error clicking button: {e}")
        page.screenshot(path="jules-scratch/verification/debug_screenshot.png")
        return

    # 3. Assert: Confirm the navigation to Google's auth page.
    expect(page).to_have_url(lambda url: "accounts.google.com" in url)

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/google_slides_auth_redirect.png")