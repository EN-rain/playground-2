import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outputDir = path.resolve('docs/research/samsy/runtime');
const screenshotDir = path.resolve('docs/design-references/3d');
await mkdir(outputDir, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-dev-shm-usage',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
  colorScheme: 'dark',
});

await context.addInitScript(() => {
  window.__samsyInspection = {
    contexts: [],
    rafCount: 0,
    rafCallbacks: new Set(),
  };

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, attributes) {
    window.__samsyInspection.contexts.push({
      type,
      attributes: attributes ?? null,
      timestamp: performance.now(),
    });
    return originalGetContext.call(this, type, attributes);
  };

  const originalRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = function patchedRaf(callback) {
    window.__samsyInspection.rafCount += 1;
    window.__samsyInspection.rafCallbacks.add(callback?.name || 'anonymous');
    return originalRaf.call(this, callback);
  };
});

const page = await context.newPage();
const requests = [];
const responses = [];
const failed = [];
const consoleMessages = [];
const pageErrors = [];

page.on('request', (request) => {
  requests.push({
    url: request.url(),
    method: request.method(),
    resourceType: request.resourceType(),
    timestamp: Date.now(),
  });
});
page.on('response', async (response) => {
  const request = response.request();
  const headers = await response.allHeaders().catch(() => ({}));
  responses.push({
    url: response.url(),
    status: response.status(),
    resourceType: request.resourceType(),
    contentType: headers['content-type'] ?? null,
    contentLength: headers['content-length'] ?? null,
    cacheControl: headers['cache-control'] ?? null,
    timestamp: Date.now(),
  });
});
page.on('requestfailed', (request) => {
  failed.push({
    url: request.url(),
    resourceType: request.resourceType(),
    error: request.failure()?.errorText ?? 'unknown',
  });
});
page.on('console', (message) => {
  consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on('pageerror', (error) => pageErrors.push(String(error.stack || error)));

async function snapshot(label) {
  const state = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')].map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      return {
        index,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        backing: { width: canvas.width, height: canvas.height },
        className: canvas.className,
        id: canvas.id,
        position: style.position,
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents,
        opacity: style.opacity,
        visibility: style.visibility,
      };
    });

    const elements = [...document.querySelectorAll('button, a, [role="button"], input, [tabindex]')]
      .slice(0, 200)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 200) || '',
          ariaLabel: element.getAttribute('aria-label'),
          href: element instanceof HTMLAnchorElement ? element.href : null,
          className: element.className?.toString().slice(0, 300) || '',
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
        };
      });

    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      duration: entry.duration,
    }));

    return {
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      bodyText: document.body.innerText.slice(0, 20000),
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      bodyScrollHeight: document.body.scrollHeight,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      scroll: { x: scrollX, y: scrollY },
      preloader: document.querySelector('#preloader') ? {
        html: document.querySelector('#preloader').innerHTML.slice(0, 5000),
        display: getComputedStyle(document.querySelector('#preloader')).display,
        opacity: getComputedStyle(document.querySelector('#preloader')).opacity,
        visibility: getComputedStyle(document.querySelector('#preloader')).visibility,
      } : null,
      appHtml: document.querySelector('#app')?.innerHTML.slice(0, 50000) ?? null,
      canvases,
      elements,
      resources,
      inspection: {
        contexts: window.__samsyInspection?.contexts ?? [],
        rafCount: window.__samsyInspection?.rafCount ?? 0,
        rafCallbacks: [...(window.__samsyInspection?.rafCallbacks ?? [])],
      },
      globals: {
        THREE: Boolean(window.THREE),
        Vue: Boolean(window.Vue),
        gsap: Boolean(window.gsap),
      },
    };
  });

  await page.screenshot({
    path: path.join(screenshotDir, `samsy-${label}.png`),
    fullPage: false,
  });
  await writeFile(path.join(outputDir, `${label}.json`), JSON.stringify(state, null, 2));
  console.log(label, JSON.stringify({
    text: state.bodyText.slice(0, 300),
    canvases: state.canvases.length,
    preloader: state.preloader,
    elements: state.elements.length,
    resources: state.resources.length,
    contexts: state.inspection.contexts,
  }));
  return state;
}

try {
  await page.goto('https://samsy.ninja/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await snapshot('t00');

  for (const [seconds, label] of [[5, 't05'], [15, 't15'], [30, 't30'], [60, 't60']]) {
    const previous = label === 't05' ? 0 : label === 't15' ? 5 : label === 't30' ? 15 : 30;
    await page.waitForTimeout((seconds - previous) * 1000);
    await snapshot(label);
  }

  // Try the most likely entrance gestures only after passive observation.
  await page.mouse.click(720, 450);
  await page.waitForTimeout(3000);
  await snapshot('after-center-click');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await snapshot('after-enter');

  await page.mouse.move(200, 200);
  await page.waitForTimeout(1000);
  await page.mouse.move(1240, 700);
  await page.waitForTimeout(1000);
  await snapshot('after-pointer-sweep');
} finally {
  await writeFile(path.join(outputDir, 'network.json'), JSON.stringify({ requests, responses, failed }, null, 2));
  await writeFile(path.join(outputDir, 'console.json'), JSON.stringify({ consoleMessages, pageErrors }, null, 2));
  await browser.close();
}
