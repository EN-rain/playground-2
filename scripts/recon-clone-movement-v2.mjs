import { chromium } from "playwright-core";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SAMSY_CLONE_URL || "http://localhost:3003";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/design-references/clone-recon-v2/movement");
const reportPath = path.resolve("docs/research/samsy/recon-v2/clone-movement-recon.json");
const instanceMap = JSON.parse(await readFile("src/data/samsy-world-layout.json", "utf8"));
const instances = Object.entries(instanceMap).flatMap(([name, list]) => list.map((item, index) => ({
  name,
  index,
  x: item.position?.x ?? 0,
  y: item.position?.y ?? 0,
  z: item.position?.z ?? 0,
  scale: item.scale?.x ?? 1,
  id: item.scriptData?.id ?? null,
})));

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
const page = await context.newPage();
const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

const checkpoints = [];
const actions = [];
let imageIndex = 0;

function nearest(player, limit = 12) {
  return instances
    .map((item) => ({ ...item, distance: Math.hypot(item.x - player.x, item.z - player.z) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

async function state() {
  return page.locator("canvas.samsy-webgl").evaluate((element) => {
    const data = element.dataset;
    return {
      player: { x: Number(data.playerX), y: 0, z: Number(data.playerZ) },
      cameraHeading: Number(data.cameraHeading),
      cameraElevation: Number(data.cameraElevation),
      cameraDistance: Number(data.cameraDistance),
      cameraTargetDistance: Number(data.cameraTargetDistance),
      cameraFov: Number(data.cameraFov),
      avatarScale: Number(data.avatarScale),
      speedMultiplier: Number(data.speedMultiplier),
      cityInstanceCount: Number(data.cityInstanceCount),
      worldLayout: data.worldLayout,
      bounds: {
        minX: Number(data.worldMinX),
        maxX: Number(data.worldMaxX),
        minZ: Number(data.worldMinZ),
        maxZ: Number(data.worldMaxZ),
      },
    };
  });
}

async function capture(label, meta = {}) {
  const current = await state();
  const filename = `${String(++imageIndex).padStart(3, "0")}-${label}.png`;
  await page.screenshot({ path: path.join(outputRoot, filename) });
  const entry = { label, filename, ...meta, state: current, nearestInstances: nearest(current.player) };
  checkpoints.push(entry);
  console.log(`${filename}: player=${current.player.x.toFixed(1)},${current.player.z.toFixed(1)} d=${current.cameraDistance.toFixed(2)} yaw=${current.cameraHeading.toFixed(3)} pitch=${current.cameraElevation.toFixed(3)} nearest=${entry.nearestInstances.slice(0, 3).map((item) => item.name).join(",")}`);
  return entry;
}

async function drag(dx, dy = 0, steps = 18) {
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(720 + dx, 450 + dy, { steps });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(500);
}

async function hold(codes, durationMs, label) {
  const before = await state();
  for (const code of codes) await page.keyboard.down(code);
  await page.waitForTimeout(durationMs);
  for (const code of [...codes].reverse()) await page.keyboard.up(code);
  await page.waitForTimeout(700);
  const after = await state();
  actions.push({
    type: "hold",
    label,
    codes,
    durationMs,
    before,
    after,
    distance: Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z),
  });
}

async function orbitAt(prefix) {
  const start = await state();
  for (let index = 0; index < 8; index += 1) {
    await drag(-112, 0, 14);
    await capture(`${prefix}-orbit-${String(index + 1).padStart(2, "0")}`, { orbitIndex: index + 1 });
  }
  actions.push({ type: "orbit", prefix, start, end: await state() });
}

async function zoomPair(prefix) {
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, -9000);
  await page.waitForTimeout(900);
  await capture(`${prefix}-zoom-close`);
  await page.mouse.wheel(0, 9000);
  await page.waitForTimeout(900);
  await capture(`${prefix}-zoom-far`);
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".loading-screen", { state: "detached", timeout: 120_000 });
  await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(2500);

  await capture("checkpoint-0-spawn");
  await zoomPair("checkpoint-0");
  await orbitAt("checkpoint-0");

  await hold(["KeyW"], 5000, "leg-1-forward");
  await capture("checkpoint-1-forward");
  await orbitAt("checkpoint-1");

  await drag(-220, 0, 20);
  await capture("checkpoint-1-turned-right");
  await hold(["KeyW"], 5000, "leg-2-camera-right");
  await capture("checkpoint-2-east");
  await zoomPair("checkpoint-2");
  await orbitAt("checkpoint-2");

  await drag(-220, 0, 20);
  await capture("checkpoint-2-turned-back");
  await hold(["KeyW"], 6500, "leg-3-backward-world");
  await capture("checkpoint-3-south");
  await orbitAt("checkpoint-3");

  await drag(-220, 0, 20);
  await capture("checkpoint-3-turned-west");
  await hold(["KeyW"], 6500, "leg-4-west");
  await capture("checkpoint-4-west");
  await zoomPair("checkpoint-4");
  await orbitAt("checkpoint-4");

  await drag(-220, 0, 20);
  await capture("checkpoint-4-turned-north");
  await hold(["KeyW", "KeyD"], 6500, "leg-5-diagonal-return");
  await capture("checkpoint-5-diagonal");
  await orbitAt("checkpoint-5");

  const points = checkpoints.map((entry) => entry.state.player);
  const uniqueNearest = [...new Set(checkpoints.flatMap((entry) => entry.nearestInstances.slice(0, 5).map((item) => item.name)))];
  const report = {
    target: baseUrl,
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    imageCount: checkpoints.length,
    playerCoverage: {
      minX: Math.min(...points.map((point) => point.x)),
      maxX: Math.max(...points.map((point) => point.x)),
      minZ: Math.min(...points.map((point) => point.z)),
      maxZ: Math.max(...points.map((point) => point.z)),
    },
    uniqueNearestKitItems: uniqueNearest,
    checkpoints,
    actions,
    consoleErrors,
    failedRequests,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    imageCount: report.imageCount,
    coverage: report.playerCoverage,
    uniqueNearestKitItems: report.uniqueNearestKitItems,
    consoleErrors: report.consoleErrors.length,
    failedRequests: report.failedRequests.length,
  }, null, 2));
} finally {
  await browser.close();
}
