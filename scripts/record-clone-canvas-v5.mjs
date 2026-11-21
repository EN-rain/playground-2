import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("docs/design-references/billboards-buildings-v5/clone-canvas-video");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
try {
  const context = await browser.newContext({ viewport: { width: 1535, height: 714 }, deviceScaleFactor: 1.25 });
  await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const page = await context.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(process.env.SAMSY_CLONE_URL || "http://127.0.0.1:3004/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas.samsy-webgl");
    return canvas instanceof HTMLCanvasElement && canvas.width >= 1000 && canvas.height >= 500;
  }, null, { timeout: 120_000 });
  await page.waitForTimeout(4_000);
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas.samsy-webgl");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas not found");
    const stream = canvas.captureStream(30);
    const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = mimeCandidates.find(candidate => MediaRecorder.isTypeSupported(candidate)) ?? "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(recorder.error ?? new Error("MediaRecorder failed"));
    });
    recorder.start(100);
    await new Promise(resolve => setTimeout(resolve, 5_000));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    const buffer = await blob.arrayBuffer();
    return {
      bytes: Array.from(new Uint8Array(buffer)),
      mimeType: recorder.mimeType,
      canvas: { width: canvas.width, height: canvas.height },
      dataset: { ...canvas.dataset },
    };
  });
  const outputPath = path.join(outputDir, "clone-canvas-5s.webm");
  await writeFile(outputPath, Buffer.from(result.bytes));
  await writeFile(path.join(outputDir, "recording.json"), JSON.stringify({
    capturedAt: new Date().toISOString(), mimeType: result.mimeType,
    byteLength: result.bytes.length, canvas: result.canvas, dataset: result.dataset, errors,
  }, null, 2));
  console.log(JSON.stringify({ outputPath, byteLength: result.bytes.length, canvas: result.canvas, errors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
