import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
const page = await context.newPage();

const state = () => page.locator("canvas.samsy-webgl").evaluate((element) => ({
  x: Number(element.dataset.playerX),
  z: Number(element.dataset.playerZ),
  heading: Number(element.dataset.cameraHeading),
}));
const drag = async (dx) => {
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(720 + dx, 450, { steps: 18 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(500);
};
const orbit = async () => {
  for (let index = 0; index < 8; index += 1) await drag(-112);
};
const holdForward = async (durationMs) => {
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(durationMs);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(700);
};

try {
  await page.goto(process.env.SAMSY_CLONE_URL || "http://127.0.0.1:3003", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector(".loading-screen", { state: "detached", timeout: 120_000 });
  await page.waitForTimeout(1800);
  console.log("spawn", await state());
  await orbit();
  await holdForward(5000);
  console.log("checkpoint-1", await state());
  await orbit();
  await drag(-220);
  await holdForward(5000);
  console.log("checkpoint-2", await state());
  await orbit();
  await drag(-220);
  await holdForward(6500);
  console.log("checkpoint-3", await state());
  await orbit();
  await drag(-220);
  await holdForward(6500);
  console.log("checkpoint-4", await state());
} finally {
  await browser.close();
}
