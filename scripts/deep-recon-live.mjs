import { chromium } from "playwright-core";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputRoot = path.resolve("docs/research/samsy/deep-recon-live");
const screenshotRoot = path.resolve("docs/design-references/deep-recon-live");
await mkdir(outputRoot, { recursive: true });
await mkdir(screenshotRoot, { recursive: true });

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
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const page = await context.newPage();

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
    } catch {
      // Continue to the network when the asset is not cached locally.
    }
  }
  await route.continue();
});
await page.route("https://samsy.ninja/videos/loading.mp4", async (route) => {
  await fulfillLocalMedia(route, path.resolve("public/videos/loading.mp4"), "video/mp4");
});

const consoleErrors = [];
const failedRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error.stack || error)));
page.on("requestfailed", (request) => {
  failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null });
});

async function inspect(label) {
  const snapshot = await page.evaluate(() => {
    const vec3 = (value) => value && typeof value.x === "number"
      ? { x: value.x, y: value.y, z: value.z }
      : null;
    const euler = (value) => value && typeof value.x === "number"
      ? { x: value.x, y: value.y, z: value.z, order: value.order ?? null }
      : null;
    const color = (value) => value && typeof value.getHexString === "function"
      ? `#${value.getHexString()}`
      : null;
    const sourceOfTexture = (texture) => {
      if (!texture) return null;
      const image = texture.image ?? texture.source?.data ?? null;
      if (!image) return { uuid: texture.uuid ?? null, type: texture.constructor?.name ?? null };
      return {
        uuid: texture.uuid ?? null,
        type: texture.constructor?.name ?? null,
        src: image.currentSrc || image.src || null,
        tagName: image.tagName ?? null,
        width: image.videoWidth || image.naturalWidth || image.width || null,
        height: image.videoHeight || image.naturalHeight || image.height || null,
        currentTime: typeof image.currentTime === "number" ? image.currentTime : null,
        paused: typeof image.paused === "boolean" ? image.paused : null,
      };
    };
    const materialSummary = (material) => {
      if (!material) return null;
      return {
        name: material.name || null,
        type: material.type || material.constructor?.name || null,
        color: color(material.color),
        emissive: color(material.emissive),
        emissiveIntensity: typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : null,
        opacity: typeof material.opacity === "number" ? material.opacity : null,
        transparent: material.transparent ?? null,
        toneMapped: material.toneMapped ?? null,
        roughness: typeof material.roughness === "number" ? material.roughness : null,
        metalness: typeof material.metalness === "number" ? material.metalness : null,
        map: sourceOfTexture(material.map),
        emissiveMap: sourceOfTexture(material.emissiveMap),
        alphaMap: sourceOfTexture(material.alphaMap),
        nodeKeys: Object.keys(material).filter((key) => /node/i.test(key) && material[key]).slice(0, 30),
      };
    };

    const camera = window.camera;
    let root = camera;
    while (root?.parent) root = root.parent;
    const controls = camera?.controls ?? null;
    const objects = [];
    const screens = [];
    const lights = [];
    const floors = [];
    const avatars = [];
    if (root?.traverse) {
      root.traverse((object) => {
        const materials = object.material
          ? (Array.isArray(object.material) ? object.material : [object.material]).map(materialSummary)
          : [];
        const entry = {
          name: object.name || null,
          type: object.type || object.constructor?.name || null,
          uuid: object.uuid ?? null,
          visible: object.visible ?? null,
          position: vec3(object.position),
          worldPosition: (() => {
            try {
              const target = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
              const value = object.getWorldPosition?.(target);
              return vec3(value);
            } catch {
              return null;
            }
          })(),
          rotation: euler(object.rotation),
          scale: vec3(object.scale),
          renderOrder: object.renderOrder ?? null,
          castShadow: object.castShadow ?? null,
          receiveShadow: object.receiveShadow ?? null,
          materials,
          userDataKeys: Object.keys(object.userData ?? {}).slice(0, 30),
        };
        objects.push(entry);
        const searchable = `${entry.name ?? ""} ${materials.map((material) => material?.name ?? "").join(" ")}`;
        if (/screen|billboard|logo|writing|holo|display/i.test(searchable)) screens.push(entry);
        if (/floor|ground|reflect|water|puddle|road/i.test(searchable)) floors.push(entry);
        if (/avatar|player|npc|cat|owo|facemesh|outline/i.test(searchable)) avatars.push(entry);
        if (object.isLight) {
          lights.push({
            name: object.name || null,
            type: object.type || object.constructor?.name || null,
            color: color(object.color),
            intensity: typeof object.intensity === "number" ? object.intensity : null,
            distance: typeof object.distance === "number" ? object.distance : null,
            decay: typeof object.decay === "number" ? object.decay : null,
            position: vec3(object.position),
          });
        }
      });
    }

    const renderers = [];
    for (const key of Object.getOwnPropertyNames(window)) {
      let value;
      try { value = window[key]; } catch { continue; }
      if (!value || typeof value !== "object") continue;
      const candidate = value.isRenderer ? value : value.renderer?.isRenderer ? value.renderer : null;
      if (!candidate) continue;
      renderers.push({
        key,
        type: candidate.constructor?.name ?? null,
        outputColorSpace: candidate.outputColorSpace ?? null,
        toneMapping: candidate.toneMapping ?? null,
        toneMappingExposure: candidate.toneMappingExposure ?? null,
        pixelRatio: candidate.getPixelRatio?.() ?? null,
        shadowMapEnabled: candidate.shadowMap?.enabled ?? null,
        backend: candidate.backend?.constructor?.name ?? null,
      });
    }

    return {
      capturedAt: new Date().toISOString(),
      camera: {
        type: camera?.constructor?.name ?? null,
        position: vec3(camera?.position),
        rotation: euler(camera?.rotation),
        fov: camera?.fov ?? null,
        near: camera?.near ?? null,
        far: camera?.far ?? null,
        maxDistance: camera?.maxDistance ?? null,
        currentFovSmooth: camera?.currentFovSmooth ?? null,
        originalCurrentSmoothFov: camera?.originalCurrentSmoothFov ?? null,
        controls: controls ? {
          type: controls.constructor?.name ?? null,
          target: vec3(controls.target),
          minDistance: controls.minDistance ?? null,
          maxDistance: controls.maxDistance ?? null,
          minPolarAngle: controls.minPolarAngle ?? null,
          maxPolarAngle: controls.maxPolarAngle ?? null,
          enableZoom: controls.enableZoom ?? null,
          enableRotate: controls.enableRotate ?? null,
          enablePan: controls.enablePan ?? null,
          enableDamping: controls.enableDamping ?? null,
          dampingFactor: controls.dampingFactor ?? null,
          rotateSpeed: controls.rotateSpeed ?? null,
          zoomSpeed: controls.zoomSpeed ?? null,
          azimuth: controls.getAzimuthalAngle?.() ?? null,
          polar: controls.getPolarAngle?.() ?? null,
        } : null,
      },
      player: {
        capsulePosition: vec3(window.p?.capsule?.position),
        capsuleRotation: euler(window.p?.capsule?.rotation),
        avatarPosition: vec3(window.p?.avatar?.position),
        avatarScale: vec3(window.p?.avatar?.scale),
        avatarRotationY: window.p?.avatar?.rotationY ?? null,
        isGrounded: window.p?.controls?.isGrounded ?? null,
        isSprinting: window.p?.controls?.isSprinting ?? null,
        speedMultiplier: window.p?.controls?.currentSpeedMultiplier ?? null,
        actualVelocity: vec3(window.p?.controls?.actualVelocity),
      },
      scene: {
        rootType: root?.type || root?.constructor?.name || null,
        rootName: root?.name || null,
        background: color(root?.background),
        fog: root?.fog ? {
          type: root.fog.constructor?.name ?? null,
          color: color(root.fog.color),
          near: root.fog.near ?? null,
          far: root.fog.far ?? null,
          density: root.fog.density ?? null,
        } : null,
        objectCount: objects.length,
        screenCount: screens.length,
        lightCount: lights.length,
        floorCandidateCount: floors.length,
        avatarCandidateCount: avatars.length,
      },
      renderers,
      screens,
      lights,
      floors,
      avatars,
      resources: performance.getEntriesByType("resource").map((entry) => entry.name),
    };
  });

  await writeFile(path.join(outputRoot, `${label}.json`), JSON.stringify(snapshot, null, 2));
  await page.screenshot({ path: path.join(screenshotRoot, `${label}.png`) });
  return snapshot;
}

try {
  await page.goto("https://samsy.ninja/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes("EXPLORE"), undefined, { timeout: 180_000 });
  await page.waitForTimeout(4000);
  await page.mouse.click(580, 68);
  await page.waitForTimeout(4000);

  const spawn = await inspect("original-spawn");

  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(500, 450, { steps: 24 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(800);
  const yaw = await inspect("original-yaw-left");

  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(720, 610, { steps: 24 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(800);
  const pitch = await inspect("original-pitch-down");

  await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify({
    original: {
      spawnCamera: spawn.camera,
      yawCamera: yaw.camera,
      pitchCamera: pitch.camera,
      scene: spawn.scene,
      renderers: spawn.renderers,
      screenCount: spawn.screens.length,
      lightCount: spawn.lights.length,
      floorCandidateCount: spawn.floors.length,
      resources: spawn.resources,
    },
    consoleErrors,
    failedRequests: failedRequests.filter((request) => !/google-analytics|googletagmanager/.test(request.url)),
  }, null, 2));

  console.log(JSON.stringify({
    spawnCamera: spawn.camera,
    yawCamera: yaw.camera,
    pitchCamera: pitch.camera,
    scene: spawn.scene,
    renderers: spawn.renderers,
    screenCount: spawn.screens.length,
    lightCount: spawn.lights.length,
    floorCandidateCount: spawn.floors.length,
    consoleErrors: consoleErrors.length,
    failedRequests: failedRequests.length,
  }, null, 2));
} finally {
  await browser.close();
}
