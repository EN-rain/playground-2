# Original vs Clone Frame Comparison V3

## Scope

This audit compares the saved original Samsy compositor capture against the final standalone production clone.

- Original capture: **1,951 compositor frames**.
- Clone production capture: **1,133 compositor frames**.
- Capture API: Chrome DevTools Protocol `Page.startScreencast`.
- Capture cadence: `everyNthFrame: 1`.
- Every original frame is paired to the clone frame at the same normalized progress inside the corresponding input phase.
- Paired original frames: **1,951 / 1,951**.

The pairing is phase-normalized because the original WebGPU renderer and clone WebGL renderer emit different frame counts under the same timed input sequence. It is not a claim that the two engines produce identical timestamps or physics trajectories.

## Final production capture

- Duration: **51.322 seconds**.
- Console errors: **0**.
- Failed requests: **0**.
- Mouse phase: single-click pointer-lock free-look while moving forward.
- Movement phases: idle, forward, four diagonals, left/right, backward, jump-forward, camera sweep, and settle.

## Frame-pair metrics

| Metric | Result |
| --- | ---: |
| Mean scene similarity | **86.25%** |
| Median scene similarity | **86.34%** |
| Best paired-frame similarity | **95.25%** |
| Mean floor-region absolute error | **24.86 / 255** |
| Original mean floor luminance | **43.18** |
| Clone mean floor luminance | **49.14** |
| Original bright-colored floor ratio | **2.31%** |
| Clone bright-colored floor ratio | **2.44%** |

The bright-colored floor ratio is now close to the original because the clone no longer draws emissive cyan/red grid helpers. Remaining bright floor pixels are reflected scene media and signage rather than glowing grid lines.

## Floating-structure diagnosis

The previous visual floor was placed at **Y = -2.55**, while the original kit instances and player use ground around **Y = 0**. This created an artificial 2.5-unit gap that made grounded structures appear suspended.

The corrected production floor is at **Y = -0.035**, immediately below the source-derived world ground. A mesh-bottom audit also confirmed that most structural kit bodies meet or slightly penetrate Y = 0. Elevated logos, barriers, and screen panels remain elevated because their extracted source transforms intentionally place them there.

## Ramp collision diagnosis

The phase comparison exposed a second mismatch: the clone stopped near `(-54.5, -56.2)` during backward-right movement while the original continued. The blocking object was:

- kit item: `buildingramp` instance 0;
- mesh: `ramp_collision.001`;
- approximate bounds: X `-94.9…-46.1`, Y `0…22.4`, Z `-97.5…-48.0`.

The original treats this mesh as walkable sloped ground. The clone had treated it as a vertical wall. The final controller now separates ramp-ground meshes from wall collision, samples ramp height downward, and includes the ramp in camera collision. The repeated route no longer freezes and completes every movement phase.

## Floor correction

Removed from the final floor:

- additive cyan grid overlay;
- additive red major grid overlay;
- animated grid shimmer;
- player-following emissive `GridHelper` geometry.

The wet floor now contains only:

- scene reflections;
- puddle/roughness variation;
- subtle dark, multiplicative grid seams;
- no self-illuminated grid color.

## Evidence

Machine-readable all-frame report:

```text
docs/research/samsy/frame-comparison-v3.json
```

All-phase visual sheets:

```text
docs/design-references/frame-comparison-v3/phase-start-mid-end.jpg
docs/design-references/frame-comparison-v3/phase-midpoints-preview.jpg
docs/design-references/frame-comparison-v3/worst-frame-pairs.jpg
docs/design-references/frame-comparison-v3/worst-six-preview.jpg
```

Raw captures:

```text
docs/design-references/world-frames/original/frames/
docs/design-references/world-frames/clone/frames/
docs/design-references/world-frames/original/frames.json
docs/design-references/world-frames/clone/frames.json
```

## Remaining differences

The comparison still shows meaningful differences in scene density, camera behavior during wide mouse sweeps, proprietary reflection/post-processing, and the exact player path through the original physics world. These are visible in the worst-pair sheet and are not represented as solved or pixel-identical.
