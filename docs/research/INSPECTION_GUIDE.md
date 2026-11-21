# Website Inspection Guide

## How to Reverse-Engineer Any Website

This guide outlines what to capture when inspecting a target website via Chrome MCP or browser DevTools.

## Phase 1: Visual Audit

### Screenshots to Capture
- [ ] Every distinct page — desktop, tablet, mobile
- [ ] Dark mode variants (if applicable)
- [ ] Light mode variants (if applicable)
- [ ] Key interaction states (hover, active, open menus, modals)
- [ ] Loading/skeleton states
- [ ] Empty states
- [ ] Error states

### Design Tokens to Extract
- [ ] **Colors** — background, text (primary/secondary/muted), accent, border, hover, error, success, warning
- [ ] **Typography** — font family, sizes (h1-h6, body, caption, label), weights, line heights, letter spacing
- [ ] **Spacing** — padding/margin patterns (look for a scale: 4px, 8px, 12px, 16px, 24px, 32px, etc.)
- [ ] **Border radius** — buttons, cards, avatars, inputs
- [ ] **Shadows/elevation** — card shadows, dropdown shadows, modal overlay
- [ ] **Breakpoints** — when does the layout shift? (inspect with DevTools responsive mode)
- [ ] **Icons** — which icon library? custom SVGs? sizes?
- [ ] **Avatars** — sizes, shapes, fallback behavior
- [ ] **Buttons** — all variants (primary, secondary, ghost, icon-only, danger)
- [ ] **Inputs** — text fields, textareas, selects, checkboxes, toggles

## Phase 2: Component Inventory

For each distinct UI component, document:
1. **Name** — what would you call this component?
2. **Structure** — what HTML elements / child components does it contain?
3. **Variants** — does it have different sizes, colors, or states?
4. **States** — default, hover, active, disabled, loading, error, empty
5. **Responsive behavior** — how does it change at different breakpoints?
6. **Interactions** — click, hover, focus, keyboard navigation
7. **Animations** — transitions, entrance/exit animations, micro-interactions

### Common Components to Look For
- Navigation (top bar, sidebar, bottom bar)
- Cards / list items
- Buttons and links
- Forms and inputs
- Modals and dialogs
- Dropdowns and menus
- Tabs and segmented controls
- Avatars and user badges
- Loading skeletons
- Toast notifications
- Tooltips and popovers

## Phase 3: Layout Architecture

- [ ] **Grid system** — CSS Grid? Flexbox? Fixed widths?
- [ ] **Column layout** — how many columns at each breakpoint?
- [ ] **Max-width** — main content area max-width
- [ ] **Sticky elements** — header, sidebar, floating buttons
- [ ] **Z-index layers** — navigation, modals, tooltips, overlays
- [ ] **Scroll behavior** — infinite scroll, pagination, virtual scrolling

## Phase 4: Technical Stack Analysis

- [ ] **Framework** — React? Vue? Angular? Check `__NEXT_DATA__`, `__NUXT__`, `ng-version`
- [ ] **CSS approach** — Tailwind (utility classes), CSS Modules, Styled Components, Emotion, vanilla CSS
- [ ] **State management** — Redux (check DevTools), React Query, Zustand, Pinia
- [ ] **API patterns** — REST, GraphQL (check network tab for `/graphql` requests)
- [ ] **Font loading** — Google Fonts, self-hosted, system fonts
- [ ] **Image strategy** — CDN, lazy loading, srcset, WebP/AVIF
- [ ] **Animation library** — Framer Motion, GSAP, CSS transitions only
- [ ] **3D/rendering engine** — Three.js, React Three Fiber, Drei, Babylon.js, PlayCanvas, Spline, `<model-viewer>`, custom WebGL/WebGPU
- [ ] **3D resources** — GLB/GLTF/buffers, textures, HDR/EXR, compressed textures, decoders, shaders, workers, WASM, video/audio textures
- [ ] **Canvas architecture** — page-wide vs section-owned, fixed/sticky/flow, DOM overlay synchronization, pointer-event routing

## Phase 5: Interactive 3D Audit (when detected)

Read `INTERACTIVE_3D_INSPECTION_GUIDE.md` and produce the mandatory 3D artifacts before implementation.

- [ ] Run the early 3D detection gate and save `3D_DETECTION.json`
- [ ] Build `3D_ASSET_MANIFEST.json` with evidence and local paths
- [ ] Map canvas ownership, dimensions, DPR, layering, clipping, and pointer behavior
- [ ] Capture deterministic scene checkpoints at initial, settled, 0/25/50/75/100% progress, and every major interaction state
- [ ] Record camera, scene graph, materials, lights/environment, shadows, post-processing, animation, shaders/uniforms, and DOM synchronization
- [ ] Test pointer, hover, click/tap, wheel, drag, touch, keyboard, resize, time, visibility, reduced motion, and mobile behavior
- [ ] Write one `scenes/<SceneName>.scene.spec.md` per scene
- [ ] Define loading, asset failure, no-WebGL, context-loss, reduced-motion, lifecycle, and mobile fallbacks
- [ ] Replay checkpoints and interaction paths during QA
- [ ] Record performance, WebGL/shader/resource errors, lifecycle leaks, and known approximations

## Phase 6: Documentation Output

After inspection, create these files in `docs/research/`:
1. `DESIGN_TOKENS.md` — All extracted colors, typography, spacing
2. `COMPONENT_INVENTORY.md` — Every component with structure notes
3. `LAYOUT_ARCHITECTURE.md` — Page layouts, grid system, responsive behavior
4. `INTERACTION_PATTERNS.md` — Animations, transitions, hover states
5. `TECH_STACK_ANALYSIS.md` — What the site uses and our chosen equivalents
6. For 3D targets: `3D_DETECTION.json`, `3D_ASSET_MANIFEST.json`, `3D_CANVAS_MAP.md`, `3D_INTERACTIONS.md`, `3D_TIMELINE.md`, `3D_QA_RESULTS.md`, and `scenes/*.scene.spec.md`
