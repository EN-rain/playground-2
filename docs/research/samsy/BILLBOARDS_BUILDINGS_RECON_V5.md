# Billboard and Building Recon V5

## Scope

This pass rechecked the live original against the clone using continuous canvas recordings rather than one screenshot per second.

- Original: WebGPU canvas recorded through `HTMLCanvasElement.captureStream()`.
- Clone: WebGL canvas recorded through the same API.
- CSS viewport: 1535 × 714.
- Device scale factor: 1.25.
- Original canvas: 1918 × 891.
- Clone canvas: 1918 × 892.
- Comparison window: 0–2.3 seconds, resampled at 100 ms targets from each recording's real timestamps.

Playwright screenshots of the original WebGPU canvas were rejected because WebGPU readback intermittently produced a black canvas. A first screenshot sequence was also rejected for temporal analysis because saving full-resolution PNGs took much longer than 100 ms. Only canvas-stream recordings and their decoded timestamps are used for the final conclusions.

## Source defects found in the clone

### Glitch gate was inverted

The previous shader used:

```glsl
1.0 - step(0.965, fract(...))
```

That enabled RGB displacement for approximately 96.5% of the cycle. The intended rare branch is the non-inverted `step` result.

### Glitch displacement was excessive

The clone also used:

- displacement amount `6.0`
- permanent `+0.05` per-channel lift
- additional 4.5× UV ghost copies
- 17.5 Hz brightness switching between 60% and 100%
- strong rolling-band attenuation

This produced continuous channel tearing and large brightness changes absent from the original frame sequence.

### Buildings were deliberately darkened

All mapped non-screen materials were multiplied by approximately:

```text
(0.38, 0.36, 0.42)
```

Untextured surfaces were multiplied by `0.3`.

The source GLB, `public/models/cyberfix.glb`, contains authored white base-color factors for all 13 materials. Building, base, wall, ramp, tower, and gate textures were therefore being darkened by an invented material conversion.

## Corrections

- Rare glitch gate: 1.5% duty threshold.
- Glitch cycle speed reduced from `10` to `4`.
- RGB displacement reduced from `6.0` to `1.75`.
- Large secondary ghost copies removed.
- Only a very weak 2× texture echo remains during rare bursts.
- Screen flicker reduced to a 94–100% modulation at 5.5 Hz.
- Rolling-band attenuation reduced to approximately one-third of the prior strength.
- Mapped structural surfaces raised from `(0.38, 0.36, 0.42)` to `(0.68, 0.68, 0.72)`.
- Untextured structural surfaces now retain 72% of their authored color instead of 30%.

The floor, camera, physics, scene transforms, and reflector topology were not changed.

## Frame-by-frame results after correction

### Motion ratio: clone ÷ original

| Region | Ratio |
|---|---:|
| Left static signage | 0.76× |
| Top-center signage | 1.25× |
| Right static signage | 0.79× |
| Center video | 0.94× |
| Architecture region | 0.85× |
| Floor | 1.06× |

The old permanent-tearing result changed large portions of the scene every frame. After correction, all major regions are near the original temporal range. The top-center remains somewhat more active, but no longer reads as constant full-scene corruption.

### Mid-dark architectural coverage

| Region | Original | Corrected clone | Difference |
|---|---:|---:|---:|
| Top-center | 75.07% | 74.14% | −0.93 pp |
| Right city | 83.33% | 76.89% | −6.44 pp |
| Architecture region | 80.06% | 74.64% | −5.42 pp |
| Center | 65.50% | 70.47% | +4.97 pp |

The buildings and structural bases are now visible. The remaining coverage difference is caused by layout/content/foreground differences, not by the previous material blackout.

## Evidence

- Original canvas recording: `docs/design-references/billboards-buildings-v5/original-canvas-video/original-canvas-5s.webm`
- Clone canvas recording: `docs/design-references/billboards-buildings-v5/clone-canvas-video/clone-canvas-5s.webm`
- Original decoded frames: `docs/design-references/billboards-buildings-v5/original-canvas-video/decoded/`
- Clone decoded frames: `docs/design-references/billboards-buildings-v5/clone-canvas-video/decoded/`
- Original 100 ms contact sheet: `docs/design-references/billboards-buildings-v5/analysis/original-clean-contact-0-0.9s.jpg`
- Corrected clone contact sheet: `docs/design-references/billboards-buildings-v5/analysis/clone-after-fix-contact-0-0.9s.jpg`
- Matched side-by-side sequence: `docs/design-references/billboards-buildings-v5/analysis/original-vs-clone-after-fix.jpg`
- Metrics: `docs/research/samsy/billboards-buildings-v5/video-frame-analysis-after-fix.json`
- Fresh original bundle: `docs/research/samsy/billboards-buildings-v5/original-main-live.txt`

## Remaining non-scope mismatches

This pass does not claim a complete scene match. Remaining prominent differences include:

- the persistent center video transform and animation phase
- foreground player vertical composition
- exact remote-avatar models and placement
- several screen transforms/content assignments
- missing original UI widgets
- proprietary WebGPU material and multiplayer behavior
