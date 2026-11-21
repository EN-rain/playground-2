# Samsy Original — Full 3D Reconnaissance V2

## Purpose

This second reconnaissance pass was performed because the first clone treated `cyberfix.glb` as one small scene and did not prove that the original world had been inspected from enough camera angles. The new pass does not assume a percentage from visual impression. It combines:

- original minified-bundle extraction;
- exact GLB geometry/accessor inspection;
- live runtime introspection;
- real left-mouse drag camera tests;
- wheel-zoom tests;
- horizontal orbit and vertical-pitch captures;
- long WASD movement legs with a full eight-angle orbit at each reached checkpoint;
- matching clone movement/orbit evidence;
- production QA and every-compositor-frame capture.

## Critical finding: the old world was architecturally wrong

The original does not render `cyberfix.glb` as one scene. Its `L40.kitify()` system treats the GLB as a reusable kit and uses the `C40` instance map to place individual items throughout the world.

Source extraction found:

- **17 kit item types**;
- **35 Explore instances**;
- per-instance scales ranging from **1.0 to 73.9219**;
- instance positions extending hundreds of world units;
- original Explore bounds, using the original raw-child-geometry instancing rule:
  - X: **-971.2038 to 614.1583**;
  - Y: **-7.7117 to 1033.0743**;
  - Z: **-937.1271 to 744.9971**;
  - width: **1585.3621**;
  - depth: **1682.1241**.

The old clone instead rendered the full GLB once at `0.31×`, with approximate dimensions:

- width: **49.73**;
- depth: **81.08**.

Therefore the old clone world was approximately:

- **3.14% of the original width** (`1 / 31.88`);
- **4.82% of the original depth** (`1 / 20.75`).

The user’s visual estimate of roughly 30% was directionally useful for a few raw `1×` kit items, but it understated the error for most nearby central structures. Examples from the original instance map:

| Nearby instance | Original scale | Old `0.31×` clone as % of intended scale |
| --- | ---: | ---: |
| `tower` | 1.5848 | 19.56% |
| `wall_0` | 3.2109 | 9.65% |
| `distributor_1` | 1.6757 | 18.50% |
| `crossing_0` | 1.0280 | 30.16% |
| `buildingramp` | 1.5251 | 20.33% |
| `block_0` | 3.0456 | 10.18% |
| `crossing_1` | 3.8570 | 8.04% |

## Exact original instancing behavior

The source bundle shows that `kitify()` does not preserve the GLB root-node transform or direct-child node transform. It:

1. treats each scene root as a kit item;
2. extracts each direct child’s raw geometry;
3. discards that root/child authoring transform;
4. applies the `C40` position, Euler rotation, and scale through the custom instance wrapper.

This detail matters because many GLB roots and children contain large authoring translations. Ordinary `Object3D.clone()` placement retained those offsets and produced a visibly sparse, incorrectly positioned world even after the C40 map had been copied.

The rebuilt clone now follows the original raw-child-geometry rule.

## Original runtime controller and camera

Live runtime inspection exposed the original player and camera objects and verified:

- player spawn: approximately **(46.1583, 0.5, -180.2812)**;
- player radius: **0.5**;
- avatar scale: **1.65**;
- desktop camera FOV: **60°**;
- camera far plane: **800**;
- orbit-camera distance: approximately **8.3** in the live frame;
- orbit `maxDistance`: **8**;
- orbit polar-angle range: **0.75 to 2.5 radians**;
- zoom enabled;
- rotation enabled;
- pan disabled;
- damping factor: **0.1**.

The source controller constants also verify:

- base movement speed: **5**;
- acceleration rate: **1.2**;
- maximum speed multiplier: **3×**;
- deceleration rate: **3**;
- camera vertical offset: **1.8**;
- camera collision buffer: **0.2**;
- camera restore speed: **3**;
- jump altitude: **6**;
- time to jump apex: **0.34 s**;
- time to return to ground: **0.35 s**.

The original Explore fog transitions to approximately **700–800 world units**, not the dense exponential fog that the old miniature clone used.

## Mouse-look verification

The original was tested with separate input modes:

- moving the pointer without a pressed mouse button;
- left-button horizontal drag;
- right-button horizontal drag;
- left-button vertical drag;
- wheel in both directions.

Results:

- pointer-only movement did not provide the full orbit behavior;
- **left-button drag rotates the original camera**;
- W movement follows the heading established by the mouse drag;
- the camera remains approximately eight units from the avatar while moving;
- vertical drag changes pitch within the original polar limits;
- wheel zoom is enabled within the short original orbit range.

The earlier pointer-only “camera sweep” was therefore not sufficient evidence. The canonical frame script now performs a real left-button drag while moving.

## Original visual coverage

### Controls and spawn orbit

The first all-angle session captured **79 screenshots** covering:

- pointer-only corner sweeps;
- left- and right-button drag behavior;
- wheel directions;
- a 12-step spawn orbit;
- high- and low-pitch orbit samples;
- movement legs.

The movement portion after the extreme-pitch experiment was not used as spatial-coverage evidence because that pitch state contaminated subsequent frames. It remains archived for input-behavior evidence only.

### Clean movement/orbit session

A fresh original browser session then captured **64 clean screenshots** with normal pitch:

- spawn, near/far zoom, and eight-angle orbit;
- five movement legs;
- real mouse turns between movement legs;
- an eight-angle orbit at every reached checkpoint.

Measured player coverage:

- X: **-187.5066 to 143.6258**;
- Z: **-211.3389 to -33.5401**.

Nearest verified kit regions included:

- `tower`;
- `wall_0`;
- `distributor_1`;
- `crossing_0`;
- `buildingramp`;
- `barrier`;
- `block_0`;
- `crossing_1`.

The original run produced **0 console errors**. One `akira.webm` request was aborted by headless Chromium, but it did not block the world or invalidate the scene/camera evidence.

## Clone reconstruction performed from the recon

The Explore world was rebuilt to use:

- the exact **35-instance** source-extracted kit layout;
- raw direct-child geometry, matching original `kitify()` behavior;
- source positions, Euler rotations, and scales;
- original spawn coordinates;
- avatar scale **1.65**;
- camera FOV **60°**;
- camera distance **8**;
- horizontal and vertical left-drag orbit;
- camera-relative movement;
- source-derived acceleration and speed multipliers;
- source-derived jump profile;
- source-derived **700–800** fog range;
- camera raycasting with the original **0.2** collision buffer;
- mapped unlit city materials rather than ordinary physically lit building materials.

Current derived clone world bounds:

- X: **-970.20 to 613.16**;
- Z: **-936.13 to 744.00**.

These match the extracted original instance architecture within the expected geometry/bounding-box difference.

## Clone all-angle coverage

The rebuilt clone was exercised with the same clean 64-image pattern:

- spawn, zoom pair, and eight-angle orbit;
- five movement legs;
- mouse turns between legs;
- eight-angle orbit at every checkpoint.

Measured player coverage:

- X: **-40.30 to 46.16**;
- Z: **-180.28 to 179.67**.

Nearest verified kit regions included:

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

The clone run produced **0 console errors** and **0 failed requests**.

## Production verification

The standalone production bundle passes **42/42 browser checks**, including explicit assertions for the wet reflective grid floor, single-click free mouse-look, Escape release, and the previously documented world/controller behavior:

- 35-instance source layout;
- avatar scale 1.65;
- camera distance 8;
- FOV 60;
- fog 700–800;
- camera-relative W movement;
- W movement after horizontal mouse rotation;
- vertical mouse pitch;
- wheel zoom;
- full extracted world bounds;
- local assets only;
- no failed requests;
- no browser console errors;
- Works, About, mobile, reduced-motion, and no-WebGL behavior.

The canonical production traversal now uses the clone’s single-click pointer-lock free-look and captured:

- **1,133 compositor frames**;
- `Page.startScreencast` with `everyNthFrame: 1`;
- **51.322 seconds** of emitted frames;
- **45.337 ms** average emitted-frame interval;
- **38.958 ms** median interval;
- **0 console errors**;
- **0 failed requests**.

All **1,951 original compositor frames** are paired to normalized clone phase progress in `docs/research/samsy/FRAME_COMPARISON_V3.md`.

## Refreshed visual comparison

Using the same 1440×900 references and per-channel tolerance of 24:

| View | Current similarity |
| --- | ---: |
| Explore | **86.13%** |
| Works | **88.70%** |
| About | **94.26%** |

The Explore number improved after replacing the miniature single scene with the source-derived instance world. Pixel similarity still understates and overstates different aspects: it is sensitive to animation timing, original WebGPU shader response, reflections, and player/NPC poses.

## Remaining differences

The scale/layout defect is fixed. Remaining differences are primarily rendering-system differences:

- proprietary original WebGPU material and lighting nodes;
- exact reflective-floor and fog composition;
- original text-rendering and screen-occlusion shaders;
- proprietary character physics and camera-restoration solver;
- original multiplayer/network state;
- exact animated NPC/avatar materials and poses.

The reconstructed world is source-layout accurate, but it does not claim source-code, shader, or physics equivalence.

## Evidence index

Source-derived data:

- `docs/research/samsy/recon-v2/original-world-scale.json`
- `docs/research/samsy/recon-v2/original-instance-map.json`
- `docs/research/samsy/recon-v2/original-runtime.json`

Original recon reports:

- `docs/research/samsy/recon-v2/original-360-recon.json`
- `docs/research/samsy/recon-v2/original-movement-recon.json`

Clone recon report:

- `docs/research/samsy/recon-v2/clone-movement-recon.json`

Original images:

- `docs/design-references/original-recon-v2/`
- `docs/design-references/original-recon-v2/movement/contact-sheet.jpg`

Clone images:

- `docs/design-references/clone-recon-v2/movement/contact-sheet.jpg`
- `docs/design-references/world-frames/clone/contact-sheet.jpg`

Direct comparisons:

- `docs/design-references/original-recon-v2/original-vs-clone-spawn.jpg`
- `docs/design-references/original-recon-v2/original-vs-clone-checkpoints.jpg`

## Rights

This reconstruction and analysis are intended for local development, study, and authorized use. Original branding, copy, media, models, and other target assets remain the property of their respective owners.
