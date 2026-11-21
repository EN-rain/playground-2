# 3D Canvas Map

## Original

- **Evidence:** measured and extracted.
- **Owner:** one application-wide canvas created before the Vue interface mounts.
- **Context:** WebGPU at 1440 × 900 in the captured Chrome runtime; WebGL fallback code is present in the production bundle.
- **Positioning:** fixed/full viewport behind the HTML and canvas-generated interface.
- **Backing size:** follows viewport and device-pixel-ratio policy.
- **Layering:** cybercity and avatar render first; navigation, text, tutorial, work controls, About copy, performance stats, and sound control are layered above it.
- **Continuity:** the same world persists across Explore and Works. About darkens the world and adds a streak/tunnel treatment rather than replacing the entire application.
- **Input:** canvas/world listens for keyboard movement, pointer/raycast interaction, wheel/project navigation, click/tap, and mobile joystick controls.

## Clone

- **Canvas owner:** `src/components/samsy/CyberCityCanvas.tsx`.
- **DOM owner:** `src/components/samsy/SamsyExperience.tsx`.
- **Positioning:** one fixed canvas at `z-index: 0`; all accessible interface content is HTML above it.
- **DPR:** capped at 1.5 desktop and 1.15 mobile.
- **Renderer:** Three.js WebGLRenderer, ACES tone mapping, sRGB output, fog, reflection plane, bloom pass.
- **DOM contract:** canvas is decorative to assistive technology; all navigation and project controls remain semantic HTML.
- **Resize:** renderer, composer, camera aspect, and mobile FOV update together.
- **Lifecycle:** animation frame, listeners, scene resources, render targets, renderer, and WebGL context are disposed on unmount.

## Layer Order

1. Three.js city, avatar, NPC markers, lighting, reflection.
2. Vignette and scanline compositing.
3. Explore, Works, or About interface.
4. Persistent header/navigation and live renderer stats.
5. Tutorial or project-information modal.
6. Loading screen.
