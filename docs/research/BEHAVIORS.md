# Behavior Record

## Global

- Navigation has three states: Explore, Works, About.
- Active navigation is a filled red pill; inactive items are red text on transparent background.
- The city renderer remains mounted through mode changes.
- The top-right renderer line updates continuously.
- The bottom-right sound button persists in all modes.

## Loading and Tutorial

- Loading blocks interaction until the city GLB and avatar VRM complete or fail safely.
- Tutorial labels W, A, S, D, and SPACE around the avatar.
- SKIP dismisses the tutorial for the browser session.

## Explore

- Keyboard input changes avatar position and camera follow target.
- Space applies an upward impulse and gravity-based return.
- Pointer movement adds damped camera parallax.
- Avatar idles with subtle vertical motion.
- Red NPC/quest objects float and rotate.
- Red key light pulses slightly over time.

## Works

- Entering Works darkens the city and moves the camera to a presentation framing.
- Current project video autoplays muted and loops.
- Wheel, arrow keys, rail clicks, and previous/next buttons change project.
- Input has a cooldown to avoid skipping several projects from one wheel gesture.
- INFOS opens a modal; ESC or its close control dismisses it.
- VISIT and optional case-study controls open extracted external URLs.

## About

- Entering About reduces city brightness and saturation.
- Perspective streak layers pulse and drift slowly.
- Contact and credit links retain pointer interaction above the decorative scene.

## Responsive

- Header/navigation reflow at 980 px.
- Works video panel becomes nearly full width.
- About becomes a vertically scrollable single English column on constrained screens.
- Mobile Explore adds a touch D-pad and jump control.

## Reduced Motion

- CSS tunnel, loading-eye, and transition animation durations are disabled or minimized when `prefers-reduced-motion` is active.
