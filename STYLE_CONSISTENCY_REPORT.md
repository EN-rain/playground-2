# Cyberpunk Profile — Full-Read Verification & Style-Consistency Report

**Date:** 2026-08-04
**Scope:** `C:\Users\LENOVO\Desktop\Projectsss\cyberpunkprofile` (the `samsy-clone` Next.js 16 + Three.js explorable cybercity)
**Goal:** Verify asset mount status (correcting earlier "dormant" claims) and deliver a style-consistency checklist + analysis. QA/fidelity excluded by user direction.

---

## Part 1 — Full-Read Asset Mount Verification (corrections to prior claims)

Method: enumerated every file in `src/`, `public/`, `scripts/` (the grep timed out on the whole repo due to `node_modules`/`.next`). Then grepped `src/` (the runtime) and `scripts/` (dev tooling) for each asset/component name. This is the authoritative check — an asset is "mounted" only if `src/` references it.

### 1A. MOUNTED & ACTIVE at runtime
| Asset | Mount site | Status |
|---|---|---|
| `/textures/bump-floor_fxrdig.jpg` | `CyberCityCanvas.tsx:536` loaded; wired into Reflector shader uniform at `:608` | **ACTIVE** (wet-floor reflection mask) |
| `/seo/media.png` | `globals.css:103` (webgl-fallback bg) + `layout.tsx:22` (OG image) | **ACTIVE** (fallback path only) |

> **CORRECTION:** Earlier I called `bump-floor_fxrdig.jpg` "dormant." It is in fact loaded and actively consumed by the Reflector shader. Retracted.

### 1B. MOUNTED BUT HIDDEN (archived)
| Asset | Mount site | Status |
|---|---|---|
| `/videos/works/derivative.webm` | `CyberCityCanvas.tsx:477` → `VideoTexture` → plane `:497`, **`visible=false`** (`:502`) | Mounted, archived, not playing |
| `/videos/works/akira.webm` | `CyberCityCanvas.tsx:507` → `VideoTexture` → plane `:527`, **`visible=false`** (`:532`) | Mounted, archived, not playing |

> **CORRECTION:** Earlier I called the works videos "dormant/unmounted." They are instantiated and added to the scene graph but flagged `visible=false` as part of the "custom city rebuild" archival (comments at `:501`, `:531`). Of 25 `works/*.webm` files, **only these 2 are referenced at all**; the other 23 are never touched by `src/`.

### 1C. IMPORTED BUT NEVER LOADED (code scaffolding only)
| Asset | Evidence | Status |
|---|---|---|
| `owo3.vrm`, `owo7.vrm` | `VRMLoaderPlugin` imported at `CyberCityCanvas.tsx:12`; no `.load()` call anywhere; `.vrm` referenced only in a comment at `:683` (fallback body sizing) | **DORMANT** — import present, model never instantiated |
| `public/models/owo3.vrm`, `public/models/owo7.vrm` | exist in `public/`; referenced only in `scripts/download-samsy-assets.mjs` | **DORMANT** |

### 1D. DORMANT — present in `public/`, referenced ONLY in scripts (never in `src/` runtime)
- `public/images/ui2.png` + `ui2.json` — interaction UI atlas (download manifest only)
- `public/fonts/formadjrregular.*`, `formadjrbold.*` — BMFont assets (download manifest only)
- `public/textures/atlasemoji.png` — emoji atlas (download manifest only)
- `public/textures/faces8.png` — face atlas (download manifest only)
- `public/textures/noisebake.png` — noise bake (download manifest only)
- `public/images/preloader.png` — **NOT used**; loading screen is pure CSS (`loading-eyes`/`loading-track` in `globals.css:777`+, `SamsyExperience.tsx:100-104`)
- `public/videos/loading.mp4` — referenced only in Playwright recon route-interception scripts, not `src/`
- `public/images/quest4.svg`, `public/images/triangle.svg` — not referenced in `src/`
- 23 of 25 `works/*.webm` videos (all except `derivative`/`akira`) — not referenced anywhere in `src/`

**Conclusion of verification:** The running experience mounts exactly: the GLB (`cyberfix.glb`), `bump-floor_fxrdig.jpg` (floor), `media.png` (fallback/OG), and 2 archived works-video planes. Everything else in `public/` is scaffolding downloaded for a future state that is not yet wired in. My "dormant" framing was correct for the atlases/BMFont/VRM/preloader/loading/23-videos, but **wrong for `bump-floor_fxrdig.jpg`** and **imprecise for the 2 works videos** (mounted-but-hidden, not unmounted).

---

## Part 2 — Style-Consistency Checklist

Scope: keep styles consistent across the experience. Each item is a consistency gate, not a QA/fidelity check.

> **Excluded tracks (2026-08-04):** *Characters* (D) and *Audio* (I) are removed. The experience renders **no characters** — the player `fallbackAvatar` is `visible=false` (`CyberCityCanvas.tsx:632`) and `owo7.vrm` is never loaded, so `avatarRoot` stays null; NPC proxies are defined but not spawned in the current rebuild. Audio is not a visual-style concern. (See `.consistency/` for the maintained, machine-checked version of this checklist.)

### A. Billboards (screen surfaces)
- [ ] Main billboard geometry sourced from `/screen/` mesh inside `cyberfix.glb` (consistent with the asset kit).
- [ ] Billboard material uses the unlit `createSourceScreenMaterial()` signature: PCG-hash RGB burst + panel flicker + UV tint + alpha discard.
- [ ] Archived decorative/works video planes (`derivative`, `akira`) share the same tonal treatment when re-enabled.
- [ ] Billboard content color is graded through `bloomTint (1.35, 0.72, 0.65)` + CRT screen-blend so screens read as "warm-red neon," not generic video.

### B. Color system
- [ ] Brand palette fixed: `--smsy-red #ff0033`, `--smsy-black #020205`, `--smsy-white #f5f2ed`.
- [ ] Secondary red `#ff3366` appears **only** on the kill-switch banner (intentional distinction from brand `#ff0033`).
- [ ] Day-mode accents `#9ec5e8` / `#1a2a3a` used only for the day toggle active state.
- [ ] No stray hex values introduced outside this system (watch for one-off reds/cyans).

### C. Lighting
- [ ] Night rig: `hemiLight 0x493f52/0x020103`, `moonLight 0xaec2ff`, `redLight 0xff003d`, `cyanLight 0x62c8ef`, `magentaLight 0xff3cbd`.
- [ ] Day rig: `sunLight 0xfff2d6` + `dayAmbient 0xdde6f0`, floor `dayBoost 0.7`.
- [ ] Selective bloom via `BLOOM_SCENE_LAYER` (layer 1) + occluder swap — only emissive/neon on that layer blooms.
- [ ] Fog `700–800` constant across both modes.

### D. Sky / environment
- [ ] Flat background (no skybox/particles/stars): `SCENE_BG_NIGHT 0x17101c`, `SCENE_BG_DAY 0x6a8fad`.
- [ ] Ground read is the reflective floor, not an env map — keep minimal samsy aesthetic.

### E. Post-processing (CRT)
- [ ] `sourceComposite` ShaderPass applies uniformly: screen-blend + horizontal vignette + scanlines + luma lift + linear↔sRGB + black/white point + gamma.
- [ ] Single grade enforces one look across all content; verify it isn't bypassed on any surface (`toneMapped:false` billboards still pass through the pass).

### F. Floor
- [ ] `Reflector` + `originalMaskedReflectorShader` dual-scale mask (`*500` macro / `*2500` fine) fed by `bump-floor_fxrdig.jpg`.
- [ ] Wet-night / bright-day behavior consistent; geometry is THREE.Shape road+plaza (per `progress.md`).

### G. DOM UI (overlay)
- [ ] `globals.css` scanline/vignette overlays match the in-canvas CRT grade.
- [ ] `mode-about` / `mode-works` canvas filters (dim/saturate) are intentional style states, not bugs.
- [ ] Loading screen = CSS `loading-eyes`/`loading-track` (no image asset) — consistent minimal look.
- [ ] Buttons use shadcn `base-nova` style.

### H. GLB asset provenance (style source of truth)
- [ ] `cyberfix.glb` is the single source for billboard geometry + city kit.
- [ ] `docs/research/3D_ASSET_MANIFEST.json` tracks every downloaded asset (samsy.ninja + b-cdn) — guarantees textures derive from the original, preserving parity.

### I. Reduced-motion (consistency/accessibility gap)
- [ ] `globals.css` honors `prefers-reduced-motion: reduce` (CSS anims off).
- [ ] **GAP:** the Three.js render loop + GSAP are **not** gated by the same media query → WebGL keeps animating. Inconsistent accessibility behavior; decide whether to gate the canvas too.

---

## Part 3 — Style-Consistency Analysis (findings)

**Strengths (internally consistent today):**
1. A single, tight color language — brand red `#ff0033`, near-black, warm-white — reinforced by the warm-red `bloomTint` and the CRT screen-blend. The look is coherent.
2. One post chain (`sourceComposite`) grades everything uniformly, so no surface can drift out of the neon-CRT aesthetic.
3. Flat-sky + reflective-floor + selective-bloom is a disciplined, minimal samsy-style world; nothing competes for attention.
4. All *active* textures trace back to the original samsy assets via the manifest, so parity is structurally enforced.

**Risks / inconsistencies to resolve:**
1. **Two reds.** `#ff0033` (brand) vs `#ff3366` (kill-switch). The split is intentional, but it's a fragile convention — easy to leak `#ff3366` into normal UI. Keep a lint/comment guard.
2. **Archived billboards.** `derivative`/`akira` video planes are mounted but `visible=false`. Their re-enable path must re-apply the same CRT/bloom grade or they'll pop visually.
3. **Dormant asset sprawl.** ~20 downloaded assets (atlases, BMFont, VRM, preloader, loading.mp4, 23 videos) are unmounted. Not a style bug, but a consistency risk: if any get wired in later without the CRT grade + brand palette, they'll break the look. Wire them through the same material/post pipeline.
4. **Reduced-motion gap.** CSS respects the user's preference; WebGL does not. Either gate the canvas render on the same query or document the exception.

**Bottom line:** The *currently rendered* experience is style-consistent. The exposure is in (a) the two archived video billboards, and (b) the unmounted asset library that will need to inherit the CRT+brand pipeline when activated. The checklist in Part 2 is the gate to keep those future additions consistent. (Characters and Audio are excluded from consistency scope — see note at top of Part 2.)
