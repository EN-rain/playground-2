#!/usr/bin/env node
// verify-avatar.mjs — screenshot the clone's character at spawn for visual check
import { chromium } from "playwright-core";

const URL = process.env.SAMSY_CLONE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.OUT ?? "C:/Users/LENOVO/Desktop/Projectsss/samsy clone/docs/design-references/avatar-verify-clone.png";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[page error]", msg.text());
  });
  page.on("pageerror", (err) => console.error("[page exc]", err.message));

  console.log(`navigating to ${URL} ...`);
  await page.goto(URL, { waitUntil: "networkidle" });

  // Wait for the canvas to appear and the loading screen to disappear
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForFunction(() => {
    const loading = document.querySelector(".loading-screen");
    return !loading || loading.offsetParent === null;
  }, { timeout: 60000 });

  // Give the WebGL scene a moment to settle
  await page.waitForTimeout(3000);

  // Dismiss tutorial if present
  const skipBtn = await page.locator(".skip-tutorial").first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }

  // Click into pointer-lock so the character is visible (not hidden by tutorial)
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1000);

  // Screenshot
  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`screenshot saved: ${OUT}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
