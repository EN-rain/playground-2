# Page Topology

The target is one persistent full-viewport application, not a conventional document with vertically stacked sections.

## Persistent Layers

1. Full-viewport cybercity renderer.
2. CRT scanlines, vignette, fog, reflection, and glow treatment.
3. Header identity, section navigation, renderer statistics, and sound control.
4. Current mode interface.
5. Temporary loading, tutorial, or information modal.

## Explore `/`

- Persistent 3D city and avatar.
- Left identity and keyboard-control legend.
- WASD/arrow movement, Space jump, pointer parallax.
- Tutorial appears until skipped in the current browser session.
- Mobile adds touch D-pad and jump button.

## Works `/works`

- Same city canvas remains behind the interface.
- Centered project video panel with exact project metadata and links.
- Bottom previous/next controls and all 25 project positions.
- Wheel, keyboard, click, and touch navigation.
- INFOS opens a modal without leaving the experience.

## About `/about`

- City remains mounted but darkens and recedes.
- Animated perspective light streaks add the observed tunnel effect.
- Large SMSY title, bilingual biography, contact links, and credits are HTML overlays.

## Responsive Rules

- Desktop keeps the left identity block and centered top navigation.
- Tablet/mobile stack the brand and navigation, widen the Works panel, hide secondary About Japanese/credit columns when space is insufficient, and expose touch movement controls.
- Renderer DPR and FOV are reduced/expanded on small viewports rather than merely shrinking the desktop frame.
