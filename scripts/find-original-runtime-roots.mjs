import { chromium } from "playwright-core";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

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
      await route.fulfill({ status: 206, contentType, headers: {
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${fileSize}`,
        "content-length": String(body.length),
      }, body });
      return;
    }
  }
  await route.fulfill({ status: 200, contentType, path: localPath });
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgpu", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
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
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(4000);

  const result = await page.evaluate(() => {
    const found = [];
    const visited = new WeakSet();
    const queue = [];
    const ignoredKeys = new Set(["window", "self", "top", "parent", "frames", "globalThis", "document", "location", "navigator", "history", "localStorage", "sessionStorage"]);
    for (const key of Object.getOwnPropertyNames(window)) {
      if (ignoredKeys.has(key)) continue;
      let value;
      try { value = window[key]; } catch { continue; }
      if (value && (typeof value === "object" || typeof value === "function")) queue.push({ value, path: `window.${key}`, depth: 0 });
    }
    const summary = (value) => ({
      constructor: value?.constructor?.name ?? null,
      type: value?.type ?? null,
      name: value?.name ?? null,
      isScene: value?.isScene ?? false,
      isRenderer: value?.isRenderer ?? false,
      isCamera: value?.isCamera ?? false,
      isObject3D: value?.isObject3D ?? false,
      childCount: Array.isArray(value?.children) ? value.children.length : null,
      keys: (() => { try { return Object.keys(value).slice(0, 80); } catch { return []; } })(),
    });
    let inspected = 0;
    while (queue.length && inspected < 50000) {
      const { value, path, depth } = queue.shift();
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (visited.has(value)) continue;
      visited.add(value);
      inspected += 1;
      const isInteresting = value.isScene || value.isRenderer || value.isCamera || value.isWebGLRenderer ||
        value.postProcessing || value.scene1 || value.collider || value.controls?.target ||
        (Array.isArray(value.children) && value.children.length > 20);
      if (isInteresting) found.push({ path, summary: summary(value) });
      if (depth >= 4) continue;
      let keys;
      try { keys = Object.keys(value).slice(0, 300); } catch { continue; }
      for (const key of keys) {
        if (key === "parent" || key === "__proto__" || key === "domElement" || key === "ownerDocument") continue;
        let child;
        try { child = value[key]; } catch { continue; }
        if (!child || (typeof child !== "object" && typeof child !== "function")) continue;
        queue.push({ value: child, path: `${path}.${key}`, depth: depth + 1 });
      }
    }
    return { inspected, found };
  });
  await writeFile("docs/research/samsy/deep-recon-live/runtime-roots.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ inspected: result.inspected, found: result.found.slice(0, 120) }, null, 2));
} finally {
  await browser.close();
}
