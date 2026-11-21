import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--enable-webgpu", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
try {
  const context = await browser.newContext({ viewport: { width: 1535, height: 714 }, deviceScaleFactor: 1.25 });
  await context.addInitScript(() => localStorage.setItem("smsy_quests", JSON.stringify({ TUTORIAL: true })));
  const page = await context.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120000 });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const state = await page.evaluate(() => ({
      href: location.href,
      canvases: [...document.querySelectorAll("canvas")].map((c, index) => ({ index, width: c.width, height: c.height, clientWidth: c.clientWidth, clientHeight: c.clientHeight, className: c.className })),
      body: document.body.innerText.slice(0, 1000),
      storage: localStorage.getItem("smsy_quests"),
    }));
    console.log(JSON.stringify({ elapsed: (i + 1) * 5, state, errors }));
    const explore = page.getByText("EXPLORE", { exact: true }).first();
    if (i === 1 && await explore.count()) await explore.click({ force: true }).catch(() => {});
  }
  await context.close();
} finally {
  await browser.close();
}
