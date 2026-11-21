import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = path.resolve('docs/research/samsy/states');
const shots = path.resolve('docs/design-references/3d');
await mkdir(root, { recursive: true });
await mkdir(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const page = await context.newPage();

const logs = [];
page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e.stack || e) }));

async function state(label) {
  const value = await page.evaluate(() => ({
    url: location.href,
    pathname: location.pathname,
    text: document.body.innerText,
    scrollHeight: document.body.scrollHeight,
    app: document.querySelector('#app')?.innerHTML.slice(0, 100000) ?? '',
    canvases: [...document.querySelectorAll('canvas')].map((c) => {
      const r = c.getBoundingClientRect();
      return { width: c.width, height: c.height, rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
    }),
    resources: performance.getEntriesByType('resource').map((e) => e.name),
  }));
  await page.screenshot({ path: path.join(shots, `samsy-${label}.png`) });
  await writeFile(path.join(root, `${label}.json`), JSON.stringify(value, null, 2));
  console.log(label, value.pathname, value.text.slice(0, 600).replace(/\n/g, ' | '));
  return value;
}

async function clickAndCapture(label, x, y) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(500);
  await page.mouse.click(x, y);
  for (const [delay, suffix] of [[1000, '01'], [4000, '05'], [5000, '10']]) {
    await page.waitForTimeout(delay);
    await state(`${label}-${suffix}`);
  }
}

try {
  await page.goto('https://samsy.ninja/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.body.innerText.includes('ABOUT'), null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  await state('home-ready');

  // Canvas navigation positions measured from the 1440x900 reference frame.
  await clickAndCapture('works', 720, 68);
  await clickAndCapture('about', 860, 68);
  await clickAndCapture('explore', 580, 68);

  // Exercise movement and jump in explore mode.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  await state('explore-after-w');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  await state('explore-after-jump');

  // Try likely cards/controls in works view after returning there.
  await page.mouse.click(720, 68);
  await page.waitForTimeout(5000);
  await state('works-return');
  await page.mouse.click(720, 450);
  await page.waitForTimeout(3000);
  await state('works-center-click');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2500);
  await state('works-arrow-right');
} finally {
  await writeFile(path.join(root, 'console.json'), JSON.stringify(logs, null, 2));
  await browser.close();
}
