# Interactive 3D Website Inspection Guide

Use this guide whenever the target contains WebGL, WebGPU, `<canvas>`, `<model-viewer>`, Spline, Three.js, React Three Fiber, Babylon.js, PlayCanvas, custom shaders, or a DOM section whose appearance is driven by a rendered 3D scene.

The goal is not to recover the original source code. The goal is to produce a visually and behaviorally equivalent implementation whose evidence, assumptions, assets, scene states, and remaining gaps are auditable.

## Non-Negotiable Rules

1. **A 3D scene is a system, not a screenshot.** Reconstruct its camera, objects, materials, lights, post-processing, animation, input mapping, DOM synchronization, responsive rules, and performance behavior.
2. **Never replace meaningful interaction with a video or flat image** unless the user explicitly approves that fidelity downgrade.
3. **Do not guess silently.** Label every important value as `extracted`, `measured`, `inferred`, or `approximated`.
4. **Do not assume the engine.** Detect the target's implementation, then choose the smallest equivalent stack.
5. **Do not redistribute protected assets without permission.** Record inaccessible or restricted assets and recreate an equivalent where necessary.
6. **Validate multiple states.** A matching first frame is not proof that the scene is cloned.
7. **Use deterministic QA.** Fix viewport, device pixel ratio, time, scroll position, pointer position, and random seed when comparing frames.

## Required Browser Capabilities

The browser automation tool should support:

- navigation and page reload;
- viewport and device emulation;
- full-page and viewport screenshots;
- JavaScript evaluation;
- scroll, hover, click, pointer movement, drag, and wheel input;
- touch emulation when possible;
- network request inspection or Chrome DevTools Protocol access when possible;
- performance entries as a fallback when full network inspection is unavailable.

Record missing capabilities in `docs/research/3D_LIMITATIONS.md`. Do not describe evidence as exact when the browser tool could not observe it.

## 1. Early 3D Detection Gate

Run this before ordinary component extraction. Save the result to `docs/research/3D_DETECTION.json`.

**Do not call `canvas.getContext()` merely to detect a renderer.** That can create a context on a lazy or not-yet-initialized canvas and change the page being inspected. When the browser supports a pre-navigation/init script, install this passive wrapper before loading the target:

```javascript
(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const contextLog = [];

  Object.defineProperty(window, '__clone3DContextLog', {
    configurable: true,
    value: contextLog,
  });

  HTMLCanvasElement.prototype.getContext = function getContext(type, attributes) {
    contextLog.push({
      canvas: this,
      type,
      attributes: attributes ? { ...attributes } : null,
      at: performance.now(),
    });

    return originalGetContext.call(this, type, attributes);
  };
})();
```

After the page loads and its initial scene settles, run the non-invasive evidence collector below:

```javascript
(() => {
  const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
  const assetPattern = /\.(glb|gltf|bin|hdr|exr|ktx2?|basis|dds|obj|fbx|dae|stl|ply|vrm|usdz|splinecode|wasm|wgsl|vert|frag|glsl)(?:$|[?#])/i;
  const texturePattern = /\.(png|jpe?g|webp|avif)(?:$|[?#])/i;
  const scriptSources = [...document.scripts].map((script) => script.src).filter(Boolean);
  const customElements = ['spline-viewer', 'model-viewer']
    .filter((name) => document.querySelector(name));
  const rawContextLog = Array.isArray(window.__clone3DContextLog)
    ? window.__clone3DContextLog
    : [];
  const probable3DAssets = resources.filter((url) => assetPattern.test(url));

  const canvases = [...document.querySelectorAll('canvas')].map((canvas, index) => {
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    const contextRequests = rawContextLog
      .filter((entry) => entry.canvas === canvas)
      .map((entry) => ({
        type: entry.type,
        attributes: entry.attributes,
        at: entry.at,
      }));

    return {
      index,
      contextRequests,
      cssWidth: rect.width,
      cssHeight: rect.height,
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      position: style.position,
      zIndex: style.zIndex,
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      transform: style.transform,
      parent: canvas.parentElement?.className?.toString().slice(0, 200) || null,
    };
  });

  const globals = {
    THREE: Boolean(window.THREE),
    BABYLON: Boolean(window.BABYLON),
    PlayCanvas: Boolean(window.pc),
    Spline: Boolean(window.SPE || customElements.includes('spline-viewer')),
    ModelViewer: customElements.includes('model-viewer'),
    WebGPUAvailable: Boolean(navigator.gpu),
  };

  const text = `${document.documentElement.innerHTML.slice(0, 250000)} ${scriptSources.join(' ')}`;
  const renderingFingerprints = {
    reactThreeFiber: /@react-three\/fiber|react-three-fiber|__r3f/i.test(text),
    drei: /@react-three\/drei/i.test(text),
    three: /three(?:\.module)?(?:\.min)?\.js|THREE\./i.test(text),
    babylon: /babylon(?:\.js)?|BABYLON\./i.test(text),
    playcanvas: /playcanvas|pc\.Application/i.test(text),
    spline: /spline-viewer|splinetool|application\.splinecode/i.test(text),
    modelViewer: /model-viewer/i.test(text),
    webgpu: /navigator\.gpu|GPUCanvasContext|GPUDevice|\.wgsl/i.test(text),
  };
  const orchestrationFingerprints = {
    gsap: /gsap|ScrollTrigger/i.test(text),
    lenis: /lenis/i.test(text),
    locomotive: /locomotive-scroll/i.test(text),
  };
  const observed3DContext = rawContextLog.some((entry) =>
    ['webgl', 'webgl2', 'experimental-webgl', 'webgpu'].includes(entry.type)
  );

  return {
    detected: observed3DContext ||
      customElements.length > 0 ||
      probable3DAssets.length > 0 ||
      Object.values(renderingFingerprints).some(Boolean),
    url: location.href,
    devicePixelRatio,
    viewport: { width: innerWidth, height: innerHeight },
    canvases,
    customElements,
    globals,
    renderingFingerprints,
    orchestrationFingerprints,
    observed3DContext,
    probable3DAssets,
    probableTextures: resources.filter((url) => texturePattern.test(url)),
    scriptSources,
    limitations: rawContextLog.length === 0
      ? ['No pre-navigation context instrumentation was available or no context was requested before capture.']
      : [],
  };
})()
```

### Detection Caveats

- Animation libraries such as GSAP, Lenis, or Locomotive Scroll are orchestration evidence, not proof of 3D. Never activate the 3D track from those fingerprints alone.
- A page may create its renderer only after scrolling, clicking, consent, or intersection. Repeat the collector after the mandatory interaction sweep.
- When init-script instrumentation is unavailable, rely on canvas geometry, network resources, custom elements, script fingerprints, screenshots, and bundle inspection. Record the lower confidence in `3D_LIMITATIONS.md` rather than probing with `getContext()`.

## 2. Evidence Classification

Use these labels in every scene specification:

| Label | Meaning |
| --- | --- |
| `extracted` | Obtained directly from an asset, source map, accessible scene configuration, network response, or runtime object. |
| `measured` | Derived from screenshots, canvas dimensions, timing captures, scroll positions, or controlled experiments. |
| `inferred` | Strongly supported by observable behavior or framework fingerprints but not directly exposed. |
| `approximated` | Recreated by visual matching where the original value or asset is inaccessible. |

Never write “exact” beside an inferred or approximated value.

## 3. Network and Asset Capture

Create `docs/research/3D_ASSET_MANIFEST.json` with one entry per discovered resource.

Capture:

- models: `.glb`, `.gltf`, `.bin`, `.obj`, `.fbx`, `.dae`, `.ply`, `.stl`, `.vrm`, `.usdz`;
- compressed geometry: Draco decoder files and Meshopt decoder modules;
- textures: base color, normal, roughness, metalness, emissive, alpha, AO, displacement, matcap;
- compressed textures: `.ktx`, `.ktx2`, Basis, DDS;
- environments: `.hdr`, `.exr`, cubemap faces;
- shaders: `.vert`, `.frag`, `.glsl`, WGSL, shader chunks embedded in JS bundles;
- animation data and external JSON;
- WASM modules and worker scripts;
- Spline `.splinecode` or equivalent scene packages;
- Lottie/Rive assets that interact with the 3D layer;
- videos used as textures;
- audio that drives animation or interaction.

Each manifest item should include:

```json
{
  "url": "https://example.com/model.glb",
  "localPath": "public/models/model.glb",
  "kind": "model",
  "status": "downloaded",
  "source": "network",
  "evidence": "extracted",
  "contentType": "model/gltf-binary",
  "bytes": 1234567,
  "usedBy": ["HeroScene"],
  "notes": "Draco-compressed"
}
```

### Asset Rules

- Preserve original extensions and meaningful names.
- Deduplicate by content hash, not only URL.
- Keep model-relative texture paths valid.
- Record failed downloads, redirects, authentication requirements, CORS limitations, and signed URL expiry.
- Do not invent an asset path that was not verified.
- Prefer local assets for the final clone so the scene does not depend on the original host.
- Optimize only after the faithful baseline works. Keep originals during QA.

## 4. Canvas and Layering Map

Save `docs/research/3D_CANVAS_MAP.md`.

For every canvas or 3D custom element, record:

- DOM selector and parent hierarchy;
- CSS and backing dimensions;
- fixed, sticky, absolute, or flow positioning;
- z-index relative to HTML overlays;
- clipping container and border radius;
- opacity, blend mode, masks, filters, and compositing;
- pointer-events behavior;
- viewport coverage and section ownership;
- whether one canvas spans multiple page sections;
- whether HTML labels track projected 3D positions;
- whether the scene pauses off-screen or while the tab is hidden;
- behavior after resize, orientation change, and DPR change.

A page-wide fixed canvas with scrolling DOM overlays must not be rebuilt as separate canvases per section unless evidence shows that is equivalent.

## 5. Scene State Capture Protocol

Create deterministic checkpoints for every meaningful scene.

### Required Checkpoints

At minimum capture:

- initial load before interaction;
- settled load after assets and entrance animation complete;
- scroll progress: 0%, 25%, 50%, 75%, and 100% through the scene-controlled range;
- every major named narrative beat;
- pointer at center and at each meaningful hotspot;
- hover and active states;
- drag start, midpoint, and release where drag controls exist;
- desktop, tablet, and mobile layouts;
- reduced-motion mode when the target supports it;
- fallback state when WebGL is unavailable, when observable.

For time-driven scenes, also capture fixed elapsed times such as 0 ms, 250 ms, 500 ms, 1000 ms, and the loop boundary.

### Checkpoint Record

Save each state in `docs/research/3D_TIMELINE.md`:

```markdown
## HeroScene / checkpoint-03
- Evidence: measured
- Viewport: 1440 × 900
- DPR: 1
- URL: ...
- Page scrollY: 1680px
- Scene progress: 0.50
- Pointer: x=0.00, y=0.00 normalized
- Elapsed time after settling: 1200ms
- Visible objects: ProductBody, RingA, RingB
- Camera observation: approximately front-right, slight downward pitch
- DOM state: headline step 2 active
- Screenshot: docs/design-references/3d/hero-desktop-p050.png
- Notes: RingB crosses behind body; bloom intensity increases.
```

Do not use vague labels such as “middle of animation.” Record the trigger and normalized progress.

## 6. Interaction Model Matrix

Save `docs/research/3D_INTERACTIONS.md`.

Test these inputs independently and in combination:

| Input | Questions to answer |
| --- | --- |
| Scroll | Does it move the camera, objects, shader uniforms, HTML, or all of them? Is progress scrubbed or eased? |
| Wheel | Is wheel intercepted? Does it control orbit, zoom, or page scroll? |
| Pointer move | Does the scene use normalized device coordinates, velocity, smoothing, or parallax? |
| Hover | What is the hit target? Is raycasting per object or screen region? |
| Click/tap | Does it select, explode, navigate, focus, or trigger a timeline? |
| Drag | Is it orbit, object rotation, pan, spring motion, or a custom constraint? |
| Pinch | Does mobile support zoom or is browser zoom preserved? |
| Keyboard | Are arrows, WASD, Escape, Space, or Tab meaningful? |
| Device orientation | Does mobile tilt affect the scene? Is permission requested? |
| Time | What continues without user input? What pauses off-screen? |
| Resize | Is camera FOV, distance, object scale, renderer size, or composition changed? |

For each interaction, record:

- input region;
- activation threshold;
- affected camera/object/uniform/DOM state;
- raw-to-scene mapping;
- damping or easing;
- duration;
- constraints;
- cancellation and reset behavior;
- mobile differences;
- accessibility/reduced-motion behavior.

## 7. Scene Inventory

Create one file per scene:

`docs/research/scenes/<SceneName>.scene.spec.md`

Use this template:

```markdown
# <SceneName> Scene Specification

## Identity
- Target component: `src/components/three/<SceneName>.tsx`
- Canvas owner: `src/components/<SectionName>.tsx`
- Engine detected: <Three.js | R3F | Spline | Babylon | PlayCanvas | custom | unknown>
- Reconstruction engine: <chosen stack>
- Evidence confidence: <high | medium | low>

## Reference Conditions
- Viewports: ...
- DPR values: ...
- Screenshots: ...
- Timeline: `docs/research/3D_TIMELINE.md#...`

## Canvas and Renderer
- Context: <WebGL1 | WebGL2 | WebGPU | unknown>
- Alpha: ...
- Antialias: ...
- Premultiplied alpha: ...
- Power preference: ...
- Output color space/tone mapping: ...
- Exposure: ...
- Clear color/alpha: ...
- Shadow map: ...
- DPR policy: ...
- Resize behavior: ...

## Camera
- Type: <perspective | orthographic>
- FOV/zoom: ... [evidence label]
- Near/far: ...
- Position by checkpoint: ...
- Target/look-at by checkpoint: ...
- Responsive changes: ...
- Control/damping behavior: ...

## Scene Graph
### <ObjectName>
- Source asset or primitive: ...
- Position/rotation/scale by checkpoint: ...
- Parent/children: ...
- Visibility rules: ...
- Render order/layers: ...
- Geometry notes: ...

## Materials
### <MaterialName>
- Type: ...
- Maps: ...
- Base color: ...
- Roughness/metalness/transmission/IOR/thickness: ...
- Emissive/opacity/blending/depth flags: ...
- Custom shader uniforms: ...
- Evidence label for each non-obvious value: ...

## Lighting and Environment
- Ambient/hemisphere lights: ...
- Directional/point/spot/area lights: ...
- Environment map/background: ...
- Shadow setup: ...
- Fog: ...

## Post-Processing
- Composer/effect chain order: ...
- Bloom: ...
- Depth of field: ...
- SSAO/GTAO: ...
- Chromatic aberration/noise/vignette/LUT: ...
- Responsive/performance disable rules: ...

## Animation
- Model clips: ...
- Procedural animation: ...
- Scroll timeline mapping: ...
- Easing/damping: ...
- Loop and reset behavior: ...
- Seeded randomness policy: ...

## Interaction and Raycasting
- Hit targets: ...
- Pointer mapping: ...
- Hover/click/drag behavior: ...
- Cursor and HTML response: ...
- Touch behavior: ...

## DOM Synchronization
- HTML overlays: ...
- Scroll sections controlling this scene: ...
- Projected labels/anchors: ...
- Z-index and pointer-event contract: ...

## Assets
- Manifest entries: ...
- Decoders/loaders: ...
- Preload order: ...
- Loading state: ...
- Failure fallback: ...

## Performance and Lifecycle
- Target devices: ...
- DPR cap: ...
- Expected draw calls/triangles when measurable: ...
- Texture-size limits: ...
- Pause/off-screen policy: ...
- Disposal policy: ...
- Context-loss recovery: ...

## Responsive Composition
- Desktop: ...
- Tablet: ...
- Mobile: ...
- Reduced motion: ...
- No-WebGL fallback: ...

## Acceptance Checkpoints
- [ ] Initial frame matches
- [ ] Settled frame matches
- [ ] Scroll checkpoints match
- [ ] Pointer/hover/drag states match
- [ ] Mobile composition matches
- [ ] No WebGL console errors
- [ ] Performance budget passes

## Known Gaps
- ...
```

## 8. Engine and Reconstruction Strategy

Choose the implementation from evidence and scene complexity:

### Preserve an Existing Embed

Use an official Spline or `<model-viewer>` embed only when:

- the target itself uses that embed;
- the scene package is legally and technically reusable;
- the embed exposes the required interaction and responsive behavior;
- external dependency and loading behavior are acceptable.

Do not rebuild an embedded scene in R3F merely to use a preferred stack.

### React Three Fiber + Drei

Prefer R3F when:

- the project is React/Next.js;
- the scene must synchronize closely with React state and DOM sections;
- component-level ownership improves maintainability;
- the original effect can be reproduced without relying on engine-private behavior.

### Plain Three.js

Prefer plain Three.js when:

- fine-grained render-loop or lifecycle control is needed;
- the original uses imperative scene management;
- React reconciliation adds unnecessary complexity;
- a custom renderer/effect pipeline is easier to port directly.

### Shader or Procedural Reconstruction

Use custom shaders or procedural geometry when the source asset/effect is inaccessible. Match the observable output across checkpoints and clearly mark approximated values.

### Video or Image Fallback

A video/image may be used only as:

- a no-WebGL fallback;
- a reduced-motion fallback;
- a temporary loading poster;
- an explicitly approved fidelity downgrade.

It must not silently replace the primary interactive scene.

## 9. Next.js Integration Rules

- Keep WebGL scene components behind a client boundary.
- Dynamically import browser-only scene code where appropriate.
- Avoid reading `window`, `document`, WebGL APIs, or device properties during server rendering.
- Use a stable canvas container size to prevent layout shift.
- Preload only assets needed for the first scene state.
- Show a real loading state or poster while heavy assets decode.
- Dispose geometries, materials, textures, render targets, controls, observers, and event listeners on unmount.
- Cap DPR rather than blindly using the device's maximum DPR.
- Pause or reduce rendering when the canvas is off-screen, the document is hidden, or reduced motion is enabled, provided this matches the target.
- Keep DOM overlays accessible even when the scene is decorative.
- Do not add a large 3D dependency until the target proves it is needed.

## 10. Visual QA Replay

For every reference checkpoint:

1. Use the same viewport dimensions.
2. Set the same DPR when the browser supports it.
3. Reload from a clean state.
4. Wait for the same readiness condition, not an arbitrary delay alone.
5. Set the exact scroll position or normalized scene progress.
6. Set the pointer/touch state.
7. Freeze or seed time-dependent randomness.
8. Capture the original and clone.
9. Run image comparison with a tolerance appropriate for GPU rasterization.
10. Inspect the diff manually for silhouette, camera, occlusion, material, lighting, and compositing errors.

### Diagnose Differences in This Order

1. canvas size and DPR;
2. camera projection and framing;
3. object transforms and visibility;
4. geometry silhouette;
5. material color-space and tone mapping;
6. lights, environment, and shadows;
7. post-processing order and intensity;
8. transparent compositing and HTML overlays;
9. timing, easing, and damping;
10. low-level antialiasing differences.

Do not tune shader noise or bloom while the camera framing is still wrong.

## 11. Behavior QA Replay

Create `docs/research/3D_QA_RESULTS.md` and test:

- scroll forward and backward through every timeline boundary;
- rapid scroll and direction reversal;
- pointer enter/leave and movement at edges;
- repeated clicks/taps;
- drag cancellation and release outside the canvas;
- resize during animation;
- mobile rotation where possible;
- tab visibility pause/resume;
- route away and back to detect leaked render loops;
- asset failure and slow loading;
- WebGL context loss/recovery where feasible;
- `prefers-reduced-motion`;
- keyboard focus and DOM control usability.

## 12. Performance QA

Record performance at desktop and mobile-sized viewports after the faithful baseline is complete.

Measure when tooling allows:

- average and worst frame time;
- dropped frames during the heaviest transition;
- renderer draw calls, triangles, points, and lines;
- texture dimensions and total transferred bytes;
- model and decoder transfer size;
- initial scene-ready time;
- JavaScript added by the 3D stack;
- memory growth after repeated mount/unmount;
- render activity while off-screen or hidden.

### Default Guardrails

These are guardrails, not reasons to reduce fidelity before measuring:

- cap DPR on high-density displays;
- avoid unbounded shadow-map and render-target sizes;
- avoid loading every scene asset before first paint;
- avoid a permanent 60 FPS loop for a scene that is fully static;
- prefer compressed textures and geometry only after validating visual parity;
- provide a mobile composition rather than merely shrinking desktop 3D;
- remove console errors, shader compile failures, and missing-texture warnings.

## 13. Builder Task Boundaries

Do not give one agent “build the whole 3D website.” Split work by responsibility:

- asset and loader pipeline;
- scene graph and materials;
- camera and scroll timeline;
- interactions and raycasting;
- post-processing;
- DOM/canvas composition;
- responsive and fallback behavior;
- visual/performance QA.

A scene builder must receive the complete scene specification inline, exact asset paths, reference screenshots, timeline checkpoints, and acceptance criteria.

## 14. Common Failure Modes

Reject these results:

- matching only the initial screenshot;
- a flat video replacing interactive 3D;
- guessed camera movement with no measured checkpoints;
- correct model but wrong environment map or tone mapping;
- desktop scene simply scaled down on mobile;
- HTML overlays drifting from 3D anchors;
- random particles producing non-repeatable QA without a fixed seed;
- render loop continuing after unmount;
- DPR set directly to `window.devicePixelRatio` without a cap;
- huge models/textures loaded before first meaningful paint;
- inaccessible click targets caused by canvas pointer-event mistakes;
- hidden WebGL/shader errors ignored because the screenshot looks close;
- proprietary assets hotlinked from the source site;
- “exact” claims based only on visual inference.

## 15. Completion Criteria

A 3D clone is complete only when:

- `3D_DETECTION.json`, `3D_ASSET_MANIFEST.json`, `3D_CANVAS_MAP.md`, `3D_INTERACTIONS.md`, and `3D_TIMELINE.md` exist;
- every 3D scene has a scene spec;
- all primary interactions are reproduced;
- desktop, tablet, and mobile checkpoints were compared;
- visual differences are documented and either fixed or listed as known gaps;
- WebGL errors and resource failures are absent;
- loading, reduced-motion, and no-WebGL behavior are defined;
- performance and lifecycle checks pass or remaining limitations are explicit;
- the production build succeeds.
