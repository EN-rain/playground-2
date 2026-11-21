# Billboard and Building Deep Recon V5

## Scope

This pass rechecked the original Explore scene specifically for:

- billboard animation cadence and RGB displacement
- screen flicker and scan-mask behavior
- non-screen building material visibility
- kit geometry and world transforms
- production behavior after the corrections

The accepted floor implementation was preserved.

## Capture method

Sparse one-second screenshots were not used for the final motion judgment.

The original and clone canvases were recorded through `HTMLCanvasElement.captureStream()` into VP9 WebM, then decoded using each frame's real presentation timestamp.

Accepted evidence:

- Original WebGPU canvas: 47 decoded frames over 2.376 seconds
- Final production clone canvas: 132 decoded frames over 4.794 seconds
- Native canvas size: approximately 1918 x 891/892
- Original production JavaScript bundle captured during the same recon

Rejected evidence:

- Playwright screenshots of the original WebGPU canvas that rendered black
- A nominal 100 ms screenshot sequence whose screenshot encoding took about 1.3 seconds per frame
- Tutorial-overlay frames

## Original billboard shader extracted from the live bundle

The original uses one shared screen color node for meshes whose names contain `screen`.

### Rare RGB burst

The original does not apply permanent RGB displacement.

The burst amount is effectively:

```text
seed = floor(worldPosition.z + time * 10)
hash = PCG(seed)
amount = hash >= 0.965 ? 6 : 0
```

Consequences:

- the decision changes at 10 Hz
- only about 3.5% of hash states activate the RGB displacement
- the burst is strong but brief and local
- different screens diverge through world-space Z, not an invented material phase

The clone previously inverted/approximated this gate and made the RGB treatment appear almost continuous.

### Flicker

The source uses a binary multiplier:

```text
wave = 0.35 + 0.35 * sin(time * 17.5 + worldY * 20)
flicker = wave > 0.1 ? 1.0 : 0.6
```

### Near-camera stripe mask

The dark stripe mask is enabled only when a screen fragment is approximately within eight view-space units. Distant city billboards do not receive the clone's former global rolling bands.

### UV tint and alpha

The source retains its UV-derived color tint and discards pixels whose resulting alpha falls below 0.1.

## Original building shader extracted from the live bundle

Non-screen meshes retain their authored texture and are multiplied by a world-height fade:

```text
surface.rgb *= 0.3 * smoothstep(0, 20, worldPosition.y)
```

They do not use a flat purple substitute, random slab lighting, or a constant global brightness multiplier.

## Geometry verification

The original production `C40` kit instance object was extracted and evaluated directly.

Comparison with `src/data/samsy-world-layout.json`:

- original keys: 17
- clone keys: 17
- original instances: 35
- clone instances: 35
- missing keys: 0
- extra keys: 0
- transform mismatches: 0

Therefore the building problem was not missing world geometry.

The final runtime reports:

- city instances: 35
- screen meshes: 35
- non-screen surface meshes: 18

The GLB child translations were also inspected. The original custom instancer consumes the child geometry without applying those node translations, so the clone continues to reproduce that source behavior rather than double-offsetting the kit.

## Code corrections

`src/components/samsy/CyberCityCanvas.tsx` now:

- uses the source PCG constants for rare screen bursts
- uses `floor(worldZ + time * 10)` as the burst seed
- removes the invented per-screen timing phase
- restores the source burst magnitude and RGB sample topology
- restores the source binary flicker
- limits the stripe mask to near-camera screens
- removes the global rolling-band treatment from distant billboards
- preserves authored non-screen textures
- applies the source `0.3 * smoothstep(0, 20, worldY)` building fade
- exposes screen and surface mesh counts for QA

`scripts/qa-samsy.mjs` now verifies the final shader/material profiles and confirms that both source screen meshes and source surface meshes are present.

## Frame-accurate production metrics

The central project-video rectangle was excluded from the static-billboard and architecture motion regions.

### Static billboard regions

| Metric | Original | Production clone |
|---|---:|---:|
| Median mean absolute change per 100 ms | 2.337 | 2.530 |
| Pixels changing more than 8 levels | 7.006% | 6.404% |
| Pixels changing more than 24 levels | 1.741% | 1.361% |
| Median luminance | 42.359 | 41.847 |
| Dark/midtone share | 85.711% | 84.990% |

The clone's motion is now in the same range as the original instead of presenting continuous RGB activity.

### Architecture regions

| Metric | Original | Production clone |
|---|---:|---:|
| Median mean absolute change per 100 ms | 2.537 | 2.632 |
| Pixels changing more than 8 levels | 7.470% | 6.782% |
| Median luminance | 45.653 | 43.500 |
| Dark/midtone share | 84.231% | 84.647% |

The building luminance and dark/midtone occupancy now closely match the original.

A remaining metric difference exists in the distribution of dark architectural edges. This is affected by WebGPU-versus-WebGL rasterization/post-processing and by different project-video phases. The source material, mesh count, layout, and height fade are now matched; no additional arbitrary building brightening was added.

## Verification

- TypeScript: passed
- ESLint: passed
- Next.js production build: passed
- Development browser QA: 43/43 passed on clean rerun
- Standalone production QA: 43/43 passed
- Browser console errors: 0
- Final production canvas recording errors: 0
- Impeccable detector findings: 0

One initial development QA run recorded `ERR_ABORTED` for the background audio while changing routes. The same file was available and the clean rerun had zero failed requests, matching the previously observed media-navigation cancellation behavior.

## Evidence paths

- `docs/design-references/billboards-buildings-v5/original-canvas-video/`
- `docs/design-references/billboards-buildings-v5/clone-canvas-video/`
- `docs/design-references/billboards-buildings-v5/original-contact-0-900ms.jpg`
- `docs/design-references/billboards-buildings-v5/clone-production-contact-0-900ms.jpg`
- `docs/design-references/billboards-buildings-v5/clone-final-full.png`
- `docs/research/samsy/billboards-buildings-v5/original-main-live.txt`
- `docs/research/samsy/billboards-buildings-v5/original-world-layout-extracted.json`
- `docs/research/samsy/billboards-buildings-v5/production-frame-accurate-metrics.json`
