import { chromium } from "playwright-core";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const target = process.argv[2] || "original";
const targets = {
  original: {
    url: "https://samsy.ninja/",
    readyText: "ABOUT",
    enterExplore: async (page) => {
      // The original navigation is canvas-rendered. This coordinate is the
      // measured center of EXPLORE at 1440x900.
      await page.mouse.click(580, 68);
      await page.waitForTimeout(3500);
    },
  },
  clone: {
    url: process.env.SAMSY_CLONE_URL || "http://localhost:3003/",
    readyText: "EXPLORE",
    enterExplore: async (page) => {
      const button = page.getByRole("button", { name: "EXPLORE" });
      if (await button.count()) await button.click();
      await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 120_000 });
      await page.waitForSelector(".loading-screen", { state: "detached", timeout: 120_000 });
      await page.waitForTimeout(1500);
    },
  },
};

if (!(target in targets)) {
  throw new Error(`Unknown target ${target}. Use original or clone.`);
}

const config = targets[target];
const outputRoot = path.resolve("docs/design-references/world-frames", target);
const framesDir = path.join(outputRoot, "frames");
await rm(outputRoot, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

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
if (target === "clone") {
  await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
}
const page = await context.newPage();

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
    headers: {
      "accept-ranges": "bytes",
      "content-length": String(fileSize),
      "cache-control": "public, max-age=31536000",
    },
    path: localPath,
  });
}

if (target === "original") {
  await page.route("https://smsygen02.b-cdn.net/**", async (route) => {
    const basename = path.basename(new URL(route.request().url()).pathname);
    const candidates = [
      { path: path.resolve("public/videos/works", basename), type: "video/webm" },
      { path: path.resolve("public/audio", basename), type: "audio/ogg" },
    ];
    for (const candidate of candidates) {
      try {
        await stat(candidate.path);
        await fulfillLocalMedia(route, candidate.path, candidate.type);
        return;
      } catch {
        // Try the next local asset directory.
      }
    }
    await route.continue();
  });
  await page.route("https://samsy.ninja/videos/loading.mp4", async (route) => {
    await fulfillLocalMedia(route, path.resolve("public/videos/loading.mp4"), "video/mp4");
  });
}

const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

let activePhase = "setup";
let frameIndex = 0;
const frameManifest = [];
const pendingWrites = new Set();
const inputLog = [];

function queueWrite(file, data) {
  const task = writeFile(file, data).finally(() => pendingWrites.delete(task));
  pendingWrites.add(task);
}

async function readRuntimeTelemetry(pageInstance) {
  return pageInstance.evaluate(() => {
    const canvas = document.querySelector("canvas.samsy-webgl");
    const data = canvas?.dataset ?? {};
    const numeric = (key) => {
      const value = Number(data[key]);
      return Number.isFinite(value) ? value : null;
    };
    const originalPlayer = window.p?.capsule?.position ?? window.p?.avatar?.position ?? null;
    const originalCamera = window.camera ?? null;
    const originalControls = originalCamera?.controls ?? null;
    const originalCameraDistance = originalCamera?.position && originalControls?.target
      ? originalCamera.position.distanceTo(originalControls.target)
      : null;
    return {
      player: {
        x: numeric("playerX") ?? originalPlayer?.x ?? null,
        y: numeric("playerY") ?? originalPlayer?.y ?? null,
        z: numeric("playerZ") ?? originalPlayer?.z ?? null,
      },
      camera: {
        x: numeric("cameraX") ?? originalCamera?.position?.x ?? null,
        y: numeric("cameraY") ?? originalCamera?.position?.y ?? null,
        z: numeric("cameraZ") ?? originalCamera?.position?.z ?? null,
        heading: numeric("cameraHeading") ?? originalControls?.getAzimuthalAngle?.() ?? null,
        elevation: numeric("cameraElevation") ?? (
          typeof originalControls?.getPolarAngle?.() === "number"
            ? Math.PI / 2 - originalControls.getPolarAngle()
            : null
        ),
        requestedDistance: numeric("cameraDistance") ?? originalControls?.maxDistance ?? null,
        actualDistance: numeric("cameraActualDistance") ?? originalCameraDistance,
      },
      grounded: data.isGrounded === undefined ? null : data.isGrounded === "true",
      groundHeight: numeric("groundHeight"),
      speedMultiplier: numeric("speedMultiplier"),
      effectiveMovementSpeed: numeric("effectiveMovementSpeed"),
      cameraSolver: data.cameraSolver ?? null,
      physicsProfile: data.physicsProfile ?? null,
    };
  });
}

async function hold(pageInstance, codes, durationMs, phase) {
  activePhase = phase;
  const entry = {
    phase,
    type: "hold",
    codes,
    durationMs,
    startedAt: performance.now(),
    startTelemetry: await readRuntimeTelemetry(pageInstance),
  };
  inputLog.push(entry);
  for (const code of codes) await pageInstance.keyboard.down(code);
  await pageInstance.waitForTimeout(durationMs);
  for (const code of [...codes].reverse()) await pageInstance.keyboard.up(code);
  entry.endedAt = performance.now();
  entry.endTelemetry = await readRuntimeTelemetry(pageInstance);
}

async function jumpWhileMoving(pageInstance, moveCode, durationMs, phase) {
  activePhase = phase;
  const entry = {
    phase,
    type: "jump-move",
    codes: [moveCode, "Space"],
    durationMs,
    startedAt: performance.now(),
    startTelemetry: await readRuntimeTelemetry(pageInstance),
  };
  inputLog.push(entry);
  await pageInstance.keyboard.down(moveCode);
  await pageInstance.waitForTimeout(250);
  await pageInstance.keyboard.press("Space");
  await pageInstance.waitForTimeout(durationMs - 250);
  await pageInstance.keyboard.up(moveCode);
  entry.endedAt = performance.now();
  entry.endTelemetry = await readRuntimeTelemetry(pageInstance);
}

async function cameraSweep(pageInstance, durationMs, phase) {
  activePhase = phase;
  const entry = {
    phase,
    type: "mouse-drag-sweep",
    button: "left",
    codes: ["KeyW"],
    durationMs,
    startedAt: performance.now(),
    startTelemetry: await readRuntimeTelemetry(pageInstance),
  };
  inputLog.push(entry);
  await pageInstance.keyboard.down("KeyW");
  const segments = Math.max(4, Math.round(durationMs / 900));
  for (let index = 0; index < segments; index += 1) {
    const direction = index % 2 === 0 ? -1 : 1;
    const destinationX = 720 + direction * 280;
    const destinationY = 450 + Math.sin(index * Math.PI / 2) * 120;
    await pageInstance.mouse.move(720, 450);
    await pageInstance.mouse.down({ button: "left" });
    await pageInstance.mouse.move(destinationX, destinationY, { steps: 24 });
    await pageInstance.mouse.up({ button: "left" });
    await pageInstance.waitForTimeout(Math.max(100, durationMs / segments - 420));
  }
  await pageInstance.keyboard.up("KeyW");
  entry.endedAt = performance.now();
  entry.endTelemetry = await readRuntimeTelemetry(pageInstance);
}

try {
  await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
  if (target === "original") {
    await page.waitForFunction(
      () => document.body.innerText.includes("EXPLORE") || document.body.innerText.includes("ABOUT"),
      undefined,
      { timeout: 180_000 },
    );
  } else {
    await page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      config.readyText,
      { timeout: 120_000 },
    );
  }
  await page.waitForTimeout(target === "original" ? 3500 : 1500);
  await config.enterExplore(page);

  const client = await context.newCDPSession(page);
  client.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    frameIndex += 1;
    const filename = `frame-${String(frameIndex).padStart(6, "0")}.jpg`;
    frameManifest.push({
      index: frameIndex,
      filename,
      phase: activePhase,
      timestamp: metadata.timestamp ?? null,
      pageScaleFactor: metadata.pageScaleFactor ?? null,
      deviceWidth: metadata.deviceWidth ?? null,
      deviceHeight: metadata.deviceHeight ?? null,
    });
    queueWrite(path.join(framesDir, filename), Buffer.from(data, "base64"));
    await client.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
  });

  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 72,
    maxWidth: 1280,
    maxHeight: 800,
    everyNthFrame: 1,
  });

  activePhase = "idle";
  await page.waitForTimeout(1200);
  await hold(page, ["KeyW"], 6000, "forward");
  await hold(page, ["KeyW", "KeyD"], 4500, "forward-right");
  await hold(page, ["KeyD"], 3500, "right");
  await hold(page, ["KeyS", "KeyD"], 4500, "backward-right");
  await hold(page, ["KeyS"], 6000, "backward");
  await hold(page, ["KeyS", "KeyA"], 4500, "backward-left");
  await hold(page, ["KeyA"], 3500, "left");
  await hold(page, ["KeyW", "KeyA"], 4500, "forward-left");
  await jumpWhileMoving(page, "KeyW", 3000, "jump-forward");
  await cameraSweep(page, 5000, "camera-sweep-forward");
  activePhase = "settle";
  await page.waitForTimeout(1500);

  await client.send("Page.stopScreencast");
  await Promise.all([...pendingWrites]);

  const timestamps = frameManifest.map((frame) => frame.timestamp).filter((value) => typeof value === "number");
  const intervals = timestamps.slice(1).map((value, index) => (value - timestamps[index]) * 1000);
  const phaseCounts = Object.fromEntries(
    [...new Set(frameManifest.map((frame) => frame.phase))].map((phase) => [
      phase,
      frameManifest.filter((frame) => frame.phase === phase).length,
    ]),
  );
  const summary = {
    target,
    url: config.url,
    capturedAt: new Date().toISOString(),
    frameCaptureMethod: "Chrome DevTools Protocol Page.startScreencast",
    everyNthFrame: 1,
    totalFrames: frameManifest.length,
    durationSeconds: timestamps.length > 1 ? Number((timestamps.at(-1) - timestamps[0]).toFixed(3)) : null,
    averageFrameIntervalMs: intervals.length
      ? Number((intervals.reduce((sum, value) => sum + value, 0) / intervals.length).toFixed(3))
      : null,
    medianFrameIntervalMs: intervals.length
      ? Number([...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)].toFixed(3))
      : null,
    phaseCounts,
    consoleErrors,
    failedRequests,
    inputLog,
  };

  await writeFile(path.join(outputRoot, "frames.json"), JSON.stringify(frameManifest, null, 2));
  await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
