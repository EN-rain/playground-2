# Frame-by-Frame and All-Angle World Traversal QA

## Why this audit exists

The earliest QA only established that W and Space produced a visible response. That was not enough for an explorable 3D world, and it did not detect that the clone had rendered the complete GLB once at `0.31×` instead of reconstructing the original source-defined instance world.

The current audit has two complementary tracks:

1. **all-angle fixed screenshots** with player positions, real mouse dragging, zoom states, and nearest kit-instance metadata;
2. **every-compositor-frame traversal** through Chrome DevTools Protocol.

The complete architecture and scale analysis is documented in:

- `docs/research/samsy/recon-v2/FULL_RECON.md`.

## Source-backed world architecture

The original bundle contains a `C40` instance map used by its kit-instancing system.

Extracted architecture:

- 17 kit item types;
- 35 Explore instances;
- per-instance scales from 1.0 to 73.9219;
- world bounds:
  - X `-971.2038 … 614.1583`;
  - Z `-937.1271 … 744.9971`.

The old one-scene clone was approximately:

- 3.14% of the original width;
- 4.82% of the original depth.

The current clone recreates the 35-instance layout and matches the original `kitify()` behavior by instancing each kit root’s direct-child raw geometry, discarding GLB authoring transforms, and applying the source instance transform.

## Original input and camera verification

The original was tested with:

- pointer movement without a button;
- left-button horizontal drag;
- right-button drag;
- left-button vertical drag;
- wheel in both directions;
- W movement before and after mouse rotation.

Verified behavior:

- left-button drag performs camera orbit;
- vertical drag changes pitch;
- W follows the mouse-established camera heading;
- camera distance remains close to eight units;
- wheel zoom is enabled;
- pointer-only movement is not an adequate substitute for the real drag interaction.

Verified live values:

- spawn approximately `(46.1583, 0.5, -180.2812)`;
- avatar scale `1.65`;
- player radius `0.5`;
- desktop FOV `60°`;
- camera maximum distance `8`;
- polar limits `0.75 … 2.5` radians;
- fog transition approximately `700 … 800` world units.

## Original all-angle evidence

### Control/orbit session

The first V2 session captured **79 screenshots**, including:

- pointer-only corner positions;
- real left and right drags;
- zoom directions;
- a 12-step horizontal orbit;
- high- and low-pitch orbit samples;
- movement attempts.

The later movement frames after the extreme-pitch experiment are not used as spatial-coverage evidence because the pitch state contaminated those views. This limitation is explicitly preserved rather than hidden.

Evidence:

- `docs/research/samsy/recon-v2/original-360-recon.json`;
- `docs/design-references/original-recon-v2/01-controls-contact-sheet.jpg`;
- `docs/design-references/original-recon-v2/02-spawn-orbits-contact-sheet.jpg`.

### Clean original movement/orbit session

A fresh original browser session captured **64 clean screenshots** at normal pitch.

Route structure:

1. spawn screenshot;
2. close and far zoom;
3. eight-angle spawn orbit;
4. 5-second forward leg;
5. eight-angle checkpoint orbit;
6. mouse turn and 5-second movement leg;
7. zoom pair and eight-angle orbit;
8. second mouse turn and 6.5-second leg;
9. eight-angle orbit;
10. third mouse turn and 6.5-second leg;
11. zoom pair and eight-angle orbit;
12. fourth mouse turn and diagonal movement leg;
13. final eight-angle orbit.

Measured coverage:

- X `-187.5066 … 143.6258`;
- Z `-211.3389 … -33.5401`.

Nearest verified kit regions:

- `tower`;
- `wall_0`;
- `distributor_1`;
- `crossing_0`;
- `buildingramp`;
- `barrier`;
- `block_0`;
- `crossing_1`.

Runtime result:

- console errors: 0;
- one aborted `akira.webm` request in headless Chromium;
- the aborted project video did not prevent or alter the Explore world evidence.

Evidence:

- `docs/research/samsy/recon-v2/original-movement-recon.json`;
- `docs/design-references/original-recon-v2/movement/contact-sheet.jpg`.

## Rebuilt clone all-angle evidence

The rebuilt production candidate was exercised with the matching **64-image** route.

Measured coverage:

- X `-40.30 … 46.16`;
- Z `-180.28 … 179.67`.

Nearest verified kit regions:

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

Runtime result:

- console errors: 0;
- failed requests: 0.

Evidence:

- `docs/research/samsy/recon-v2/clone-movement-recon.json`;
- `docs/design-references/clone-recon-v2/movement/contact-sheet.jpg`;
- `docs/design-references/original-recon-v2/original-vs-clone-checkpoints.jpg`.

## Canonical every-frame production traversal

Frames are captured through:

```text
Chrome DevTools Protocol Page.startScreencast
everyNthFrame: 1
```

This requests every compositor frame Chrome emits. Disk encoding and headless rendering can reduce the emitted frame rate, so it is evidence of capture cadence and state progression rather than a hardware 60 FPS benchmark.

Current route:

1. idle;
2. W for 6 seconds;
3. W+D for 4.5 seconds;
4. D for 3.5 seconds;
5. S+D for 4.5 seconds;
6. S for 6 seconds;
7. S+A for 4.5 seconds;
8. A for 3.5 seconds;
9. W+A for 4.5 seconds;
10. W+Space jump phase;
11. W movement combined with the clone’s **single-click pointer-lock mouse sweep**;
12. settle.

Current production result:

- total frames: **1,133**;
- duration: **51.322 seconds**;
- average emitted-frame interval: **45.337 ms**;
- median emitted-frame interval: **38.958 ms**;
- mouse phase: `camera-sweep-forward`;
- mouse input type: `pointer-lock-sweep`;
- console errors: **0**;
- failed requests: **0**.

Evidence:

- `docs/design-references/world-frames/clone/frames/`;
- `docs/design-references/world-frames/clone/frames.json`;
- `docs/design-references/world-frames/clone/summary.json`;
- `docs/design-references/world-frames/clone/contact-sheet.jpg`;
- `docs/research/samsy/clone-qa.json`.

## Production QA relationship

The frame traversal is supplemented by **42/42 production browser checks**, including the wet floor with dark non-emissive seams, single-click free mouse-look, Escape release, and:

- source-derived 35-instance layout;
- original avatar scale;
- original camera distance and FOV;
- original fog range;
- camera-relative movement;
- movement after horizontal mouse drag;
- vertical mouse pitch;
- wheel zoom;
- full source-derived bounds;
- no failed requests;
- no console errors.

## Corrected defects

This audit led to correction of several independent defects:

- monolithic `0.31×` scene instead of the source 35-instance kit layout;
- retained GLB root and child authoring transforms that the original kit renderer discards;
- dense miniature-world exponential fog hiding full-scale structures;
- physically lit building materials where the original uses map-driven unlit rendering;
- world-axis movement while the camera rotated;
- pointer-only evidence incorrectly treated as camera-look evidence;
- no vertical mouse orbit;
- incorrect avatar scale, FOV, and camera distance;
- camera collision checking only the endpoint instead of raycasting between player and camera;
- overly bright placeholder characters obscuring the scene.

## Remaining differences

The world architecture and scale now follow source data. Remaining differences are primarily private-renderer and physics details:

- original WebGPU shader nodes;
- exact floor reflections and fog color response;
- screen/text occlusion and custom post-processing;
- original character material and animation presentation;
- exact slope, step, capsule, and camera-restoration solver;
- multiplayer/network state.

The correct claim is: **the clone now reconstructs the original kit-instanced world architecture, scale, camera range, and core input model with repeatable all-angle and every-frame evidence, but it does not claim shader, physics, or source-code equivalence.**
