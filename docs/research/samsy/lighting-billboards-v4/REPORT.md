# Lighting and Billboard Recon v4

## Scope

Fresh inspection of the current `samsy.ninja` production bundle, the supplied original/clone screenshots, prior valid original captures, and matched clone captures. The automated live original canvas entered a black runtime state during one capture attempt, so that capture was rejected. Bundle extraction and asset/resource inspection completed successfully.

## Source-confirmed original behavior

### Billboard shader

The original kit routes the animated material only to mesh names containing `screen`.

The shader applies:

- a mostly active six-unit RGB displacement mode with a brief raw-texture reset;
- independent red, green, and blue texture offsets;
- a `+0.05` channel floor plus small high-frequency texture contributions;
- asynchronous `0.6 / 1.0` luminance flicker;
- moving dark bands;
- strong UV-derived color tinting;
- alpha derived from RGB energy and discard below `0.1`;
- emissive output routed through fog;
- approximately one radian per second Y rotation for `screen_rotate` geometry.

### Post-processing

The original WebGPU renderer uses separate scene and emissive MRT outputs.

Extracted post values:

- emissive bloom strength: `0.34`;
- bloom radius: `0.27 × devicePixelRatio`;
- bloom threshold: effectively `0`;
- screen-blend composite: `1 - (1 - scene) × (1 - bloom)`;
- original bloom composite multiplier: approximately `3.25`;
- horizontal vignette width: `0.33`;
- neutral luminance lift: `(1 - luminance) × 0.0104`;
- scanline strength: `0.005`;
- scanline frequency normalized from roughly `3200` at 1080 px CSS height;
- no ACES tone mapping and no constant purple atmospheric overlay.

### Floor interaction

The floor material itself remains the dual-scale masked black reflector. In the original renderer its reflected emissive result participates in the bloom MRT. The WebGL clone now reuses the previous reflection texture during its selective bloom pass to avoid a second planar-reflection capture.

## Applied reconstruction

- Replaced full-scene Unreal bloom and purple shadow lift with a selective emissive composer.
- Added source-style screen blending, vignette, neutral lift, and scanlines.
- Reconstructed the source screen animation in `MeshBasicMaterial.onBeforeCompile`.
- Restricted the animated shader to exact `screen` mesh naming.
- Restored source-speed rotating screens.
- Reduced invented global cyan/magenta/hemisphere lighting.
- Routed screen faces, avatar facial emissives, NPC badges, and the reflective floor into selective bloom.
- Preserved the existing floor texture mask and geometry.
- Calibrated WebGL-only bloom and floor channel gains because `UnrealBloomPass` and WebGPU emissive MRT have different buffer semantics.
- Rendered the blurred emissive buffer at 45% scene resolution; this preserved the bloom appearance while avoiding a second full-resolution scene pass.

## Verification

- Development QA: 43/43 checks passed.
- Production QA: 43/43 checks passed.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- Design detector: zero findings.
- Production console errors: zero.
- Production failed requests: zero.
- Two-second production animation comparison: 27.61% of pixels changed by more than 8 levels and 11.42% changed by more than 24 levels.
- Final floor crop mean varies with billboard/video frames; measured production captures landed around `35–41 / 35 / 63–67` RGB.
- Previously accepted clone floor crop: approximately `45.1 / 40.2 / 59.8` RGB.
- Supplied original floor crop: approximately `59.0 / 51.0 / 69.3` RGB.
- Headless 1919×893 production benchmark improved from roughly `31–32 FPS` at the full emissive-buffer cost to `44 FPS` with the optimized blurred buffer.

## Remaining renderer limitation

This is a WebGL approximation of a proprietary WebGPU node-material/MRT pipeline. The exact internal bloom buffer and color-space path cannot be reproduced byte-for-byte with Three.js `UnrealBloomPass`; backend-specific gains are therefore measured compensations rather than original constants.
