import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const baseUrl = process.env.SAMSY_CLONE_URL || "http://localhost:3000";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outDir = "docs/design-references/qa";
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: chromePath, headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector(".loading-screen", { state: "detached", timeout: 90_000 }).catch(() => {});
  await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(3500);
  const state = await page.locator("canvas.samsy-webgl").evaluate((el) => ({ ...el.dataset }));
  console.log("customDesign", state.customDesignBillboard);
  console.log("customBillboard", state.customBillboard);
  // look toward boards
  const canvas = page.locator("canvas.samsy-webgl");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(200);
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(600);
    await page.keyboard.up("KeyD");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(400);
    await page.keyboard.up("KeyW");
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/custom-design-v2.png` });
  console.log("saved v1");
} finally {
  await browser.close();
}
