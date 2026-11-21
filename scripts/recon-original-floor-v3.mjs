import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outDir = path.resolve("docs/design-references/original-floor-v3");
const reportPath = path.resolve("docs/research/samsy/original-floor-v3.json");
await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--enable-webgl",
    "--enable-webgpu",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));

async function cameraState() {
  return page.evaluate(() => {
    const camera = window.camera;
    const player = window.p;
    const controls = camera?.controls;
    const pos = (v) => v && typeof v.x === "number" ? { x: v.x, y: v.y, z: v.z } : null;
    return {
      camera: pos(camera?.position),
      target: pos(controls?.target),
      player: pos(player?.capsule?.position ?? player?.avatar?.position),
      fov: camera?.fov ?? null,
      minPolarAngle: controls?.minPolarAngle ?? null,
      maxPolarAngle: controls?.maxPolarAngle ?? null,
      rotateSpeed: controls?.rotateSpeed ?? null,
      dampingFactor: controls?.dampingFactor ?? null,
      mouseButtons: controls?.mouseButtons ?? null,
    };
  });
}

async function capture(name) {
  const state = await cameraState();
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  return { name, file: path.relative(process.cwd(), file), state };
}

async function drag(dx, dy, steps = 20) {
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(720 + dx, 450 + dy, { steps });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(900);
}

const captures = [];
try {
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(5000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(5000);

  captures.push(await capture("01-spawn-default"));
  await drag(0, 150);
  captures.push(await capture("02-pitch-down-medium"));
  await drag(0, 120);
  captures.push(await capture("03-pitch-down-steep"));
  await drag(-220, 0);
  captures.push(await capture("04-pitch-down-yaw-left"));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1600);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(1000);
  captures.push(await capture("05-forward-floor"));

  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const mainScript = resources.find((url) => /\/assets\/js\/main-[^/]+\.js(?:\?|$)/.test(url)) ?? null;
  let bundleContext = null;
  if (mainScript) {
    const source = await page.evaluate(async (url) => await (await fetch(url)).text(), mainScript);
    const needle = "bump-floor_fxrdig.jpg";
    const index = source.indexOf(needle);
    bundleContext = {
      mainScript,
      index,
      context: index >= 0 ? source.slice(Math.max(0, index - 2500), index + 4500) : null,
    };
    await writeFile(path.join(outDir, "bundle-floor-context.txt"), bundleContext.context ?? "not found", "utf8");
  }

  await writeFile(reportPath, JSON.stringify({ captures, bundleContext, consoleErrors }, null, 2), "utf8");
  console.log(JSON.stringify({ captures, mainScript, bundleIndex: bundleContext?.index, consoleErrors }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
