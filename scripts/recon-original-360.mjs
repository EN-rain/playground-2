import { chromium } from "playwright-core";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/design-references/original-recon-v2");
const reportPath = path.resolve("docs/research/samsy/recon-v2/original-360-recon.json");
const instanceMap = JSON.parse(await readFile("docs/research/samsy/recon-v2/original-instance-map.json", "utf8"));
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const instancePoints = Object.entries(instanceMap).flatMap(([name, instances]) =>
  instances.map((instance, index) => ({
    name,
    index,
    x: instance.position?.x ?? 0,
    y: instance.position?.y ?? 0,
    z: instance.position?.z ?? 0,
    scale: instance.scale?.x ?? 1,
    id: instance.scriptData?.id ?? null,
  })),
);

async function fulfillLocalMedia(route, localPath, contentType) {
  const fileSize = (await stat(localPath)).size;
  const range = route.request().headers().range;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;
      const file = await readFile(localPath);
      const body = file.subarray(start, end + 1);
      await route.fulfill({
        status: 206,
        contentType,
        headers: {
          "accept-ranges": "bytes",
          "content-range": `bytes ${start}-${end}/${fileSize}`,
          "content-length": String(body.length),
          "cache-control": "public, max-age=31536000",
        },
        body,
      });
      return;
    }
  }
  await route.fulfill({
    status: 200,
    contentType,
    headers: { "accept-ranges": "bytes", "content-length": String(fileSize) },
    path: localPath,
  });
}

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

await page.route("https://smsygen02.b-cdn.net/**", async (route) => {
  const basename = path.basename(new URL(route.request().url()).pathname);
  for (const candidate of [
    { path: path.resolve("public/videos/works", basename), type: "video/webm" },
    { path: path.resolve("public/audio", basename), type: "audio/ogg" },
  ]) {
    try { await stat(candidate.path); await fulfillLocalMedia(route, candidate.path, candidate.type); return; } catch {}
  }
  await route.continue();
});
await page.route("https://samsy.ninja/videos/loading.mp4", async (route) => {
  await fulfillLocalMedia(route, path.resolve("public/videos/loading.mp4"), "video/mp4");
});

const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

const checkpoints = [];
const actionLog = [];
let imageIndex = 0;

function nearestInstances(position, limit = 10) {
  return instancePoints
    .map((item) => ({ ...item, distance: Math.hypot(item.x - position.x, item.z - position.z) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

async function runtimeState() {
  return page.evaluate(() => {
    const player = window.p;
    const camera = window.camera;
    const controls = camera?.controls;
    const position = (value) => value && typeof value.x === "number"
      ? { x: value.x, y: value.y, z: value.z }
      : null;
    const playerPosition = position(player?.capsule?.position ?? player?.avatar?.position);
    const cameraPosition = position(camera?.position);
    const target = position(controls?.target);
    const base = target ?? playerPosition;
    let distance = null;
    let azimuth = null;
    let elevation = null;
    if (cameraPosition && base) {
      const dx = cameraPosition.x - base.x;
      const dy = cameraPosition.y - base.y;
      const dz = cameraPosition.z - base.z;
      const horizontal = Math.hypot(dx, dz);
      distance = Math.hypot(horizontal, dy);
      azimuth = Math.atan2(dx, dz);
      elevation = Math.atan2(dy, horizontal);
    }
    return {
      player: playerPosition,
      capsuleRotationY: player?.capsule?.rotation?.y ?? null,
      avatar: {
        position: position(player?.avatar?.position),
        scale: position(player?.avatar?.scale),
        rotationY: player?.avatar?.rotationY ?? null,
      },
      playerRadius: player?.radius ?? null,
      camera: {
        position: cameraPosition,
        target,
        distance,
        azimuth,
        elevation,
        fov: camera?.fov ?? null,
        zoom: camera?.zoom ?? null,
        near: camera?.near ?? null,
        far: camera?.far ?? null,
        maxDistanceField: camera?.maxDistance ?? null,
        minFov: camera?.minFov ?? null,
        maxFov: camera?.maxFov ?? null,
        landscapeMinFov: camera?.landscapeMinFov ?? null,
        landscapeMaxFov: camera?.landscapeMaxFov ?? null,
        mouse: position(camera?._mouse),
        mouseSmooth: position(camera?._mouseSmooth),
      },
      orbit: controls ? {
        constructor: controls.constructor?.name ?? null,
        target: position(controls.target),
        minDistance: controls.minDistance ?? null,
        maxDistance: controls.maxDistance ?? null,
        minPolarAngle: controls.minPolarAngle ?? null,
        maxPolarAngle: controls.maxPolarAngle ?? null,
        minAzimuthAngle: controls.minAzimuthAngle ?? null,
        maxAzimuthAngle: controls.maxAzimuthAngle ?? null,
        enableZoom: controls.enableZoom ?? null,
        enableRotate: controls.enableRotate ?? null,
        enablePan: controls.enablePan ?? null,
        enableDamping: controls.enableDamping ?? null,
        dampingFactor: controls.dampingFactor ?? null,
        rotateSpeed: controls.rotateSpeed ?? null,
        zoomSpeed: controls.zoomSpeed ?? null,
        mouseButtons: controls.mouseButtons ?? null,
        touches: controls.touches ?? null,
      } : null,
      movement: player?.controls ? {
        idealCameraDistance: player.controls.idealCameraDistance ?? null,
        gravity: player.controls.gravity ?? null,
        currentSpeedMultiplier: player.controls.currentSpeedMultiplier ?? null,
        actualVelocity: position(player.controls.actualVelocity),
        playerVelocity: position(player.controls.playerVelocity),
        inputDirection: position(player.controls.inputDirection),
        isGrounded: player.controls.isGrounded ?? null,
        isMoving: player.controls.isMoving ?? null,
      } : null,
    };
  });
}

async function capture(label, metadata = {}) {
  const state = await runtimeState();
  const safe = label.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  const filename = `${String(++imageIndex).padStart(3, "0")}-${safe}.png`;
  await page.screenshot({ path: path.join(outputRoot, filename) });
  const checkpoint = {
    label,
    filename,
    ...metadata,
    state,
    nearestInstances: state.player ? nearestInstances(state.player) : [],
  };
  checkpoints.push(checkpoint);
  console.log(`${filename}: player=${state.player ? `${state.player.x.toFixed(1)},${state.player.z.toFixed(1)}` : "n/a"} cameraDistance=${state.camera.distance?.toFixed(2)} azimuth=${state.camera.azimuth?.toFixed(3)} elevation=${state.camera.elevation?.toFixed(3)}`);
  return checkpoint;
}

async function drag(dx, dy, button = "left", steps = 18) {
  const start = { x: 720, y: 450 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button });
  await page.mouse.move(start.x + dx, start.y + dy, { steps });
  await page.mouse.up({ button });
  await page.waitForTimeout(650);
}

async function hold(codes, durationMs, label) {
  const before = await runtimeState();
  for (const code of codes) await page.keyboard.down(code);
  await page.waitForTimeout(durationMs);
  for (const code of [...codes].reverse()) await page.keyboard.up(code);
  await page.waitForTimeout(500);
  const after = await runtimeState();
  actionLog.push({ type: "hold", label, codes, durationMs, before, after });
  return { before, after };
}

async function orbitSweep(prefix, steps = 8, dragPixels = -160) {
  for (let index = 0; index < steps; index += 1) {
    await drag(dragPixels, 0, "left");
    await capture(`${prefix}-orbit-${String(index + 1).padStart(2, "0")}`, { orbitIndex: index + 1 });
  }
}

try {
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(4500);

  const initial = await capture("spawn-initial");

  // Pointer-only camera response.
  for (const [label, x, y] of [
    ["pointer-top-left", 80, 80],
    ["pointer-top-right", 1360, 80],
    ["pointer-bottom-right", 1360, 820],
    ["pointer-bottom-left", 80, 820],
    ["pointer-center", 720, 450],
  ]) {
    await page.mouse.move(x, y, { steps: 20 });
    await page.waitForTimeout(700);
    await capture(label, { pointer: { x, y } });
  }

  // Verify real drag controls with both buttons.
  const beforeLeft = await runtimeState();
  await drag(-220, 0, "left");
  const afterLeft = await capture("left-drag-horizontal");
  actionLog.push({ type: "drag", button: "left", dx: -220, dy: 0, before: beforeLeft, after: afterLeft.state });
  const beforeRight = await runtimeState();
  await drag(220, 0, "right");
  const afterRight = await capture("right-drag-horizontal");
  actionLog.push({ type: "drag", button: "right", dx: 220, dy: 0, before: beforeRight, after: afterRight.state });

  // Original wheel zoom range.
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, -1800);
  await page.waitForTimeout(1200);
  await capture("wheel-negative");
  await page.mouse.wheel(0, 3600);
  await page.waitForTimeout(1200);
  await capture("wheel-positive");
  await page.mouse.wheel(0, -1800);
  await page.waitForTimeout(1000);

  // Full horizontal orbit and pitch extremes at spawn.
  await orbitSweep("spawn", 12, -150);
  await drag(0, -260, "left");
  await capture("spawn-high-pitch");
  await orbitSweep("spawn-high", 4, -280);
  await drag(0, 520, "left");
  await capture("spawn-low-pitch");
  await orbitSweep("spawn-low", 4, -280);
  await drag(0, -260, "left");

  // Measure movement, then explore long legs. Each reached point gets an 8-angle orbit.
  await hold(["KeyW"], 2000, "movement-calibration-forward");
  await capture("checkpoint-1-after-forward-calibration");
  await orbitSweep("checkpoint-1", 8, -190);

  await hold(["KeyW"], 9000, "leg-1-forward");
  await capture("checkpoint-2-after-long-forward");
  await orbitSweep("checkpoint-2", 8, -190);

  await drag(-360, 0, "left", 24);
  await capture("checkpoint-2-after-mouse-turn");
  await hold(["KeyW"], 9000, "leg-2-after-mouse-turn");
  await capture("checkpoint-3-after-turned-forward");
  await orbitSweep("checkpoint-3", 8, -190);

  await drag(-360, 0, "left", 24);
  await capture("checkpoint-3-after-second-mouse-turn");
  await hold(["KeyW"], 9000, "leg-3-after-second-turn");
  await capture("checkpoint-4-after-second-turned-forward");
  await orbitSweep("checkpoint-4", 8, -190);

  await hold(["KeyW", "KeyD"], 8000, "leg-4-diagonal");
  await capture("checkpoint-5-after-diagonal");
  await orbitSweep("checkpoint-5", 8, -190);

  const finalState = await runtimeState();
  const playerPositions = checkpoints.map((checkpoint) => checkpoint.state.player).filter(Boolean);
  const report = {
    target: "https://samsy.ninja/",
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    imageCount: checkpoints.length,
    initialState: initial.state,
    finalState,
    playerCoverage: playerPositions.length ? {
      minX: Math.min(...playerPositions.map((point) => point.x)),
      maxX: Math.max(...playerPositions.map((point) => point.x)),
      minZ: Math.min(...playerPositions.map((point) => point.z)),
      maxZ: Math.max(...playerPositions.map((point) => point.z)),
    } : null,
    checkpoints,
    actionLog,
    consoleErrors,
    failedRequests: failedRequests.filter((request) => !/google-analytics|googletagmanager/.test(request.url)),
    notes: [
      "Pointer-only motion and true mouse-button drags were captured separately.",
      "Every movement checkpoint includes an eight-angle mouse-drag orbit and nearest extracted kit instances.",
      "The source-derived instance map is stored in docs/research/samsy/recon-v2/original-instance-map.json.",
    ],
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    imageCount: report.imageCount,
    initial: report.initialState,
    final: report.finalState,
    playerCoverage: report.playerCoverage,
    consoleErrors: report.consoleErrors.length,
    failedRequests: report.failedRequests.length,
  }, null, 2));
} finally {
  await browser.close();
}
