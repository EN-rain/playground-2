# CyberCity Scene Specification

## Identity

- **Target component:** `src/components/samsy/CyberCityCanvas.tsx`
- **Canvas owner:** `src/components/samsy/SamsyExperience.tsx`
- **Original engine:** Three.js-derived custom WebGPU renderer with WebGL fallback
- **Reconstruction engine:** Three.js WebGL
- **Evidence confidence:** high for assets, world layout, instance transforms, spawn, camera range/FOV, and primary controls; medium for private shaders and physics details

## Reference conditions

- Desktop: 1440 × 900, DPR 1
- Mobile: 390 × 844, DPR 1
- Original screenshots: `docs/design-references/3d/samsy-*.png`
- V2 original recon: `docs/design-references/original-recon-v2/`
- V2 clone recon: `docs/design-references/clone-recon-v2/`
- Readiness: city GLB and avatar VRM decoded, interface mounted

## Canvas and renderer

- Context: WebGL2 when available
- Alpha: false
- Antialias: true
- Power preference: high performance
- Color pipeline: sRGB output, ACES filmic tone mapping
- Background: near-black `#010104`
- Fog: linear, near 700 / far 800, extracted from original source behavior
- DPR: max 1.5 desktop, 1.15 mobile
- Post-processing: RenderPass → UnrealBloomPass
- City materials: map-driven unlit materials, matching the original kit material strategy more closely than physically lit standard materials

## Camera

- Type: perspective
- Desktop FOV: **60°**, live-runtime extracted
- Mobile FOV: 75°, responsive reconstruction
- Near/far: 0.1 / 800
- Original orbit maximum distance: **8**
- Clone orbit distance: 1.5–8; the nonzero lower limit is a safety approximation
- Original polar range: 0.75–2.5 radians
- Explore supports horizontal and vertical left-button drag, wheel zoom, damping, and camera-relative movement
- Player-to-camera collision raycasts against instantiated collision meshes with a 0.2-unit clearance
- Works and About retain fixed presentation framing

## Scene graph

### Source kit architecture

- Asset: `/models/cyberfix.glb`, extracted
- GLB contents: 62 nodes, 38 meshes, 13 materials
- Approximate render vertices: 47,145
- Original source map: `C40`, extracted from `docs/research/samsy/raw/main.js`
- Kit item types: **17**
- Explore instances: **35**
- Per-instance scale range: **1.0–73.9219**
- Instance data: `src/data/samsy-world-layout.json`

The original `kitify()` implementation:

1. treats each GLB scene root as a kit item;
2. extracts direct-child raw geometry;
3. discards root and direct-child authoring transforms;
4. applies the C40 instance position, Euler rotation, and scale.

The clone follows this same rule. It no longer renders the complete GLB once at `0.31×`.

Current derived Explore bounds:

- X: approximately `-970.20 … 613.16`
- Z: approximately `-936.13 … 744.00`

### Collision

- Every instantiated collision-named child is hidden from rendering but retained for physics queries
- Player collision uses two-height horizontal raycasts and axis-separated movement resolution
- Camera collision raycasts from the player target toward the desired camera position
- Decorative screen, logo, hologram, and writing meshes are excluded from collision behavior unless an authored collision child exists

### Player

- Asset: `/models/owo7.vrm`, extracted
- Root mesh: `obake`
- Spawn: approximately `(46.1583, 0, -180.2812)`
- Scale: **1.65**, live-runtime extracted
- Radius: **0.5**, live-runtime extracted
- Rotation follows camera-relative movement direction
- Idle: small sinusoidal vertical motion
- Avatar materials are darkened to approximate the original silhouette; exact proprietary presentation remains approximate

### NPC / quest objects

- Three reconstructed dark floating forms with subtle red eyes
- Positions remain local approximations around the player spawn
- Their exact quest logic, avatar models, and network state are not reconstructed

### Floor

- Large horizontal Reflector plane sized for the source-derived world
- Semi-transparent GridHelper supplies a faint cyber-grid cue
- Exact original WebGPU floor-reflection shader remains approximate

## Movement and jump

Source-derived values:

- base speed: 5
- acceleration rate: 1.2
- maximum speed multiplier: 3×
- deceleration rate: 3
- jump altitude: 6
- time to apex: 0.34 s
- time to ground: 0.35 s

Implemented behavior:

- WASD and arrows move relative to current camera heading
- horizontal and vertical left drag orbit the camera
- wheel zooms within the close original camera range
- Space triggers jump
- key state is cleared when focus is lost

## Lighting and materials

- City textures use unlit map-driven materials
- Screen and text surfaces remain tone-mapping independent
- Low-intensity hemisphere and point lights preserve limited avatar/NPC visibility
- Bloom is intentionally reduced compared with the first reconstruction so it does not obscure the full-size city
- Exact original WebGPU node materials and post-processing remain unavailable

## DOM synchronization

- Persistent header and renderer statistics remain above the canvas
- Explore guide reflects movement, drag, zoom, and jump bindings
- Works video/card and About copy remain DOM overlays for accurate text, links, and accessibility
- Browser history and visible mode are synchronized

## Assets and loading

- Manifest: `docs/research/3D_ASSET_MANIFEST.json`
- World layout: `src/data/samsy-world-layout.json`
- GLTF loader: Three.js GLTFLoader
- VRM loader: GLTFLoader + VRMLoaderPlugin
- Loading screen remains until both primary loaders finish or fail safely
- Runtime assets are local

## Performance and lifecycle

- Reflection target: 1024²
- DPR bounded
- Static city shadows disabled
- Frame callback, listeners, geometries, textures, materials, composer, renderer, and context disposed on unmount
- Visibility resume resets frame timing
- The current clone duplicates scene-graph objects rather than using GPU instanced meshes; this favors reconstruction clarity over maximum draw-call efficiency

## Responsive composition

- Desktop uses the extracted 60° FOV
- Mobile uses a wider 75° FOV and reduced DPR
- Touch controls appear below 980 px
- Reduced motion disables CSS motion
- A static no-WebGL fallback is provided

## Acceptance checkpoints

- [x] Source C40 instance map extracted
- [x] Original raw-child kitify behavior reconstructed
- [x] 35 Explore instances active
- [x] Source-derived world bounds active
- [x] Original spawn, avatar scale, camera FOV, and camera range active
- [x] Horizontal and vertical mouse orbit implemented
- [x] Camera-relative movement and wheel zoom implemented
- [x] Camera and player collision implemented
- [x] Original and clone all-angle recon captured
- [x] Every-compositor-frame traversal includes real mouse drag
- [x] Production QA passes 35/35
- [x] No hotlinked primary assets
- [ ] Private WebGPU shader graph reproduced exactly
- [ ] Original multiplayer/quest systems reproduced

## Evidence

- `docs/research/samsy/recon-v2/FULL_RECON.md`
- `docs/research/samsy/recon-v2/original-world-scale.json`
- `docs/research/samsy/recon-v2/original-runtime.json`
- `docs/research/samsy/recon-v2/original-movement-recon.json`
- `docs/research/samsy/recon-v2/clone-movement-recon.json`
- `docs/design-references/original-recon-v2/`
- `docs/design-references/clone-recon-v2/`

## Known gaps

See `docs/research/3D_LIMITATIONS.md`.
