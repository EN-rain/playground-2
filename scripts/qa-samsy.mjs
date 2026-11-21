import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SAMSY_CLONE_URL || "http://localhost:3002";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const results = {
  baseUrl,
  timestamp: new Date().toISOString(),
  checks: [],
  consoleErrors: [],
  requestFailures: [],
  externalRuntimeResources: [],
  performance: {},
};

function check(name, passed, details = null) {
  results.checks.push({ name, passed, details });
  if (!passed) console.error(`FAIL: ${name}`, details ?? "");
  else console.log(`PASS: ${name}`);
}

async function waitReady(page) {
  await page.waitForSelector(".loading-screen", { state: "detached", timeout: 120_000 });
  await page.waitForSelector("canvas.samsy-webgl", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function canvasState(page) {
  return page.locator("canvas.samsy-webgl").evaluate((element) => ({ ...element.dataset }));
}

function numberValue(state, key) {
  return Number(state[key]);
}

await mkdir("docs/research/samsy/qa", { recursive: true });
await mkdir("docs/design-references/qa", { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.consoleErrors.push(String(error.stack || error)));
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText;
    if (request.resourceType() === "media" && error === "net::ERR_ABORTED") return;
    results.requestFailures.push({ url: request.url(), error });
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitReady(page);
  check("Explore route initializes", await page.locator(".mode-explore").count() === 1);
  check("One persistent WebGL canvas", await page.locator("canvas.samsy-webgl").count() === 1);
  check("Explore identity copy", (await page.locator(".home-copy").innerText()).includes("CREATIVE DEVELOPMENT"));

  const canvas = page.locator("canvas.samsy-webgl");
  const initialControlState = await canvasState(page);
  check(
    "Original 35-instance kit layout is active",
    initialControlState.cityInstanceCount === "35" &&
      initialControlState.worldLayout === "original-kit-instances",
    initialControlState,
  );
  check(
    "Original avatar and camera scale are active",
    Math.abs(numberValue(initialControlState, "avatarScale") - 1.65) < 0.01 &&
      Math.abs(numberValue(initialControlState, "cameraTargetDistance") - 8.38) < 0.03 &&
      Math.abs(numberValue(initialControlState, "cameraFov") - 60) < 0.01,
    initialControlState,
  );
  check(
    "Original Explore fog range is active",
    numberValue(initialControlState, "fogNear") === 700 &&
      numberValue(initialControlState, "fogFar") === 800,
    initialControlState,
  );
  check(
    "Wet floor uses the original dual-scale masked reflector",
    initialControlState.floorSurface === "original-masked-reflector" &&
      initialControlState.floorGrid === "dual-scale-reflection-mask" &&
      initialControlState.floorGridSpacing === "50-unit-macro-10-unit-fine" &&
      initialControlState.floorReflectorResolution === "0.75",
    initialControlState,
  );
  check(
    "City billboards use animated screen materials",
    numberValue(initialControlState, "animatedScreenCount") >= 8 &&
      numberValue(initialControlState, "sourceScreenMeshCount") >= 8 &&
      numberValue(initialControlState, "sourceSurfaceMeshCount") >= 8 &&
      initialControlState.billboardShader === "source-pcg-burst-panel-flicker-no-near-stripe" &&
      initialControlState.buildingMaterialProfile === "source-height-faded-textures" &&
      initialControlState.bloomProfile === "selective-emissive-screen-blend" &&
      initialControlState.bloomOcclusionProfile === "source-depth-occluded-emissive" &&
      initialControlState.postProfile === "source-emissive-mrt-screen-blend-approximation",
    initialControlState,
  );
  check(
    "Structural collision and third-person camera solver are active",
    numberValue(initialControlState, "playerCollisionMeshCount") >= 12 &&
      numberValue(initialControlState, "cameraCollisionMeshCount") >= 12 &&
      initialControlState.cameraSolver === "third-person-sphere-sweep-v1" &&
      initialControlState.physicsProfile === "structural-capsule-slide-3-substeps" &&
      initialControlState.rotatingScreenProfile === "source-pcg-local-y",
    initialControlState,
  );
  const initialScreenVideoTime = numberValue(initialControlState, "screenVideoTime");
  await page.waitForTimeout(900);
  const advancedScreenState = await canvasState(page);
  check(
    "Persistent Explore videos advance",
    numberValue(advancedScreenState, "playingScreenVideos") >= 2 &&
      numberValue(advancedScreenState, "screenVideoTime") > initialScreenVideoTime + 0.05,
    { initialControlState, advancedScreenState },
  );
  await page.screenshot({ path: "docs/design-references/qa/explore-before-movement.png" });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(350);
  const forwardControlState = await canvasState(page);
  await page.screenshot({ path: "docs/design-references/qa/explore-after-movement.png" });
  const forwardDx = numberValue(forwardControlState, "playerX") - numberValue(initialControlState, "playerX");
  const forwardDz = numberValue(forwardControlState, "playerZ") - numberValue(initialControlState, "playerZ");
  const initialHeading = numberValue(initialControlState, "cameraHeading");
  const initialForwardProjection =
    forwardDx * Math.sin(initialHeading) + forwardDz * Math.cos(initialHeading);
  const initialSideProjection =
    forwardDx * -Math.cos(initialHeading) + forwardDz * Math.sin(initialHeading);
  check(
    "W moves camera-forward",
    initialForwardProjection > 0.2 && Math.abs(initialSideProjection) < initialForwardProjection,
    {
      forwardDx,
      forwardDz,
      initialForwardProjection,
      initialSideProjection,
      initialControlState,
      forwardControlState,
    },
  );

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(350);
  const sprintingControlState = await canvasState(page);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(120);
  check(
    "Original always-sprint movement profile is active",
    sprintingControlState.sprinting === "true" &&
      numberValue(sprintingControlState, "effectiveMovementSpeed") >=
        numberValue(sprintingControlState, "speedMultiplier") * 9.5,
    sprintingControlState,
  );

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("WebGL canvas has no bounding box");
  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;
  await page.mouse.move(centerX, centerY);
  const lookReadyState = await canvasState(page);
  check(
    "Explore waits for LMB before entering RPG mouse look",
    lookReadyState.mouseLook === "click-to-look",
    lookReadyState,
  );
  await page.mouse.click(centerX, centerY, { button: "left" });
  await page.waitForTimeout(250);
  const lookLockedState = await canvasState(page);
  check(
    "One LMB click activates continuous RPG mouse look",
    lookLockedState.mouseLook === "locked",
    lookLockedState,
  );
  await page.mouse.move(centerX + 220, centerY, { steps: 18 });
  await page.waitForTimeout(500);
  const rotatedControlState = await canvasState(page);
  const rightTurnDelta = Math.atan2(
    Math.sin(numberValue(rotatedControlState, "cameraHeading") - numberValue(lookLockedState, "cameraHeading")),
    Math.cos(numberValue(rotatedControlState, "cameraHeading") - numberValue(lookLockedState, "cameraHeading")),
  );
  check(
    "Moving the mouse right looks right without holding LMB",
    rightTurnDelta < -1.0,
    { lookLockedState, rotatedControlState, rightTurnDelta },
  );

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(350);
  const rotatedForwardState = await canvasState(page);
  const rotatedDx = numberValue(rotatedForwardState, "playerX") - numberValue(rotatedControlState, "playerX");
  const rotatedDz = numberValue(rotatedForwardState, "playerZ") - numberValue(rotatedControlState, "playerZ");
  const rotatedHeading = numberValue(rotatedControlState, "cameraHeading");
  const rotatedForwardProjection =
    rotatedDx * Math.sin(rotatedHeading) + rotatedDz * Math.cos(rotatedHeading);
  const rotatedSideProjection =
    rotatedDx * -Math.cos(rotatedHeading) + rotatedDz * Math.sin(rotatedHeading);
  check(
    "W follows rotated camera heading",
    rotatedForwardProjection > 0.2 && Math.abs(rotatedSideProjection) < rotatedForwardProjection,
    {
      rotatedDx,
      rotatedDz,
      rotatedForwardProjection,
      rotatedSideProjection,
      rotatedControlState,
      rotatedForwardState,
    },
  );

  await page.mouse.move(centerX + 220, centerY + 140, { steps: 14 });
  await page.waitForTimeout(500);
  const pitchedControlState = await canvasState(page);
  check(
    "Moving the mouse down looks down without holding LMB",
    numberValue(pitchedControlState, "cameraElevation") >
      numberValue(rotatedForwardState, "cameraElevation") + 0.5,
    { rotatedForwardState, pitchedControlState },
  );
  await page.mouse.move(centerX + 220, centerY, { steps: 14 });
  await page.waitForTimeout(500);

  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(100);
  const zoomInState = await canvasState(page);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(100);
  const zoomOutState = await canvasState(page);
  check(
    "Wheel uses the original narrow orbit zoom range",
    Math.abs(numberValue(zoomInState, "cameraTargetDistance") - 7.95) < 0.03 &&
      Math.abs(numberValue(zoomOutState, "cameraTargetDistance") - 8.4) < 0.03,
    { rotatedForwardState, zoomInState, zoomOutState },
  );
  check(
    "Full original city footprint is playable",
    numberValue(initialControlState, "worldMinX") <= -970 &&
      numberValue(initialControlState, "worldMaxX") >= 613 &&
      numberValue(initialControlState, "worldMinZ") <= -936 &&
      numberValue(initialControlState, "worldMaxZ") >= 743,
    initialControlState,
  );
  const controlGuideText = await page.locator(".control-guide").innerText();
  check(
    "Control guide documents RPG mouse look and release",
    controlGuideText.includes("LMB: MOUSE LOOK") &&
      controlGuideText.includes("ESC: RELEASE") &&
      controlGuideText.includes("WHEEL: ZOOM") &&
      controlGuideText.includes("WASD: MOVE"),
    controlGuideText,
  );

  const groundedState = await canvasState(page);
  await page.keyboard.press("Space");
  await page.waitForTimeout(140);
  const firstJumpState = await canvasState(page);
  await page.keyboard.press("Space");
  await page.waitForTimeout(90);
  const secondJumpState = await canvasState(page);
  await page.screenshot({ path: "docs/design-references/qa/explore-jump.png" });
  check(
    "Space produces measurable jump height",
    numberValue(firstJumpState, "playerY") > numberValue(groundedState, "playerY") + 0.5 &&
      firstJumpState.isGrounded === "false",
    { groundedState, firstJumpState },
  );
  check(
    "Second Space press performs double jump",
    numberValue(secondJumpState, "jumpCount") === 2 &&
      numberValue(secondJumpState, "playerY") >= numberValue(firstJumpState, "playerY"),
    { firstJumpState, secondJumpState },
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const releasedMouseState = await canvasState(page);
  check(
    "Escape releases RPG mouse look",
    releasedMouseState.mouseLook === "click-to-look",
    releasedMouseState,
  );

  await page.getByRole("button", { name: "WORKS" }).click();
  await page.waitForSelector(".works-view");
  check("Works mode navigation", new URL(page.url()).pathname === "/works");
  check("All 25 project rail entries", await page.locator(".project-rail button").count() === 25);
  check("First project is Clonex", (await page.locator(".works-card-copy h1").innerText()).includes("Clonex"));

  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    () => document.querySelector(".works-card-copy h1")?.textContent?.includes("Jiometory"),
    undefined,
    { timeout: 5_000 },
  );
  check("Keyboard advances project", (await page.locator(".works-card-copy h1").innerText()).includes("Jiometory"));
  await page.getByRole("button", { name: "INFOS" }).click();
  check("Project information modal opens", await page.locator(".project-info").count() === 1);
  check("Project information uses extracted copy", (await page.locator(".project-info p").innerText()).length > 100);
  await page.keyboard.press("Escape");
  await page.waitForSelector(".project-info", { state: "detached", timeout: 5_000 });
  check("Project information modal closes", await page.locator(".project-info").count() === 0);

  await page.getByRole("button", { name: "ABOUT" }).click();
  await page.waitForSelector(".about-view");
  check("About mode navigation", new URL(page.url()).pathname === "/about");
  check("Bilingual About content", await page.locator(".about-japanese").count() === 1);
  check("Contact link preserved", (await page.locator('.about-links a[href^="mailto:"]').getAttribute("href")) === "mailto:samuel.honigstein@gmail.com");

  const perf = await page.evaluate(async () => {
    const durations = [];
    let previous = performance.now();
    for (let index = 0; index < 60; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const now = performance.now();
      durations.push(now - previous);
      previous = now;
    }
    const resourceNames = performance.getEntriesByType("resource").map((entry) => entry.name);
    return {
      averageFrameMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      worstFrameMs: Math.max(...durations),
      resources: resourceNames,
      engineText: document.querySelector(".engine-stats")?.textContent || "",
    };
  });
  results.performance = {
    averageFrameMs: Number(perf.averageFrameMs.toFixed(2)),
    worstFrameMs: Number(perf.worstFrameMs.toFixed(2)),
    engineText: perf.engineText,
  };
  results.externalRuntimeResources = perf.resources.filter((url) => {
    try {
      return new URL(url).origin !== new URL(baseUrl).origin && !url.startsWith("data:");
    } catch {
      return false;
    }
  });
  check("Live renderer statistics update", /FPS/.test(perf.engineText) && !/ 0 FPS/.test(perf.engineText), perf.engineText);
  check("Primary runtime assets are local", results.externalRuntimeResources.length === 0, results.externalRuntimeResources);
  check("No failed requests", results.requestFailures.length === 0, results.requestFailures);
  check("No browser console errors", results.consoleErrors.length === 0, results.consoleErrors);

  await context.close();

  const directContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await directContext.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const directPage = await directContext.newPage();
  await directPage.goto(`${baseUrl}/works`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitReady(directPage);
  check("Direct /works route survives refresh", await directPage.locator(".mode-works").count() === 1);
  await directPage.goto(`${baseUrl}/about`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitReady(directPage);
  check("Direct /about route survives refresh", await directPage.locator(".mode-about").count() === 1);
  await directContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileContext.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitReady(mobilePage);
  check("Mobile touch controls visible", await mobilePage.locator(".mobile-controls").isVisible());
  check("Mobile navigation fits viewport", await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobileContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await reducedContext.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${baseUrl}/about`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitReady(reducedPage);
  const animationName = await reducedPage.locator(".about-light-tunnel").evaluate((element) => getComputedStyle(element).animationName);
  check("Reduced motion disables decorative tunnel animation", animationName === "none", animationName);
  await reducedContext.close();
} finally {
  await browser.close();
}

const noWebglBrowser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--disable-webgl", "--disable-webgpu", "--disable-software-rasterizer"],
});
try {
  const context = await noWebglBrowser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => sessionStorage.setItem("samsy-tutorial-completed", "true"));
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);
  check("No-WebGL fallback renders", await page.locator(".webgl-fallback").count() === 1);
  check("No-WebGL fallback removes loading block", await page.locator(".loading-screen").count() === 0);
  await context.close();
} finally {
  await noWebglBrowser.close();
}

results.passed = results.checks.every((item) => item.passed);
await writeFile("docs/research/samsy/clone-qa.json", JSON.stringify(results, null, 2));
if (!results.passed) process.exitCode = 1;
