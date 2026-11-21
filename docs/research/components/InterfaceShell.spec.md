# InterfaceShell Specification

## Overview
- **Target:** persistent UI in `src/components/samsy/SamsyExperience.tsx`
- **References:** `samsy-home-ready.png`, `samsy-t60.png`
- **Interaction model:** click, keyboard, pointer, time-driven statistics

## Structure
- Top-left SMSY identity and Japanese subtitle.
- Top-center Explore / Works / About navigation.
- Top-right live engine/frame/FPS text.
- Bottom-right sound toggle.
- Explore-only left copy and keyboard guide.
- Loading and tutorial layers above the shell.

## Visual Rules
- Background remains transparent over the 3D scene.
- Primary color: `#ff0033`.
- Font: Forma DJR Display, locally hosted weights 400/500/700.
- Active nav: 120 × 35 px red pill, black label.
- Desktop identity offset: 50 px left, approximately 47 px top.
- Scanline/vignette overlays are pointer-transparent.

## States
- Explore, Works, About active navigation.
- Muted / unmuted sound icon.
- Loading, tutorial, ready.
- Desktop and stacked mobile navigation.

## Acceptance
- All controls use semantic HTML.
- Direct route, click navigation, and browser back/forward remain synchronized.
- Header remains visible in all three modes.
