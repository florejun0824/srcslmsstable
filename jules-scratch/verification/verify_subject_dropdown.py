from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    time.sleep(30)

    # Navigate to AI Lesson Generator
    page.goto("http://localhost:5173/teacher/dashboard")
    page.click("text=AI Lesson Generator")
    page.screenshot(path="jules-scratch/verification/lesson_generator.png")

    # Navigate to AI Quiz Modal
    page.goto("http://localhost:5173/teacher/dashboard")
    page.click("text=AI Quiz Modal")
    page.screenshot(path="jules-scratch/verification/quiz_modal.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)