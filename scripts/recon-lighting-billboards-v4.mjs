import { chromium } from "playwright-core";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/research/samsy/lighting-billboards-v4");
const imageRoot = path.resolve("docs/design-references/lighting-billboards-v4");
await mkdir(outputRoot, { recursive: true });
await mkdir(imageRoot, { recursive: true });

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

const report = { capturedAt: new Date().toISOString(), viewport: { width: 1788, height: 844 }, targets: {} };

async function captureTarget(name, url, original) {
  const context = await browser.newContext({
    viewport: { width: 1788, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error.stack || error)));
  page.on("requestfailed", (request) => failures.push({ url: request.url(), error: request.failure()?.errorText ?? null }));

  if (original) {
    await page.route("https://smsygen02.b-cdn.net/**", async (route) => {
      const basename = path.basename(new URL(route.request().url()).pathname);
      for (const candidate of [
        { path: path.resolve("public/videos/works", basename), type: "video/webm" },
        { path: path.resolve("public/audio", basename), type: "audio/ogg" },
      ]) {
        try {
          await stat(candidate.path);
          await fulfillLocalMedia(route, candidate.path, candidate.type);
          return;
        } catch {}
      }
      await route.continue();
    });
    await page.route("https://samsy.ninja/videos/loading.mp4", async (route) => {
      await fulfillLocalMedia(route, path.resolve("public/videos/loading.mp4"), "video/mp4");
    });
  }

  await page.goto(url, { waitUntil: "commit", timeout: 60_000 });
  await page.waitForSelector("canvas", { state: "visible", timeout: 180_000 });
  await page.waitForTimeout(original ? 7000 : 5000);

  if (original) {
    const explore = page.getByText("EXPLORE", { exact: true }).first();
    if (await explore.count()) {
      await explore.click({ force: true }).catch(() => page.mouse.click(700, 105));
    } else {
      await page.mouse.click(700, 105);
    }
    await page.waitForTimeout(6000);
  }

  const targetDir = path.join(imageRoot, name);
  await mkdir(targetDir, { recursive: true });
  const frames = [];
  const sampleDelays = [0, 250, 250, 500, 1000, 2000, 2000];
  let elapsedMs = 0;
  for (let index = 0; index < sampleDelays.length; index += 1) {
    const delay = sampleDelays[index];
    if (delay) await page.waitForTimeout(delay);
    elapsedMs += delay;
    const filename = `${String(index).padStart(2, "0")}-${String(elapsedMs).padStart(4, "0")}ms.png`;
    await page.screenshot({ path: path.join(targetDir, filename) });
    const state = await page.evaluate(() => ({
      videos: [...document.querySelectorAll("video")].map((video) => ({
        src: video.currentSrc || video.src,
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        readyState: video.readyState,
      })),
      canvasDataset: document.querySelector("canvas") ? { ...document.querySelector("canvas").dataset } : null,
      canvasCount: document.querySelectorAll("canvas").length,
      bodyText: document.body.innerText.slice(0, 2000),
    }));
    frames.push({ elapsedMs, filename, state });
  }

  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const mainScript = resources.find((resource) => /\/assets\/js\/main-[^/]+\.js(?:\?|$)/.test(resource)) ?? null;
  if (original && mainScript) {
    const source = await page.evaluate(async (urlToFetch) => (await fetch(urlToFetch)).text(), mainScript);
    await writeFile(path.join(outputRoot, "original-main-live.js"), source, "utf8");
  }

  report.targets[name] = {
    url,
    frames,
    errors,
    failures,
    resources: resources.filter((resource) => /\.(?:webm|mp4|jpg|jpeg|png|ktx2|glb|js)(?:\?|$)/i.test(resource)),
    mainScript,
  };

  await context.close();
}

try {
  await captureTarget("original", "https://samsy.ninja/", true);
  await captureTarget("clone", "http://127.0.0.1:3003/", false);
  await writeFile(path.join(outputRoot, "capture-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    originalFrames: report.targets.original.frames.length,
    cloneFrames: report.targets.clone.frames.length,
    originalErrors: report.targets.original.errors.length,
    cloneErrors: report.targets.clone.errors.length,
  }, null, 2));
} finally {
  await browser.close();
}
