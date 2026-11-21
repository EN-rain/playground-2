import { chromium } from "playwright-core";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputDir = "docs/research/samsy/recon-v2";
await mkdir(outputDir, { recursive: true });

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
        },
        body,
      });
      return;
    }
  }
  await route.fulfill({ status: 200, contentType, path: localPath });
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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
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

try {
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(4000);

  const snapshot = await page.evaluate(() => {
    const vector = (value) => value && typeof value.x === "number"
      ? { x: value.x, y: value.y, z: value.z ?? null }
      : null;
    const objectSummary = (value) => {
      if (!value || typeof value !== "object") return null;
      return {
        constructor: value.constructor?.name ?? null,
        keys: Object.keys(value).slice(0, 160),
        position: vector(value.position),
        rotation: value.rotation && typeof value.rotation.x === "number"
          ? { x: value.rotation.x, y: value.rotation.y, z: value.rotation.z, order: value.rotation.order }
          : null,
        scale: vector(value.scale),
        target: vector(value.target),
        minDistance: typeof value.minDistance === "number" ? value.minDistance : null,
        maxDistance: typeof value.maxDistance === "number" ? value.maxDistance : null,
        enableZoom: value.enableZoom ?? null,
        enableRotate: value.enableRotate ?? null,
        isCamera: value.isCamera ?? false,
        isScene: value.isScene ?? false,
      };
    };

    const player = window.p;
    const candidates = [];
    for (const key of Object.getOwnPropertyNames(window)) {
      let value;
      try { value = window[key]; } catch { continue; }
      if (!value || typeof value !== "object") continue;
      if (value.isCamera || value.isScene || value.isWebGLRenderer || value.camera?.isCamera || value.scene?.isScene || value.current?.isCamera) {
        candidates.push({ key, summary: objectSummary(value), camera: objectSummary(value.camera), scene: objectSummary(value.scene), current: objectSummary(value.current) });
      }
    }

    return {
      url: location.href,
      text: document.body.innerText.slice(0, 2000),
      player: objectSummary(player),
      playerFields: player ? Object.fromEntries(Object.keys(player).slice(0, 160).map((key) => {
        let value;
        try { value = player[key]; } catch { return [key, "<unreadable>"]; }
        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean" || value == null) return [key, value];
        return [key, objectSummary(value)];
      })) : null,
      capsule: objectSummary(player?.capsule),
      avatar: objectSummary(player?.avatar),
      controls: objectSummary(player?.controls),
      controlFields: player?.controls ? Object.fromEntries(Object.keys(player.controls).slice(0, 160).map((key) => {
        let value;
        try { value = player.controls[key]; } catch { return [key, "<unreadable>"]; }
        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean" || value == null) return [key, value];
        return [key, objectSummary(value)];
      })) : null,
      candidates,
    };
  });

  await writeFile(`${outputDir}/original-runtime.json`, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify({
    player: snapshot.player,
    capsule: snapshot.capsule,
    avatar: snapshot.avatar,
    controls: snapshot.controls,
    candidateCount: snapshot.candidates.length,
    candidates: snapshot.candidates.slice(0, 20),
  }, null, 2));
} finally {
  await browser.close();
}
