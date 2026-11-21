# 3D State Timeline

## Original Runtime

### Preloader / t00
- Viewport: 1440 × 900, DPR 1.
- State: black screen, preloader active, initial full-viewport canvas present.
- Screenshot: `docs/design-references/3d/samsy-t00.png`.
- Evidence: measured.

### Preloader Canvas / t05
- The image-based 2D preloader canvas is active and runtime assets are loading.
- Screenshot: `docs/design-references/3d/samsy-t05.png`.
- Evidence: measured.

### Tutorial / t15
- WebGPU context created.
- Giant W/A/S/D/SPACE labels surround the central avatar.
- SKIP button appears at the bottom.
- Screenshot: `docs/design-references/3d/samsy-t15.png`.
- Evidence: measured.

### Explore Settled / t60
- Persistent navigation and left-side identity/controls are visible.
- Cybercity, reflective floor, avatar, signs, lighting, and runtime statistics are settled.
- Screenshot: `docs/design-references/3d/samsy-t60.png`.
- Evidence: measured.

### Explore After Forward Movement
- W held for 2.5 seconds.
- Camera and avatar move toward the interactive red city objects and quest markers.
- Screenshot: `docs/design-references/3d/samsy-explore-after-w.png`.
- Evidence: measured.

### Works Settled
- Route: `/works`.
- Project 1, Clonex, is selected.
- Large video surface, project controls, city, character, and 25-project rail are visible.
- Screenshot: `docs/design-references/3d/samsy-works-05.png`.
- Evidence: measured and extracted.

### About Settled
- Route: `/about`.
- Large SMSY title, bilingual biography, links, credits, darkened 3D world, and streak background are visible.
- Screenshot: `docs/design-references/3d/samsy-about-05.png`.
- Evidence: measured and extracted.

## Clone Checkpoints

- Explore: `docs/design-references/clone-home.png`.
- Works/Clonex: `docs/design-references/clone-works.png`.
- About: `docs/design-references/clone-about.png`.
- Mobile Explore: `docs/design-references/clone-mobile.png`.

The clone uses loader completion as its readiness condition, not an arbitrary timer. The original took substantially longer to settle in the automated WebGPU capture; the clone becomes interactive after its local GLB and VRM decode.
