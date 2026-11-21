import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.SAMSY_CLONE_URL || "http://localhost:3002";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputDirectory = "docs/design-references/secondary-billboard";

await mkdir(outputDirectory, { recursive: true });

async function capture({ name, path, width, height, extraWaitMs = 3000 }) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("samsy-tutorial-completed", "true");
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector(".loading-screen.is-done", { state: "hidden", timeout: 120_000 });
  await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(extraWaitMs);
  const outputPath = `${outputDirectory}/${name}.png`;
  await page.screenshot({ path: outputPath });
  console.log(`${name}: ${width}x${height} -> ${outputPath}`);
  await context.close();
  await browser.close();
}

await capture({ name: "explore-desktop", path: "/", width: 1440, height: 900 });
