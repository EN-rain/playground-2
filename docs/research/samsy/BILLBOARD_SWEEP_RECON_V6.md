# Billboard Sweep Recon V6

## Reported defect

Many billboard surfaces showed moving vertical or diagonal bands. On angled panels the motion looked like screen content sliding around a building corner.

## Evidence used

- Fresh production bundle previously captured from the live original.
- Exact original `Af` screen color-node implementation.
- Five-second clone canvas streams at 1918 × 892.
- A/B recordings with the reconstructed stripe, flicker, and physical screen rotation disabled independently.
- GLB inspection of all screen nodes and their local transforms.

## Screen inventory

- 24 source screen meshes in `cyberfix.glb`.
- 35 screen instances in the Explore world layout.
- 9 source meshes are named `screen_rotate`, but only 4 of those items are instantiated in Explore.
- The four active rotating signs have valid local pivots; they were not responsible for the widespread artifact.

## Root cause

The original shader contains three independent motion systems:

1. A rare PCG-controlled RGB burst, active for approximately 3.5% of 10 Hz states.
2. A hard binary brightness multiplier based on `time * 17.5 + worldY * 20`.
3. A near-camera world-space stripe mask based on `worldX + worldZ`.

The WebGL reconstruction applied systems 2 and 3 per fragment. Because the screen planes use different world orientations, the world-height flicker became horizontal on some panels and diagonal on others. The near-camera pattern became a vertical or diagonal sweep when the camera crossed its eight-unit gate. Reflections and bloom duplicated the perceived artifact.

## A/B findings

- Disabling continuous flicker reduced median static-screen motion by more than half.
- Disabling physical rotation reduced diagonal/vertical detections, but only on four intended signs.
- Disabling the near stripe did not materially change the spawn view because those screens were farther than eight view-space units; it remained objectionable during close approaches.
- The rare RGB burst was not the widespread problem and was preserved.

## Final correction

The final WebGL compensation now:

- keeps the source PCG RGB burst;
- keeps the four source-authentic Y-rotating signs;
- changes the spatial world-height flicker into a subtle whole-panel pulse using the screen object's world origin;
- replaces the hard 0.6/1.0 brightness jump with a smooth 0.9–1.0 range;
- removes the near-camera world-space stripe mask;
- preserves UV tinting, alpha discard, selective bloom, fog, reflection, and screen textures.

This preserves screen activity without moving bands inside the billboard content.

## Verification

- Final production canvas stream: 111 decoded frames over 4.73 seconds.
- No traveling diagonal bands were visible across static billboard surfaces in the production contact sheet.
- The remaining motion is limited to whole-panel flicker, rare RGB bursts, project videos, and four intended rotating signs.
- Development main QA: 44/44 passed on clean rerun.
- Development physics/camera QA: 7/7 passed.
- Production main QA: 44/44 passed.
- Production physics/camera QA: 7/7 passed.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.
- Browser console errors: 0.
- Failed runtime requests: 0.
- Impeccable detector findings: 0.

## Evidence paths

- `docs/design-references/billboard-fx-diagnostics/full.webm`
- `docs/design-references/billboard-fx-diagnostics/no-flicker.webm`
- `docs/design-references/billboard-fx-diagnostics/no-stripe.webm`
- `docs/design-references/billboard-fx-diagnostics/no-rotation.webm`
- `docs/design-references/billboard-fx-diagnostics/stable.webm`
- `docs/design-references/billboard-fx-diagnostics/production-final-panel-flicker.webm`
- `docs/design-references/billboard-fx-diagnostics/production-final-contact.jpg`
- `docs/design-references/billboard-fx-diagnostics/final-variant-analysis.json`
- `docs/research/samsy/billboard-line-motion-analysis.json`
