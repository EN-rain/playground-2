import { chromium } from "playwright-core";
import fs from "node:fs";

const URL = process.env.SAMSY_CLONE_URL ?? "http://127.0.0.1:3000";
const OUTDIR = "C:/Users/LENOVO/AppData/Local/Temp/avatar-diag";
fs.mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(URL, { waitUntil: "domcontentloaded" });

// Wait for avatar presentation attribute to confirm VRM loaded
try {
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.avatarPresentation === "source-vrm-red-owo7-face",
    { timeout: 30000 }
  );
  console.log("VRM avatar loaded!");
} catch {
  console.log("Timeout waiting for VRM - taking screenshot anyway");
}

// Extra wait for rendering to settle
await page.waitForTimeout(2000);

await page.screenshot({ path: `${OUTDIR}/vrm-loaded-full.png` });
await page.screenshot({
  path: `${OUTDIR}/vrm-loaded-close.png`,
  clip: { x: 450, y: 120, width: 380, height: 480 },
});

console.log("Screenshots captured to", OUTDIR);
await browser.close();
