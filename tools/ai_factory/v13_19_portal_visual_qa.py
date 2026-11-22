"""Browser screenshot/overflow QA for local V13.19 administrator and staff portals.

Uses only disposable local-demo identities displayed by the development login
screens. Do not run against hosted staging/production or capture real login keys.
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "qa" / "v13_19"
BASE = "http://127.0.0.1:5173"
VIEWPORTS = (320, 393, 768, 1024, 1440)


def audit(page, label: str, width: int) -> dict:
    page.wait_for_timeout(250)
    info = page.evaluate("""() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.querySelector('h1')?.textContent?.trim() || '',
      errors: Array.from(document.querySelectorAll('[role=alert]')).map(el => el.textContent?.trim() || '')
    })""")
    info["name"] = label
    info["overflow"] = max(0, info["scrollWidth"] - info["viewport"])
    page.screenshot(path=str(OUTPUT / f"{label}_{width}.png"), full_page=False, animations="disabled")
    if info["overflow"] > 2:
        raise AssertionError(f"Unexpected horizontal overflow: {info}")
    if not info["title"]:
        raise AssertionError(f"Expected a page heading: {info}")
    return info


def run() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as p:
        # Prefer an explicitly selected system browser, then a system Chromium,
        # then Playwright's managed Chromium (works on Windows Antigravity hosts).
        executable = (
            os.environ.get("AWAAZ_QA_CHROMIUM_PATH")
            or shutil.which("chromium")
            or shutil.which("google-chrome")
        )
        launch_options = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            launch_options["executable_path"] = executable
        browser = p.chromium.launch(**launch_options)
        try:
            staff = browser.new_context(viewport={"width": 1440, "height": 960}, reduced_motion="reduce")
            page = staff.new_page()
            page.goto(f"{BASE}/department/login?dept=kmc", wait_until="networkidle")
            page.get_by_text("Show temporary local access key").click()
            key = page.locator("details code").first.inner_text()
            page.locator("#roads-username").fill("roads-01")
            page.locator("#roads-access-key").fill(key)
            page.get_by_role("button", name="Sign In", exact=True).click()
            page.wait_for_url("**/department", timeout=15000)

            for view in ("dispatch", "team", "field_archive"):
                page.goto(f"{BASE}/department?view={view}", wait_until="networkidle")
                for width in VIEWPORTS:
                    page.set_viewport_size({"width": width, "height": 900})
                    results.append(audit(page, f"department_{view}_light", width))

            page.set_viewport_size({"width": 1440, "height": 900})
            page.get_by_role("button", name="Account menu").click()
            page.get_by_role("button", name="Current theme is light. Click to switch theme.").click()
            for width in VIEWPORTS:
                page.set_viewport_size({"width": width, "height": 900})
                results.append(audit(page, "department_field_archive_dark", width))
            staff.close()

            admin = browser.new_context(viewport={"width": 1440, "height": 960}, reduced_motion="reduce")
            admin_page = admin.new_page()
            admin_page.goto(f"{BASE}/admin/login", wait_until="networkidle")
            admin_page.get_by_text("Temporary local demo access").click()
            admin_key = admin_page.locator("details code").first.inner_text()
            admin_page.locator("#admin-email").fill("admin@example.org")
            admin_page.locator("#admin-password").fill(admin_key)
            admin_page.get_by_role("button", name="Sign in", exact=True).click()
            admin_page.wait_for_url("**/admin/requests", timeout=15000)
            for path, name in (("access", "admin_access"), ("requests", "admin_requests")):
                admin_page.goto(f"{BASE}/admin/{path}", wait_until="networkidle")
                for width in VIEWPORTS:
                    admin_page.set_viewport_size({"width": width, "height": 900})
                    results.append(audit(admin_page, name, width))
            admin.close()
        finally:
            browser.close()
    (OUTPUT / "qa_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"PASS {len(results)} screenshots; max horizontal overflow: {max(r['overflow'] for r in results)}px")
    for entry in results:
        print(f"  {entry['name']} {entry['viewport']}px: {entry['title']}")


if __name__ == "__main__":
    run()
