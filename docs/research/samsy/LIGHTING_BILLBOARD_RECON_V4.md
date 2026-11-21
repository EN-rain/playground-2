# SMSY Lighting and Billboard Recon V4

## References

- Supplied original screenshot: 1919 × 893 physical pixels.
- Matching render scale: 1535 × 714 CSS pixels at DPR 1.25.
- Fresh live bundle inspected: `main-ITpbzWAg.js`.
- Final production evidence: `docs/design-references/lighting-billboards-v4/production-final-clonex.png`.

## Extracted source behavior

- No tone mapping in the source renderer.
- Dedicated emissive MRT feeds a five-level bloom chain.
- Bloom strength: `0.34`.
- Bloom radius: `0.27 × devicePixelRatio`.
- Bloom threshold: `0`.
- Final blend: screen blend, `1 - (1 - scene) × (1 - bloom)`.
- Horizontal vignette width: `0.33`.
- Scanline amplitude: `0.005`.
- Scanline frequency: `3200 × physicalHeight / 1080`.
- Animated shader applies only to names containing `screen`.
- Screen animation includes per-screen flicker, RGB displacement, rolling dark bands, UV tinting, alpha discard, and emissive bloom.
- `screen_rotate` objects rotate positively at approximately one radian per second with an instance-derived phase.
- `akira.webm` contains the CLONEX sequence around 4–6 seconds. The old forced eight-second seek was incorrect.

## WebGL backend compensation

These are measured approximations required because the clone uses WebGL `UnrealBloomPass`, not the original WebGPU emissive MRT implementation:

- Selective bloom tint: `(1.35, 0.72, 0.65)`.
- Selective bloom gain: `0.9`.
- Display-referred per-channel levels curve fitted to the supplied original screenshot.
- `OutputPass` restores the required linear-to-sRGB output conversion.

The floor geometry, dual-scale mask, distortion, seams, and 0.75-resolution reflector were preserved. Its accepted WebGL intensity factor remains `0.78`.

## Image distribution

Scene crop, excluding the left UI margin:

| Metric | Original RGB | Final production RGB |
| --- | --- | --- |
| Mean | 71.59 / 57.08 / 73.81 | 71.42 / 57.76 / 74.38 |
| P25 | 41 / 35 / 45 | 38 / 32 / 45 |
| P50 | 56 / 46 / 61 | 55 / 45 / 60 |
| P75 | 80 / 64 / 86 | 86 / 66 / 92 |
| P90 | 128 / 106 / 134 | 136 / 109 / 130 |
| P95 | 192 / 138 / 167 | 191 / 140 / 171 |

## Temporal verification

With both videos frozen, billboard and rotating-screen animation alone changed:

- 26–33% of the upper scene by more than eight RGB levels over 0.25–4 seconds.
- 10–16% by more than 24 RGB levels.

This confirms the scene motion is not dependent on playing a pre-rendered video.

## Presentation corrections

- Player eye cores are white emissive shapes with a red bloom halo.
- Remote avatar proxies use dark-red bodies with bright white/red face badges.
- Full-body proxy bloom was rejected because it produced flat red blobs.

## Verification

- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- Development browser QA: 43/43.
- Standalone production browser QA: 43/43.
- Production capture console errors: 0.
- Production capture failed requests: 0.
