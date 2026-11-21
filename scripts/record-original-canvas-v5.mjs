import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputDir = path.resolve("docs/design-references/billboards-buildings-v5/original-canvas-video");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--enable-webgpu",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

try {
  const context = await browser.newContext({ viewport: { width: 1535, height: 714 }, deviceScaleFactor: 1.25 });
  await context.addInitScript(() => {
    localStorage.setItem("smsy_quests", JSON.stringify({ TUTORIAL: true }));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error.stack || error)));
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    return canvases.some((canvas) => canvas.width >= 1000 && canvas.height >= 500) &&
      document.body.innerText.includes("EXPLORE");
  }, null, { timeout: 180_000 });
  await page.waitForTimeout(4_000);

  const result = await page.evaluate(async () => {
    const canvas = [...document.querySelectorAll("canvas")]
      .filter((candidate) => candidate instanceof HTMLCanvasElement)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas not found");
    const stream = canvas.captureStream(30);
    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(recorder.error ?? new Error("MediaRecorder failed"));
    });
    recorder.start(100);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    const buffer = await blob.arrayBuffer();
    return {
      mimeType: recorder.mimeType,
      byteLength: buffer.byteLength,
      bytes: Array.from(new Uint8Array(buffer)),
      canvas: { width: canvas.width, height: canvas.height },
    };
  });

  const outputPath = path.join(outputDir, "original-canvas-5s.webm");
  await writeFile(outputPath, Buffer.from(result.bytes));
  await writeFile(path.join(outputDir, "recording.json"), JSON.stringify({
    capturedAt: new Date().toISOString(),
    mimeType: result.mimeType,
    byteLength: result.byteLength,
    canvas: result.canvas,
    errors,
  }, null, 2));
  console.log(JSON.stringify({ outputPath, mimeType: result.mimeType, byteLength: result.byteLength, canvas: result.canvas, errors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
