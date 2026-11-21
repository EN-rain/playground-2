# Samsy Clone — Final QA Handoff

## Status

The reconstruction is complete and runnable from:

```text
C:\Users\LENOVO\Desktop\Projectsss\samsy clone
```

Production commands:

```bash
npm run build
npm start
```

`npm run build` automatically prepares the standalone bundle by copying `public/` and `.next/static/` into `.next/standalone/`.

## Major V2 correction

The first Explore implementation rendered `cyberfix.glb` once at `0.31×`. The original site does not do that. Source extraction proved that it treats the GLB as a reusable kit and places **35 individual instances** with source-defined position, Euler rotation, and scale values.

The Explore implementation has been rebuilt to follow the original instancing architecture, including the original `kitify()` behavior of using each kit root’s direct-child raw geometry and discarding the GLB authoring transforms before applying the source instance transform.

Current source-derived world bounds:

- X: **-970.20 to 613.16**;
- Z: **-936.13 to 744.00**.

The old miniature scene was only about **3.14% of the original world width** and **4.82% of its depth**. Nearby central objects had commonly been rendered at only about **8–20%** of their source-defined scale.

The complete scale analysis is documented in:

- `docs/research/samsy/recon-v2/FULL_RECON.md`;
- `docs/research/samsy/recon-v2/original-world-scale.json`;
- `docs/research/samsy/recon-v2/original-instance-map.json`.

## Release verification

- `npm run lint` — passed with no warnings or errors.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run check` — passed.
- Static routes generated for `/`, `/works`, and `/about`.
- Standalone production server started successfully through `npm start`.
- Production browser QA — **42/42 checks passed**, including the wet reflective perspective grid, single-click free mouse-look, and Escape release.
- Failed runtime requests — **0**.
- Browser console errors — **0**.
- Explore luminance after grading — **50.12 mean / 41.01 median**, compared with the captured original's **53.43 mean / 43.15 median**.
- Billboard-region visual change over one second — **83.04%** of inspected pixels changed.

The machine-readable browser result is stored in:

- `docs/research/samsy/clone-qa.json`.

## Browser QA coverage

The production suite explicitly verifies:

- Explore initialization and one persistent WebGL canvas;
- original **35-instance** kit layout;
- original world-layout marker;
- original avatar scale **1.65**;
- original camera target distance **8**;
- original desktop FOV **60°**;
- original Explore fog range **700–800**;
- animated screen-material count and advancing billboard video time;
- camera-relative W movement;
- Shift sprint boost;
- W movement after a horizontal mouse drag;
- vertical mouse-drag pitch;
- wheel zoom in and out;
- source-derived full-world bounds;
- measured Space jump height and second-airborne-press double-jump;
- Works navigation and all 25 projects;
- keyboard project navigation;
- project-information open and close behavior;
- About navigation and bilingual content;
- live renderer statistics;
- local runtime assets only;
- direct `/works` and `/about` refreshes;
- mobile touch controls and viewport fit;
- reduced-motion behavior;
- no-WebGL fallback behavior.

## Full original reconnaissance

The second reconnaissance pass did not rely only on WASD.

It included:

- source-bundle extraction of the original instance map;
- GLB raw-geometry analysis;
- live player/camera introspection;
- pointer-only tests;
- real left-button horizontal drag;
- right-button drag verification;
- vertical left-button drag;
- wheel in both directions;
- 12-angle spawn orbit;
- high- and low-pitch samples;
- five movement legs with mouse turns;
- an eight-angle orbit at every clean movement checkpoint.

Captured original evidence:

- **79 control/orbit screenshots**;
- **64 clean movement/orbit screenshots**;
- clean original coverage:
  - X **-187.5066 to 143.6258**;
  - Z **-211.3389 to -33.5401**;
- verified nearby kit regions:
  - `tower`;
  - `wall_0`;
  - `distributor_1`;
  - `crossing_0`;
  - `buildingramp`;
  - `barrier`;
  - `block_0`;
  - `crossing_1`.

One extreme-pitch movement sequence was deliberately excluded from spatial-coverage claims because its pitch state contaminated later frames. It remains archived only as input-behavior evidence.

Original reports and images:

- `docs/research/samsy/recon-v2/original-360-recon.json`;
- `docs/research/samsy/recon-v2/original-movement-recon.json`;
- `docs/design-references/original-recon-v2/`;
- `docs/design-references/original-recon-v2/movement/contact-sheet.jpg`.

## Matching clone all-angle recon

The rebuilt clone was exercised with the same clean 64-image movement/orbit structure:

- spawn zoom pair;
- eight-angle spawn orbit;
- five movement legs;
- mouse turns between legs;
- eight-angle orbit at every checkpoint.

Measured clone coverage:

- X: **-40.30 to 46.16**;
- Z: **-180.28 to 179.67**.

Verified nearby kit regions:

- `tower`;
- `wall_0`;
- `distributor_1`;
- `crossing_0`;
- `buildingramp`;
- `crossing_1`;
- `mac`;
- `block_1`;
- `block_0`;
- `garbage`;
- `map`.

Result:

- console errors: **0**;
- failed requests: **0**.

Evidence:

- `docs/research/samsy/recon-v2/clone-movement-recon.json`;
- `docs/design-references/clone-recon-v2/movement/contact-sheet.jpg`;
- `docs/design-references/original-recon-v2/original-vs-clone-checkpoints.jpg`.

## Canonical frame-by-frame traversal

The production traversal now contains a real left-button mouse-drag phase while the avatar moves. It no longer uses pointer-only movement as a substitute for camera orbit.

Capture method:

```text
Chrome DevTools Protocol Page.startScreencast
everyNthFrame: 1
```

Current production result:

- total frames: **1,133**;
- duration: **51.322 seconds**;
- average emitted-frame interval: **45.337 ms**;
- median emitted-frame interval: **38.958 ms**;
- console errors: **0**;
- failed requests: **0**;
- mouse-look phase: `camera-sweep-forward`;
- input type: single-click `pointer-lock-sweep`.

Evidence:

- `docs/design-references/world-frames/clone/frames/`;
- `docs/design-references/world-frames/clone/frames.json`;
- `docs/design-references/world-frames/clone/summary.json`;
- `docs/design-references/world-frames/clone/contact-sheet.jpg`;
- `docs/research/samsy/WORLD_TRAVERSAL_QA.md`;
- `docs/research/samsy/FRAME_COMPARISON_V3.md`;
- `docs/research/samsy/frame-comparison-v3.json`.

## Refreshed visual comparison

Pixel comparison used 1440×900 checkpoints with a per-channel tolerance of 24.

| Mode | Similarity |
| --- | ---: |
| Explore | **86.13%** |
| Works | **88.70%** |
| About | **94.26%** |

The Explore score improved after replacing the miniature monolithic scene with the source-derived instance world. It remains sensitive to animation timing, player/NPC pose, original WebGPU shader response, fog, and floor reflections.

Final screenshots:

- `docs/design-references/final/`.

## Implemented Explore system

- source-extracted 35-instance city layout;
- raw-child-geometry instancing matching original `kitify()` behavior;
- verified original spawn;
- local VRM avatar at scale 1.65;
- 60° desktop camera FOV;
- eight-unit orbit camera;
- horizontal and vertical left-drag orbit;
- camera-relative movement;
- base speed 5 with source-derived acceleration to 3×;
- source-derived jump profile;
- wheel zoom;
- 700–800-unit linear fog;
- camera raycast collision with 0.2 clearance;
- map-driven unlit city materials;
- local models, textures, audio, fonts, videos, and SEO assets;
- mobile controls, reduced motion, and no-WebGL fallback.

## Known differences

The scale and layout defect is fixed. Remaining differences are mainly renderer and private-engine differences:

- proprietary original WebGPU material nodes;
- exact reflective-floor shader and fog composition;
- original screen/text occlusion treatment;
- exact character animation/material presentation;
- proprietary slope, step, capsule, and camera-restoration physics;
- multiplayer/network state.

The clone now follows the original world architecture and scale, but it does not claim source-code, shader, or physics equivalence.

## Workflow compliance

All 19 Markdown files from the upgraded clone workflow remain copied, reviewed, and accounted for. Their usage is documented in:

- `docs/research/MARKDOWN_USAGE.md`.

## Rights

The reconstruction is intended for local development, study, and authorized use. Original branding, copy, media, models, and other target assets remain the property of their respective owners.
