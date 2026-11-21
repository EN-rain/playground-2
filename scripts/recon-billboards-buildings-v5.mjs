import { chromium } from "playwright-core";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/research/samsy/billboards-buildings-v5");
const imageRoot = path.resolve("docs/design-references/billboards-buildings-v5");
const frameIntervalMs = 100;
const frameCount = 60;
const viewport = { width: 1535, height: 714 };
const deviceScaleFactor = 1.25;

await mkdir(outputRoot, { recursive: true });
await mkdir(imageRoot, { recursive: true });

async function fulfillLocalMedia(route, localPath, contentType) {
  const file = await readFile(localPath);
  const range = route.request().headers().range;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), file.length - 1) : file.length - 1;
      const body = file.subarray(start, end + 1);
      await route.fulfill({
        status: 206,
        contentType,
        headers: {
          "accept-ranges": "bytes",
          "content-range": `bytes ${start}-${end}/${file.length}`,
          "content-length": String(body.length),
        },
        body,
      });
      return;
    }
  }
  await route.fulfill({ status: 200, contentType, body: file });
}

async function captureTarget(browser, { name, url, original }) {
  const targetDir = path.join(imageRoot, name);
  await mkdir(targetDir, { recursive: true });

  const context = await browser.newContext({ viewport, deviceScaleFactor, colorScheme: "dark" });
  if (!original) {
    await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  }
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error.stack || error)));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (!failure.includes("ERR_ABORTED")) failures.push({ url: request.url(), error: failure });
  });

  if (original) {
    await page.route("https://smsygen02.b-cdn.net/**", async (route) => {
      const basename = path.basename(new URL(route.request().url()).pathname);
      const candidates = [
        { localPath: path.resolve("public/videos/works", basename), type: "video/webm" },
        { localPath: path.resolve("public/audio", basename), type: "audio/ogg" },
      ];
      for (const candidate of candidates) {
        try {
          await stat(candidate.localPath);
          await fulfillLocalMedia(route, candidate.localPath, candidate.type);
          return;
        } catch {}
      }
      await route.continue();
    });
    await page.route("https://samsy.ninja/videos/loading.mp4", async (route) => {
      await fulfillLocalMedia(route, path.resolve("public/videos/loading.mp4"), "video/mp4");
    });
  }

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 180_000 });
  await page.waitForTimeout(original ? 6_000 : 3_000);

  if (original) {
    const explore = page.getByText("EXPLORE", { exact: true }).first();
    if (await explore.count()) await explore.click({ force: true }).catch(() => undefined);
    else await page.mouse.click(700, 105);
    await page.waitForTimeout(5_000);
  }

  const canvasBox = await page.locator("canvas").first().boundingBox();
  const frames = [];
  const startedAt = performance.now();
  for (let index = 0; index < frameCount; index += 1) {
    const targetElapsed = index * frameIntervalMs;
    const wait = targetElapsed - (performance.now() - startedAt);
    if (wait > 0) await page.waitForTimeout(wait);
    const filename = `${String(index).padStart(3, "0")}-${String(targetElapsed).padStart(5, "0")}ms.png`;
    await page.screenshot({ path: path.join(targetDir, filename) });
    const state = await page.evaluate(() => ({
      videos: [...document.querySelectorAll("video")].map((video) => ({
        src: video.currentSrc || video.src,
        currentTime: video.currentTime,
        paused: video.paused,
        readyState: video.readyState,
      })),
      canvasDataset: document.querySelector("canvas") ? { ...document.querySelector("canvas").dataset } : null,
    }));
    frames.push({ index, targetElapsed, actualElapsed: performance.now() - startedAt, filename, state });
  }

  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const mainScript = resources.find((resource) => /\/assets\/js\/main-[^/]+\.js(?:\?|$)/.test(resource)) ?? null;
  if (original && mainScript) {
    const source = await page.evaluate(async (scriptUrl) => (await fetch(scriptUrl)).text(), mainScript);
    await writeFile(path.join(outputRoot, "original-main-live.txt"), source, "utf8");
  }

  const report = {
    name,
    url,
    capturedAt: new Date().toISOString(),
    viewport,
    deviceScaleFactor,
    frameIntervalMs,
    frameCount,
    canvasBox,
    frames,
    errors,
    failures,
    mainScript,
    resources: resources.filter((resource) => /\.(?:webm|mp4|jpg|jpeg|png|ktx2|glb|js)(?:\?|$)/i.test(resource)),
  };
  await writeFile(path.join(outputRoot, `${name}.json`), JSON.stringify(report, null, 2), "utf8");
  await context.close();
  return report;
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: process.env.HEADFUL !== "1",
  args: [
    "--enable-webgl",
    "--enable-webgpu",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

try {
  const original = await captureTarget(browser, { name: "original", url: "https://samsy.ninja/", original: true });
  const clone = await captureTarget(browser, { name: "clone", url: process.env.SAMSY_CLONE_URL || "http://127.0.0.1:3004/", original: false });
  const summary = {
    capturedAt: new Date().toISOString(),
    original: { frames: original.frames.length, errors: original.errors, failures: original.failures },
    clone: { frames: clone.frames.length, errors: clone.errors, failures: clone.failures },
  };
  await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
