import { chromium } from "playwright-core";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/design-references/original-recon-v2/movement");
const reportPath = path.resolve("docs/research/samsy/recon-v2/original-movement-recon.json");
const instanceMap = JSON.parse(await readFile("docs/research/samsy/recon-v2/original-instance-map.json", "utf8"));
const instances = Object.entries(instanceMap).flatMap(([name, list]) => list.map((item, index) => ({
  name, index, x: item.position?.x ?? 0, y: item.position?.y ?? 0, z: item.position?.z ?? 0,
  scale: item.scale?.x ?? 1, id: item.scriptData?.id ?? null,
})));
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

async function fulfill(route, localPath, type) {
  const size = (await stat(localPath)).size;
  const range = route.request().headers().range;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      const file = await readFile(localPath);
      const body = file.subarray(start, end + 1);
      await route.fulfill({ status: 206, contentType: type, headers: {
        "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(body.length),
      }, body });
      return;
    }
  }
  await route.fulfill({ status: 200, contentType: type, path: localPath });
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgl", "--enable-webgpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await context.newPage();
await page.route("https://smsygen02.b-cdn.net/**", async (route) => {
  const basename = path.basename(new URL(route.request().url()).pathname);
  for (const candidate of [
    { path: path.resolve("public/videos/works", basename), type: "video/webm" },
    { path: path.resolve("public/audio", basename), type: "audio/ogg" },
  ]) {
    try { await stat(candidate.path); await fulfill(route, candidate.path, candidate.type); return; } catch {}
  }
  await route.continue();
});
await page.route("https://samsy.ninja/videos/loading.mp4", (route) => fulfill(route, path.resolve("public/videos/loading.mp4"), "video/mp4"));

const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

const checkpoints = [];
const actions = [];
let imageIndex = 0;

function nearest(player, limit = 12) {
  return instances.map((item) => ({ ...item, distance: Math.hypot(item.x - player.x, item.z - player.z) }))
    .sort((a, b) => a.distance - b.distance).slice(0, limit);
}

async function state() {
  return page.evaluate(() => {
    const p = window.p?.capsule?.position;
    const camera = window.camera;
    const cp = camera?.position;
    const vec = (v) => v ? { x: v.x, y: v.y, z: v.z } : null;
    let distance = null, azimuth = null, elevation = null;
    if (p && cp) {
      const dx = cp.x - p.x, dy = cp.y - p.y, dz = cp.z - p.z;
      const horizontal = Math.hypot(dx, dz);
      distance = Math.hypot(horizontal, dy);
      azimuth = Math.atan2(dx, dz);
      elevation = Math.atan2(dy, horizontal);
    }
    return {
      player: vec(p),
      camera: vec(cp),
      cameraToPlayer: distance,
      azimuth,
      elevation,
      fov: camera?.fov ?? null,
      avatarScale: vec(window.p?.avatar?.scale),
      capsuleRotationY: window.p?.capsule?.rotation?.y ?? null,
      actualVelocity: vec(window.p?.controls?.actualVelocity),
    };
  });
}

async function capture(label, meta = {}) {
  const current = await state();
  const filename = `${String(++imageIndex).padStart(3, "0")}-${label}.png`;
  await page.screenshot({ path: path.join(outputRoot, filename) });
  const entry = { label, filename, ...meta, state: current, nearestInstances: current.player ? nearest(current.player) : [] };
  checkpoints.push(entry);
  console.log(`${filename}: player=${current.player.x.toFixed(1)},${current.player.z.toFixed(1)} d=${current.cameraToPlayer.toFixed(2)} az=${current.azimuth.toFixed(3)} el=${current.elevation.toFixed(3)} nearest=${entry.nearestInstances.slice(0,3).map(x=>x.name).join(',')}`);
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
  actions.push({ type: "hold", label, codes, durationMs, before, after, distance: before.player && after.player ? Math.hypot(after.player.x-before.player.x, after.player.z-before.player.z) : null });
}

async function orbitAt(prefix) {
  const start = await state();
  for (let i = 0; i < 8; i += 1) {
    await drag(-112, 0, 14);
    await capture(`${prefix}-orbit-${String(i + 1).padStart(2, "0")}`, { orbitIndex: i + 1 });
  }
  const end = await state();
  actions.push({ type: "orbit", prefix, start, end });
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
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(4000);

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

  const playerPoints = checkpoints.map((entry) => entry.state.player).filter(Boolean);
  const uniqueNearest = [...new Set(checkpoints.flatMap((entry) => entry.nearestInstances.slice(0, 5).map((item) => item.name)))];
  const report = {
    target: "https://samsy.ninja/",
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    imageCount: checkpoints.length,
    playerCoverage: {
      minX: Math.min(...playerPoints.map((point) => point.x)), maxX: Math.max(...playerPoints.map((point) => point.x)),
      minZ: Math.min(...playerPoints.map((point) => point.z)), maxZ: Math.max(...playerPoints.map((point) => point.z)),
    },
    uniqueNearestKitItems: uniqueNearest,
    checkpoints,
    actions,
    consoleErrors,
    failedRequests: failedRequests.filter((request) => !/google-analytics|googletagmanager/.test(request.url)),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ imageCount: report.imageCount, coverage: report.playerCoverage, uniqueNearestKitItems: report.uniqueNearestKitItems, consoleErrors: report.consoleErrors.length, failedRequests: report.failedRequests.length }, null, 2));
} finally {
  await browser.close();
}
