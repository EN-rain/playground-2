# SMSY Clone — Complete Zero-Context Agent Handoff

**Last updated:** 2026-08-01
**Project folder:** `C:\Users\LENOVO\Desktop\Projectsss\samsy clone`
**Original target:** `https://samsy.ninja/`
**Audience:** A new coding agent who knows nothing about this project or the previous conversation

---

## ⚠️ Read `progress.md` first — this document is partially superseded

Two things to know before reading further:

1. **This handoff's "Project folder" line above is not this folder.** It was
   written for the sibling directory `../samsy clone`, a different lineage
   of this project. You are most likely working in `cyberpunkprofile`
   (this folder). Confirm which folder the person means before assuming
   either handoff applies.
2. **Section 3's "Buildings must remain visible and physically solid" and
   Section 22's related "do not" items describing the 35-instance kit city
   are now intentionally superseded in `cyberpunkprofile`.** As of the
   current phase, that kit city (`cityRoot`) is deliberately hidden
   (`visible = false`) and stripped from collision while new custom
   buildings are designed — see `progress.md`'s "Archived / hidden things"
   table for the authoritative current state. That is not a regression of
   the rules below; it's a later, deliberate phase change. Everything else
   in this document (control scheme, camera model, floor shader accepted
   traits, billboard shader behavior, physics constants, QA workflow) is
   still generally useful background/history, just not necessarily
   reflecting the exact current numbers — cross-check against `progress.md`
   and the actual source before trusting specific counts ("44/44", "35
   instances", QA markers, etc.) as current.

When this document and `progress.md` disagree about current state,
**`progress.md` wins**. Update `progress.md` (not this file) after future
architecture changes; only touch this file for genuinely new zero-context
history worth preserving.

---

## 1. Read this before touching the code

This is an authorized local reconstruction of the SMSY portfolio site. It is not a normal static website clone. Its main feature is an explorable Three.js cybercity with:

- a third-person player;
- pointer-lock mouse look;
- camera-relative movement;
- sprint, jump, and double-jump;
- structural building collision and wall sliding;
- third-person camera obstruction handling;
- animated billboard materials;
- two persistent video planes;
- reflective masked pavement;
- selective bloom and custom post-processing;
- Explore, Works, and About routes.

The project has already gone through several incorrect implementations. Many visually convincing-looking shortcuts were tested and rejected. Do not restart from scratch and do not replace the current architecture with a single scene model or a screenshot-driven fake.

The current build is functional and materially closer to the original. The user currently estimates it at roughly **80% visual similarity**. That is a subjective progress estimate, not a verified pixel score. The remaining work is fidelity and edge-case behavior, not basic functionality.

---

## 2. Current headline status

As of the last verified production pass:

- ESLint passes.
- TypeScript passes.
- Next.js production build passes.
- Main browser QA passes **44/44**.
- Dedicated physics/camera QA passes **7/7**.
- Browser console errors: **0**.
- Actual failed runtime requests: **0**.
- The production server was stopped after verification.
- The Explore scene uses the source-extracted **35-instance** city layout.
- All source architectural instances are present.
- Structural building meshes now occlude bloom correctly.
- Building collision, wall sliding, and camera-wall contraction are active.
- The accepted floor shader is preserved.
- Widespread billboard diagonal/vertical sweep artifacts were removed.
- Four intentionally rotating source signs remain.

Latest runtime markers exposed by the canvas include:

```text
worldLayout = original-kit-instances
floorSurface = original-masked-reflector
floorGrid = dual-scale-reflection-mask
floorGridSpacing = 50-unit-macro-10-unit-fine
floorReflectorResolution = 0.75
postProfile = source-emissive-mrt-screen-blend-approximation
billboardShader = source-pcg-burst-panel-flicker-no-near-stripe
buildingMaterialProfile = source-height-faded-textures
bloomProfile = selective-emissive-screen-blend
bloomOcclusionProfile = source-depth-occluded-emissive
cameraSolver = third-person-sphere-sweep-v1
physicsProfile = structural-capsule-slide-3-substeps
avatarPresentation = source-vrm-red-owo7-face
```

---

## 3. Non-negotiable user requirements

Treat these as binding.

### Explore must be a real 3D world

The scene must remain traversable. It must not become:

- a video;
- a frame-sequence scroll effect;
- a fixed camera diorama;
- a static screenshot background;
- a one-model miniature scene.

### Mouse look must work like a normal third-person RPG

Desktop behavior:

```text
LMB once          Enter pointer-lock mouse look
Mouse movement    Turn and pitch without holding LMB
Escape            Release pointer lock
Wheel             Narrow-range zoom
WASD / arrows     Move relative to camera heading
Shift             Sprint
Space             Jump
Space in air      Double-jump
```

The user explicitly rejected click-and-drag as the normal viewing model.

### Mouse direction must not feel inverted

Current intended behavior:

- moving the mouse right turns the view right;
- moving the mouse left turns left;
- moving the mouse down looks down;
- moving the mouse up looks up.

### Floor requirements

The accepted floor is:

- black at its base;
- reflective;
- texture-masked;
- distorted by the original bump texture;
- dark where reflections are suppressed;
- non-emissive at all seam/grid-like boundaries.

Never add glowing cyan, purple, or red floor grids.

### Billboard requirements

Billboards must visibly animate, but must not show constant traveling diagonal or vertical bands. The final accepted behavior keeps:

- rare RGB glitches;
- subtle whole-panel flicker;
- actual video motion;
- four intended rotating signs.

It removes:

- widespread per-fragment world-height bands;
- near-camera world-space stripe sweeps;
- permanent RGB separation;
- continuous city-wide glitching.

### Buildings must remain visible and physically solid

Buildings must:

- render as dark structural masses behind and between signs;
- block billboard glow during the bloom pass;
- block player movement where appropriate;
- block and contract the camera where appropriate;
- not appear absent because bloom leaks through them.

---

## 4. Technology

### Core stack

- Next.js `16.2.1`
- React `19.2.4`
- TypeScript strict mode
- Three.js `0.185.1`
- `@pixiv/three-vrm`
- Tailwind CSS v4
- Playwright Core

### Three.js systems used

- `WebGLRenderer`
- `GLTFLoader`
- `VRMLoaderPlugin`
- `EffectComposer`
- `RenderPass`
- `ShaderPass`
- `UnrealBloomPass`
- `OutputPass`
- `Reflector`

### Next.js warning

This repository uses Next.js 16. The root `AGENTS.md` explicitly warns that this version may differ from older conventions. Before changing framework behavior, read the relevant docs under:

```text
node_modules/next/dist/docs/
```

---

## 5. Project structure and ownership

### Routes

```text
src/app/page.tsx          Explore route: /
src/app/works/page.tsx    Works route: /works
src/app/about/page.tsx    About route: /about
src/app/layout.tsx        Shared layout
```

### Main components

```text
src/components/samsy/SamsyExperience.tsx
src/components/samsy/CyberCityCanvas.tsx
```

#### `SamsyExperience.tsx`

Owns:

- route and mode state;
- Explore / Works / About navigation;
- loading and tutorial UI;
- sound state;
- ambient audio;
- Works project rail and project modal;
- About copy;
- mobile controls;
- no-WebGL fallback;
- UI overlays and renderer statistics.

#### `CyberCityCanvas.tsx`

Owns nearly all 3D behavior:

- renderer, scene, camera, fog, lights;
- post-processing and bloom;
- floor reflector;
- source world construction;
- billboards and video planes;
- VRM player and proxy NPCs;
- movement and jumping;
- structural collision;
- camera collision;
- runtime telemetry used by QA.

This file is large and sensitive. Make focused edits. Broad rewrites have repeatedly caused regressions.

### Source data

```text
src/data/samsy-world-layout.json
src/data/projects.json
src/types/samsy.ts
```

### Important runtime assets

```text
public/models/cyberfix.glb
public/models/owo7.vrm
public/textures/bump-floor_fxrdig.jpg
public/videos/works/akira.webm
public/videos/works/derivative.webm
public/videos/works/
public/audio/
public/images/
public/fonts/
```

### Main QA and recon scripts

```text
scripts/qa-samsy.mjs
scripts/qa-samsy-physics-camera.mjs
scripts/capture-world-frames.mjs
scripts/compare-world-frames.py
scripts/record-original-canvas-v5.mjs
scripts/record-clone-canvas-v5.mjs
scripts/recon-billboards-buildings-v5.mjs
scripts/recon-lighting-billboards-v4.mjs
scripts/recon-original-floor-v3.mjs
scripts/deep-recon-live.mjs
scripts/prepare-standalone.mjs
```

---

## 6. Original city reconstruction

### Do not render the GLB as one scene

`public/models/cyberfix.glb` is a reusable kit, not the complete city at one transform.

Source extraction found:

- **17 source kit keys**;
- **35 Explore instances**;
- source instance position, rotation, and scale for every placement;
- no key or transform mismatches between extracted original layout and `samsy-world-layout.json`.

A previous implementation rendered the full GLB once at approximately `0.31×`. That created a miniature, sparse world and must never be restored.

### Important kit-instancing behavior

The original custom instancing behavior effectively:

1. treats each top-level source item as a kit;
2. reads direct-child geometry;
3. does not preserve the GLB child authoring transform in the normal Three.js clone sense;
4. applies the extracted source instance transform to the reconstructed group.

The current clone deliberately follows this unusual behavior. Applying the GLB child translations again will misplace the city.

### Current verified counts

The runtime reports approximately:

```text
city instances:          35
screen instances:        35
non-screen surfaces:     18
source screen meshes:    24 in the GLB
active rotating screens: 4 in Explore
```

The 35 screen instances come from repeated source kit items.

---

## 7. Current floor implementation

The floor was deeply re-reconstructed from the original shader and bundle.

### What it is

- A black `25,000 × 25,000` horizontal plane.
- A Three.js `Reflector` rendered at `0.75×` viewport resolution.
- A dual-scale mask using `bump-floor_fxrdig.jpg`.
- Reflection UV distortion from the macro texture sample.
- Reflection removal from the macro red and fine green channels.
- Fogged and post-processed with the rest of the scene.

### Effective texture scales

```text
macro sample: UV × 500  ≈ 50-unit world pattern
fine sample:  UV × 2500 ≈ 10-unit world pattern
```

### Current WebGL compensation

The original WebGPU floor used a lower nominal emission multiplier. The clone currently uses a `0.78` factor to compensate for the darker WebGL reflection path.

### What the dark lines are

They are not explicit tile geometry and not emissive grid lines. They are areas where the mask suppresses reflection, leaving the black floor visible.

### Do not reintroduce

- procedural slabs;
- random per-tile roughness;
- visible purple tile color;
- animated puddle sine waves;
- glowing `GridHelper` lines;
- a second floor overlay;
- arbitrary blur convolution;
- a lowered global floor.

---

## 8. Current billboard system

The billboard system went through multiple recon passes. The current profile is intentionally a WebGL compensation, not a byte-for-byte reproduction of the original WebGPU node graph.

### Screen detection

Only mesh names matching `/screen/i` receive the animated screen material.

Do not broaden this to every mesh containing terms such as `logo`, `writing`, `billboard`, or `holo`; that previously caused over-glitching and incorrect material assignment.

### Preserved original-like behavior

#### Rare PCG RGB burst

The source uses a PCG-style hash with an approximately 3.5% gate at 10 Hz:

```text
seed = floor(worldPosition.z + time × 10)
active when hash(seed) >= 0.965
```

When active, the material performs strong but brief RGB channel displacement and extra texture samples.

#### UV tint and alpha behavior

- source texture remains the main image;
- UV-derived color tint is retained;
- low-result alpha is discarded;
- materials remain unlit and participate in selective bloom.

#### Four physical rotating signs

Only four instantiated source items have active `screen_rotate` geometry in Explore. Their local pivots were inspected and are valid. They rotate around Y with source-like timing.

### Final compensation that removed widespread sweeps

The original node shader contains a hard per-fragment world-height flicker and a near-camera world-space stripe. In WebGL reconstruction, those produced widespread traveling diagonal, horizontal, and vertical bands across many screen orientations and reflections.

The final clone therefore:

- converts the spatial flicker into a subtle whole-panel pulse;
- uses the screen object's world origin rather than each fragment's world Y;
- smooths the brightness range to approximately `0.9–1.0`;
- removes the near-camera stripe entirely;
- preserves rare RGB bursts and the four intended rotations.

Current material cache key:

```text
smsy-source-screen-v6-panel-flicker
```

Current canvas marker:

```text
billboardShader = source-pcg-burst-panel-flicker-no-near-stripe
```

### Final billboard verification

The last standalone production recording contained:

```text
111 decoded frames over approximately 4.73 seconds
```

No traveling diagonal bands were visible across static billboard surfaces in the final contact sheet.

Evidence:

```text
docs/research/samsy/BILLBOARD_SWEEP_RECON_V6.md
docs/design-references/billboard-fx-diagnostics/production-final-panel-flicker.webm
docs/design-references/billboard-fx-diagnostics/production-final-contact.jpg
```

---

## 9. Video planes

Two persistent video planes are currently present.

### Decorative atmospheric plane

```text
source:   /videos/works/derivative.webm
position: (-550, 175, -350)
rotation: Y = π / 2
size:     approximately 622 × 350
```

This is a large side-world media plane and color source. It is not a generic texture assigned to every billboard.

### Persistent Works / CLONEX plane

```text
source:   /videos/works/akira.webm
position: (47, 25, -10)
rotation: Y = π
size:     94 × 50
```

Do not force this video to an arbitrary 8-second seek. The red CLONEX sequence occurs naturally earlier in the video. Recon scripts may phase-lock it for comparison, but runtime code should let it play normally.

---

## 10. Buildings, materials, and bloom depth

### Structural material rule

Non-screen meshes retain their authored maps and use the source-derived height fade:

```text
surface.rgb *= 0.3 × smoothstep(0, 20, worldY)
```

They should remain very dark but still form visible architectural masses.

### Why buildings previously looked missing

The geometry was present, but the selective bloom pass originally rendered only emissive layers. Non-emissive building meshes wrote no depth in that pass, so signs behind them bled through as though the buildings did not exist.

### Current fix

During the bloom pass:

- emissive objects render normally;
- non-emissive meshes are temporarily replaced with black depth-writing occluder materials;
- transparent/alpha-tested cutouts preserve their maps and alpha behavior;
- original materials are restored immediately after the bloom render.

Current marker:

```text
bloomOcclusionProfile = source-depth-occluded-emissive
```

Do not remove this depth-occluder pass. It is essential to visible black rectangular building massing.

---

## 11. Lighting and post-processing

### Renderer

```text
WebGLRenderer
outputColorSpace = SRGBColorSpace
toneMapping = NoToneMapping
exposure = 1
scene background = #17101c
fog = #17101c from 700 to 800
```

### Selective bloom

Current bloom pass:

```text
strength = 0.34
radius = 0.27
threshold = 0
```

The clone approximates the original emissive MRT using layers plus black depth occluders.

### Final composite

The final compositor uses:

- screen blending rather than simple additive bloom;
- red-biased WebGL bloom compensation;
- horizontal vignette;
- physical-resolution scanlines;
- black/white point and per-channel display curve;
- `OutputPass` for proper output color conversion.

Removing `OutputPass` causes a major color-space bug and crushes mids.

### Current small scene lights

The scene includes low-intensity hemisphere, red, cyan, and magenta lights. These support the avatar and local atmosphere; they are not supposed to replace billboard-driven lighting.

---

## 12. Player and avatar presentation

### Player

```text
spawn = (46.1582639071556, 0, -180.28122830433472)
player radius = 0.5
VRM scale = 1.65
```

The player loads `/models/owo7.vrm` and retains a fallback avatar if loading fails.

### Face

The foreground avatar uses a dark body (`0x24242c`) with an emissive red face overlay (two sphere eyes + zigzag mouth, both `0xff0000`, plus a red `PointLight` halo `0xff003d`), matching the original's dark obake silhouette with glowing red eyes. The `faces8.png` atlas is not mapped to the face mesh — its top-left cell (two eyes + zigzag) is reproduced geometrically and tinted red to match the original's emissive glow.

### Remote avatars

The original networked avatars cannot be reproduced exactly without the original multiplayer state and character system. The clone uses lightweight cat-shaped proxies to avoid the severe FPS cost of cloning full skinned VRMs.

Current compromise:

- dark-red bodies;
- bright face cores;
- ten lightweight proxies;
- slow local facing and subtle bobbing.

These are still an approximation and remain a visual fidelity target.

---

## 13. Movement and physics

### Current constants

```text
base movement speed          5
max acceleration multiplier  3
acceleration rate            1.2
deceleration rate            3
sprint boost                 2
physics substeps             3
maximum jumps                2
coyote time                  0.1 s
player radius                0.5
collision skin               0.055
slide iterations             3
```

### Structural collision

The current player solver uses real building/base meshes, not only a single ramp collider.

Behavior:

- movement is split into three physics substeps;
- capsule-height rays test structural meshes;
- movement stops at contact;
- remaining movement is projected along the wall for sliding;
- repeated correction avoids tunneling and corner jitter;
- ramps remain walkable ground where appropriate.

Current marker:

```text
physicsProfile = structural-capsule-slide-3-substeps
```

### Verified tower test

The dedicated regression verifies:

- the player stops at the source tower wall around `x ≈ 129.93`;
- holding into the wall does not tunnel or jitter;
- diagonal input slides around the tower corner.

### Important limitation

This is still not the original proprietary capsule/physics implementation. Exact route behavior may differ in untested districts, especially around slopes, narrow corners, and overlapping kit geometry.

---

## 14. Third-person camera

The camera was rebuilt into a proper third-person controller.

### Current behavior

- stable pivot above the player;
- yaw and pitch targets;
- vertical angle clamp;
- pointer-delta clamp;
- rotation damping;
- camera-relative movement;
- narrow source-like wheel zoom range;
- camera-wall contraction;
- smooth restoration after obstruction.

### Current constants

```text
camera target height          1.8
camera collision clearance    0.12
camera collision radius       0.32
minimum obstruction distance  0.72
default camera distance       8.38
normal zoom range             7.95 to 8.40
camera restore speed          6
camera position damping       18
camera target damping         22
pointer max delta             80
initial elevation            -0.12
```

### Obstruction solver

The camera uses a multi-ray sphere-sweep approximation between the target and desired camera position. When a wall blocks the camera:

- the resolved camera distance contracts immediately;
- it may go below the normal wheel-zoom minimum;
- once clear, it restores smoothly toward the desired distance.

Current marker:

```text
cameraSolver = third-person-sphere-sweep-v1
```

### Verified wall test

The dedicated regression verifies:

- camera contracts from about `8.38` to about `0.72` at the tower wall;
- camera restores smoothly to about `8.38` after clearing it;
- it does not snap through the building.

---

## 15. UI and routes

### Explore

- 3D scene and player;
- identity copy;
- control guide;
- renderer statistics;
- audio state;
- mobile controls;
- no-WebGL fallback.

### Works

- all 25 project entries;
- keyboard navigation;
- project information modal;
- extracted project copy and media.

### About

- bilingual content;
- preserved contact link;
- direct route survives refresh.

### Known UI mismatch

The clone UI is functional but still differs from the original in exact scale, placement, music-player presentation, and some bottom-corner controls. UI fidelity is a separate remaining task from the 3D renderer.

---

## 16. Progress history and major corrections

This is the condensed history a new agent needs to understand why the current architecture exists.

### Early incorrect state

- rendered one GLB at `0.31×`;
- miniature sparse city;
- wrong camera model;
- no faithful route behavior;
- fake glowing floor grid;
- screen/video assignments broadly guessed.

### World reconstruction

- extracted 17 kit types and 35 source instances;
- reproduced the original unusual direct-child geometry instancing;
- restored full world scale and footprint.

### Floor reconstruction

- removed procedural purple slabs and random puddles;
- extracted original dual-scale reflection mask;
- restored black masked reflector at 0.75 resolution;
- preserved dark non-emissive seams.

### Lighting reconstruction

- removed ACES tone mapping;
- recreated selective emissive bloom approximation;
- added screen-blend composite and `OutputPass`;
- corrected fog/background and scanline scaling;
- calibrated channel response to the supplied original capture.

### Screen reconstruction

- stopped assigning one cyan video to most screens;
- restored authored atlas textures;
- added rare PCG RGB burst;
- restored video planes at extracted transforms;
- narrowed animated material routing to actual `screen` meshes.

### Building visibility correction

- confirmed all 35 instances and 18 surfaces existed;
- discovered missing bloom-pass depth;
- added black depth occluders so buildings block signs and glow.

### Physics/camera correction

- added structural building collisions;
- added capsule-style wall sliding;
- replaced snapping camera correction with third-person sphere sweep;
- verified tower wall stop, slide, camera contraction, and restoration.

### Billboard sweep correction

- audited all 35 screen instances;
- separated rare RGB glitch, spatial flicker, near stripe, and physical rotations;
- replaced per-fragment spatial flicker with subtle panel flicker;
- removed near-camera stripe;
- preserved four intended rotating signs;
- production video review showed no widespread traveling bands.

---

## 17. Current verification commands

### Static verification

```powershell
npm run lint
npm run typecheck
npm run build
```

Or:

```powershell
npm run check
```

### Development server

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3004
```

### Production server

```powershell
npm run build
$env:HOSTNAME="127.0.0.1"
$env:PORT="3003"
node .next/standalone/server.js
```

### Main QA

```powershell
$env:SAMSY_CLONE_URL="http://127.0.0.1:3003/"
node scripts/qa-samsy.mjs
```

Expected current result:

```text
44/44 passed
```

### Physics/camera QA

```powershell
$env:SAMSY_CLONE_URL="http://127.0.0.1:3003/"
node scripts/qa-samsy-physics-camera.mjs
```

Expected current result:

```text
7/7 passed
```

### Frame capture and comparison

```powershell
$env:SAMSY_CLONE_URL="http://127.0.0.1:3003/"
node scripts/capture-world-frames.mjs clone
python scripts/compare-world-frames.py
```

### Five-second canvas recording

```powershell
$env:SAMSY_CLONE_URL="http://127.0.0.1:3003/"
node scripts/record-clone-canvas-v5.mjs
```

---

## 18. QA coverage

The main QA currently covers:

- Explore initialization;
- one persistent WebGL canvas;
- original 35-instance layout;
- floor markers;
- billboard shader profile;
- building/screen mesh presence;
- structural collision and camera solver markers;
- advancing videos;
- camera-relative W movement;
- pointer-lock activation and release;
- correct horizontal and vertical mouse direction;
- narrow zoom range;
- sprint profile;
- jump and double-jump;
- Works navigation and all 25 projects;
- project modal;
- About route and content;
- runtime stats;
- local assets;
- direct-route refresh;
- mobile controls;
- reduced motion;
- no-WebGL fallback;
- console and request failures.

The dedicated physics/camera QA covers:

- tower collision face;
- no tunneling or jitter;
- wall sliding;
- camera contraction;
- smooth camera restoration;
- console errors;
- request failures.

### Known flaky condition

A rare 90 ms double-jump telemetry timing race occurred once during development. A clean rerun passed. Do not change physics because of one isolated telemetry sample unless the behavior itself reproduces visibly or repeatedly.

### Media request note

Playwright may occasionally report `net::ERR_ABORTED` for media during route navigation. The QA intentionally ignores canceled media requests only when they are browser navigation cancellations. Missing files or real network failures must still fail.

---

## 19. Evidence hierarchy

When evidence conflicts, use this order:

1. Fresh live original runtime or production bundle.
2. Valid original WebGPU canvas recordings.
3. Supplied original screenshots.
4. Extracted original transforms and shader snippets.
5. Current clone production recordings.
6. Automated numeric metrics.
7. Visual guesses.

### Invalid evidence to reject

Do not use:

- black WebGPU screenshots from failed headless canvas capture;
- tutorial-overlay frames;
- screenshots labeled as 100 ms apart when screenshot encoding actually took over a second;
- a single random video phase to tune global lighting;
- whole-frame RGB averages as proof of spatial similarity.

### Better capture method

For WebGPU original motion, `HTMLCanvasElement.captureStream()` produced valid recordings where Playwright screenshots often returned a black canvas.

---

## 20. Important research documents

Read these before changing their subsystem.

```text
docs/research/samsy/BILLBOARD_SWEEP_RECON_V6.md
docs/research/samsy/BILLBOARDS_BUILDINGS_DEEP_RECON_V5.md
docs/research/samsy/LIGHTING_BILLBOARD_RECON_V4.md
docs/research/samsy/ORIGINAL_VS_CLONE_COMPARISON_V5.md
docs/research/samsy/FRAME_COMPARISON_V3.md
docs/research/samsy/WORLD_TRAVERSAL_QA.md
docs/research/samsy/CHARACTER_DEEP_RECON.md
docs/research/samsy/original-floor-v3.json
docs/research/samsy/deep-recon-live/
docs/research/samsy/billboards-buildings-v5/
```

Important visual evidence:

```text
docs/design-references/billboard-fx-diagnostics/
docs/design-references/billboards-buildings-v5/
docs/design-references/lighting-billboards-v4/
docs/design-references/original-floor-v3/
docs/design-references/camera-physics-debug/
docs/design-references/building-mass-debug/
docs/design-references/frame-comparison-v3/
```

---

## 21. Current known limitations

### Not engine-identical

The original uses proprietary WebGPU node materials, renderer internals, multiplayer state, and physics behavior. The clone is a WebGL/Three.js approximation.

### User-estimated visual progress

The user currently considers the scene roughly **80%** of the original. Do not claim 90%+ based only on global color histograms.

### Exact camera composition

The original camera has unusual runtime orientation behavior. Foreground avatar screen position and some screenshot composition may still differ even when the controller feels correct.

### Remote avatars

NPCs are lightweight proxies, not exact original network avatars.

### Local browser recon connectivity (as of 2026-08-02)

The local Auvrynt Playwright browser could not reach `https://samsy.ninja/` at
all in this session — `page.goto` timed out at 15s even with
`waitUntil: domcontentloaded`, which should resolve almost instantly on a
healthy connection. A server-side fetch of the same URL succeeded immediately
and returned normal HTML, so the site itself is up; this points to a local
network/DNS/firewall/VPN condition scoped to the machine or to headless
browser traffic specifically. Before attempting any fresh live recon, verify
`samsy.ninja` loads in an ordinary browser on the same machine, then check for
anything that would block automated/non-interactive browser traffic. See
`docs/research/samsy/CHARACTER_DEEP_RECON.md` for the full note and a capture
plan to use once this is resolved.

### Screen content and timing

Some atlas/video phase, content assignment, and panel hierarchy may still differ from the original at particular times or viewpoints.

### Route parity

The tower regression is strong, but not every structure and district has a dedicated collision test. Route drift may remain in complex areas.

### UI fidelity

Music widget, exact typography scale, spacing, and corner controls remain less faithful than the 3D scene.

### Performance

The current proxy design avoids the worst VRM cost, but full-world post-processing, reflection, videos, and collision still require profiling on lower-end hardware and mobile.

---

## 22. Things a new agent must not do

1. Do not render `cyberfix.glb` once at `0.31×`.
2. Do not reapply GLB child transforms on top of source instance transforms.
3. Do not replace source layout with visually guessed buildings.
4. Do not lower the floor to expose more reflection.
5. Do not add emissive floor grids.
6. Do not require click-and-drag for normal desktop mouse look.
7. Do not invert mouse movement.
8. Do not remove structural meshes from player or camera collision without testing.
9. Do not remove black depth occluders from the bloom pass.
10. Do not assign `derivative.webm` to most city screens.
11. Do not broaden animated screen matching beyond actual `screen` mesh names without evidence.
12. Do not restore permanent RGB splitting.
13. Do not restore the per-fragment world-height flicker.
14. Do not restore the near-camera world-space stripe.
15. Do not remove the four rotating screens merely because they move; they are source-authentic.
16. Do not add many cloned skinned VRMs for NPCs without profiling.
17. Do not tune lighting from one random video frame.
18. Do not trust whole-frame mean RGB as proof of structural similarity.
19. Do not overwrite original recon archives without a backup.
20. Do not claim proprietary physics or WebGPU equivalence.
21. Do not commit from the parent repository without checking the Git root.
22. Do not stage unrelated sibling projects.

---

## 23. Recommended next work

Work in this order unless the user gives a more specific instruction.

### Priority 1 — Remaining structural visual gaps

Perform fixed-camera comparisons to find any dark building masses, support structures, or screen backplates still visually absent. Distinguish:

- missing geometry;
- correct geometry hidden by material darkness;
- incorrect depth/bloom occlusion;
- wrong video phase;
- camera composition differences.

Do not globally brighten all buildings.

### Priority 2 — Full-route collision validation

Add deliberate collision tests for several districts, not only the tower:

- narrow corridors;
- ramp bases;
- building corners;
- overlapping structures;
- high-speed sprint contacts;
- jump contacts;
- camera obstruction at angled surfaces.

Use exact player and camera telemetry.

### Priority 3 — Camera composition parity

Compare matched original/clone views for:

- player vertical placement;
- pivot height;
- pitch damping;
- wall restoration;
- zoom feel;
- wide mouse sweeps.

Do not break the current RPG control model.

### Priority 4 — Avatar and NPC fidelity

Improve the remote row and foreground silhouette without returning to expensive full VRM clones.

Potential work:

- per-proxy silhouette variation;
- size and spacing variation;
- better dark-red body values;
- individual face variants;
- source-like reflection visibility.

### Priority 5 — UI parity

Restore or refine:

- top-right music widget;
- exact logo scale;
- control guide layout;
- bottom-right signal button;
- bottom-left original control treatment;
- removal of clone-only UI where not present in the target.

### Priority 6 — Performance

After fidelity changes:

- profile frame time;
- inspect reflection cost;
- inspect bloom pass cost;
- inspect collision ray count;
- reduce per-frame allocations;
- test at mobile DPR;
- verify no decoder overload.

---

## 24. Safe workflow for every future change

1. Read the relevant recon document.
2. Start one server only after checking for stale project processes.
3. Capture the current state before editing.
4. Make one focused change.
5. Run `npm run typecheck`.
6. Run `npm run lint`.
7. Run the relevant targeted QA.
8. Run the full main QA.
9. Build production.
10. Run both QA suites against standalone production.
11. Record or screenshot the exact affected behavior.
12. Inspect images/video manually.
13. Update this handoff if architecture, constants, markers, QA counts, or known issues changed.

Do not use terminal PASS output as the only proof of visual quality.

---

## 25. Git and repository warning

The project folder currently appears as an untracked directory inside the larger parent repository:

```text
C:\Users\LENOVO\Desktop\Projectsss
```

The parent repository HEAD observed during this handoff was:

```text
1568f35 (origin/master) v1.0
```

The parent working tree contains many unrelated projects and untracked files. Therefore:

- verify the Git root before any Git operation;
- do not run broad `git add .` from the parent;
- do not stage unrelated sibling projects;
- consider creating a dedicated repository for `samsy clone` before committing.

---

## 26. Quick start for a new agent

Read in this order:

```text
AGENTS.md
SAMSY_AGENT_HANDOFF.md
README.md
src/components/samsy/SamsyExperience.tsx
src/components/samsy/CyberCityCanvas.tsx
docs/research/samsy/BILLBOARD_SWEEP_RECON_V6.md
docs/research/samsy/BILLBOARDS_BUILDINGS_DEEP_RECON_V5.md
docs/research/samsy/LIGHTING_BILLBOARD_RECON_V4.md
docs/research/samsy/ORIGINAL_VS_CLONE_COMPARISON_V5.md
```

Then:

```powershell
npm run check
npm run dev -- --hostname 127.0.0.1 --port 3004
```

Manually verify:

- LMB enters pointer lock;
- right mouse movement turns right;
- down movement looks down;
- Escape releases;
- W follows camera heading;
- sprint works;
- jump and double-jump work;
- wall collision stops the player;
- diagonal motion slides along walls;
- camera contracts at walls and restores smoothly;
- billboards animate without traveling bands;
- four small rotating signs still rotate;
- buildings visibly block billboard glow;
- floor remains black, wet, masked, and non-emissive.

---

## 27. Definition of done for the next milestone

A new fidelity milestone is complete only when:

- main QA remains **44/44** or higher;
- physics/camera QA remains **7/7** or higher;
- new behavior has a measurable regression test where practical;
- TypeScript, ESLint, and production build pass;
- no real failed requests occur;
- no browser console errors occur;
- the accepted floor remains unchanged unless the user specifically requests floor work;
- the RPG pointer-lock camera remains correct;
- buildings still occlude bloom;
- billboard bands do not return;
- the four intentional rotating signs remain unless original evidence disproves them;
- visual evidence shows a real improvement at matched camera/view/video phases;
- this handoff is updated.

---

## 28. Final current-state summary

The current project is a production-buildable Next.js/Three.js reconstruction of SMSY with a source-derived 35-instance city, authored screen textures, two extracted video planes, custom selective bloom, black depth occlusion, a source-derived masked reflective floor, a VRM player, lightweight network-avatar proxies, structural capsule-style wall collision, wall sliding, and a third-person sphere-sweep camera.

The latest major defect fixed was widespread moving diagonal/vertical billboard bands. The final screen shader keeps rare RGB glitches and subtle whole-panel activity while removing the objectionable spatial stripe systems. The latest production QA passed **44/44**, and the dedicated physics/camera suite passed **7/7**.

The next agent should continue with targeted fidelity work—remaining building massing, route-wide collision validation, camera composition, avatar/NPC presentation, and UI parity. Preserve the current world, floor, bloom-depth, physics, camera, and billboard architecture unless fresh original evidence proves a specific part wrong.
