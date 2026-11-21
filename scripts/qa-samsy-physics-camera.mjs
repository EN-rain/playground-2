import { chromium } from "playwright-core";

const baseUrl = process.env.SAMSY_CLONE_URL || "http://127.0.0.1:3004";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const results = [];
const consoleErrors = [];
const requestFailures = [];

function check(name, passed, details = null) {
  results.push({ name, passed, details });
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    sessionStorage.setItem("samsy-tutorial-completed", "true");
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    const isCanceledMedia = failure === "net::ERR_ABORTED" && /\.(?:opus|ogg|mp3|wav)(?:\?|$)/i.test(request.url());
    if (!isCanceledMedia) requestFailures.push({ url: request.url(), error: failure });
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".loading-screen", { state: "detached", timeout: 120_000 });
  const canvas = page.locator("canvas.samsy-webgl");
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(800);

  const state = () => canvas.evaluate((element) => ({ ...element.dataset }));
  const numeric = (data, key) => Number(data[key]);
  const start = await state();

  await page.keyboard.down("KeyA");
  await page.waitForTimeout(5_500);
  await page.keyboard.up("KeyA");
  const wall = await state();

  check(
    "Player reaches the source tower collision face",
    numeric(wall, "playerX") > 129.75 &&
      numeric(wall, "playerX") < 130.1 &&
      Math.abs(numeric(wall, "playerZ") - numeric(start, "playerZ")) < 0.15,
    { start, wall },
  );

  await page.keyboard.down("KeyA");
  await page.waitForTimeout(1_200);
  await page.keyboard.up("KeyA");
  const pushed = await state();
  check(
    "Holding into a wall does not tunnel or jitter",
    Math.abs(numeric(pushed, "playerX") - numeric(wall, "playerX")) < 0.08 &&
      Math.abs(numeric(pushed, "playerZ") - numeric(wall, "playerZ")) < 0.08,
    { wall, pushed },
  );

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounds unavailable");
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(200);
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.move(centerX + 60 * (index + 1), centerY, { steps: 2 });
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(450);
  const blockedCamera = await state();
  check(
    "Third-person camera contracts between player and wall",
    blockedCamera.cameraObstructed === "true" &&
      numeric(blockedCamera, "cameraActualDistance") >= 0.68 &&
      numeric(blockedCamera, "cameraActualDistance") <= 1.0,
    blockedCamera,
  );

  for (let index = 0; index < 4; index += 1) {
    await page.mouse.move(centerX + 240 - 60 * (index + 1), centerY, { steps: 2 });
    await page.waitForTimeout(50);
  }
  const recovery = [];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForTimeout(100);
    recovery.push(numeric(await state(), "cameraActualDistance"));
  }
  const recoveryDoesNotSnapBackward = recovery.every((value, index) => index === 0 || value >= recovery[index - 1] - 0.08);
  check(
    "Camera restores smoothly after clearing the wall",
    recoveryDoesNotSnapBackward && recovery.at(-1) >= 8.25 && recovery.at(-1) <= 8.41,
    recovery,
  );

  await page.keyboard.press("Escape");
  await page.keyboard.down("KeyA");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(2_200);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyA");
  const slid = await state();
  check(
    "Diagonal movement slides around the tower corner",
    numeric(slid, "playerX") > numeric(wall, "playerX") + 15 &&
      Math.abs(numeric(slid, "playerZ") - numeric(wall, "playerZ")) > 20,
    { wall, slid },
  );

  check("No browser console errors", consoleErrors.length === 0, consoleErrors);
  check("No failed runtime requests", requestFailures.length === 0, requestFailures);

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) process.exitCode = 1;
  await context.close();
} finally {
  await browser.close();
}
