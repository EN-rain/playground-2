# Character Deep Recon — Session 2026-08-02

## Scope

Focused re-examination of the player/avatar character only (face, silhouette,
proportion, emissive presentation). Explicitly out of scope: floor, billboards,
buildings, camera, physics — those are covered by their own recon docs.

## Method and a hard limitation hit this session

The intent was a fresh live capture: open `https://samsy.ninja/`, orbit tightly
around the spawned avatar, and record close, well-framed reference frames of
just the head/face.

That did not happen. Two different failure signatures were observed across this
session, and the second one changes the diagnosis:

1. The local Auvrynt Playwright browser could not complete navigation to
   `https://samsy.ninja/` — `page.goto` timed out at 15s even on
   `waitUntil: domcontentloaded`. A plain `curl` request and a server-side
   fetch of the same URL both succeeded quickly (curl: `200` in ~2.2s) and
   returned normal HTML/meta (`og:image` at `/textures/media.png`, standard
   SMSY-Gen02 meta tags), with DNS resolving correctly. Taken alone, that
   combination (simple HTTP client works, full browser navigation doesn't)
   initially looked like anti-automation/bot detection blocking headless
   Chromium specifically.
2. However, the operator then tried loading `https://samsy.ninja/` in their
   own regular (non-automated) browser on the same machine, and **it also got
   stuck on the loading screen.** That rules out the bot-detection theory:
   real browsers are stuck too, not just headless ones.

**Corrected diagnosis:** `curl`/server-side fetches only pull the initial HTML
shell, which is small and fast. They never execute the site's JS or wait on
its WebGPU asset pipeline (GLB models, textures, videos), so they can succeed
even if the app itself never becomes interactive. The evidence now points to
the live site's asset loading being stuck or failing for real users right now
— a genuine availability problem on the SMSY side, not a local network,
firewall, or automation-detection issue. This is not something fixable from
either the operator's machine or from this environment.

**Action needed before a real deep recon can happen:** simply retry
`https://samsy.ninja/` in a normal browser periodically until it loads past
the preloader normally, then redo this recon with fresh tight-framed captures
per the plan in the "Recommended next capture" section below. There is no
local configuration to change.

## What this recon actually used instead

In place of fresh capture, the following **pre-existing** original-site
evidence was re-inspected at higher resolution (downscaled via `sharp` to fit
inline viewing limits, content unchanged):

- `docs/design-references/deep-recon-live/original-spawn.png`
- `docs/design-references/deep-recon-live/original-pitch-down.png`
- `docs/design-references/deep-recon-live/original-yaw-left.png`
- `docs/design-references/deep-recon-live/original-spawn-orbit-crops.jpg`
- `docs/design-references/deep-recon-live/original-center-detail.jpg`
- `docs/design-references/deep-recon-live/original-spawn-preview.jpg`

Compared against the clone's current avatar presentation via:

- `docs/design-references/lighting-billboards-v4/clone-avatar-row.png`
- `docs/design-references/lighting-billboards-v4/clone-avatar-row-dark-center.jpg`

Per the evidence hierarchy in `SAMSY_AGENT_HANDOFF.md` §19, these are original
production/runtime captures previously verified as valid (not black-canvas
failures), so they're usable evidence — but they are wide establishing/orbit
shots around the whole spawn area, not tight face crops, so precision on
fine facial geometry is limited. That's called out explicitly below rather
than papered over.

## Findings

### Confirmed (reasonable confidence)

- **Silhouette**: dark, compact, full-body humanoid in every original frame —
  consistent with the clone's dark body tint (`0x24242c`).
- **Emissive color and placement**: every original frame shows a warm/red
  emissive highlight concentrated at head height, matching the clone's
  red-eye/mouth direction and hue (`0xff0000` eyes/mouth, `0xff003d` halo
  light).

### Divergent (medium confidence — worth investigating further)

- **Glow shape**: the original's head-height glow reads as a **single,
  tighter, brighter cluster**, not clearly two separated wide-set spheres.
  The clone's current geometry (two 0.035-radius eye spheres at
  `±0.055` local X, plus a 3-segment zigzag mouth) may read as more spread
  out / more "printed-on" than the source. This is a visual impression from
  low/medium-resolution wide shots, not a measurement — treat as a hypothesis
  to verify with tight close-ups, not a confirmed defect.
- **Proportion**: the original avatar reads slightly slimmer relative to the
  environment scale than the clone's current avatar-row proxies, which look
  a bit boxier. Also an impression, not a measurement.

### Unresolved — needs tight close-up evidence

- Exact eye size and spacing.
- Exact mouth geometry (is it actually a zigzag, or a simpler shape?).
- Whether the head glow is a lit/bloomed sphere or a flat emissive decal —
  can't distinguish at the resolution available in existing captures.
- Any subtle animation on the face itself (blink, mouth movement) — none of
  the existing frames are a sequence tight enough on the face to tell.

## Recommendation — do not change the face overlay code from this recon alone

The "glow shape" and "proportion" findings above are impressions from
non-ideal source material, not confirmed measurements. Given
`SAMSY_AGENT_HANDOFF.md` §21's standing rule ("Do not tune lighting from one
random video frame" / don't trust low-evidence visual impressions as proof of
structural similarity), the pending face-overlay work
(`vScreenOriginZ`-style attach-to-head-bone changes already checked in) should
be verified against real tight close-ups before any further geometry tuning,
not against this recon.

## Recommended next capture (once local browser connectivity is fixed)

1. Load `https://samsy.ninja/`, enter pointer-lock, and orbit the camera to
   frame **only the head and shoulders** of the player avatar — not the
   whole spawn plaza.
2. Capture at minimum 3 angles: front, 3/4, and profile.
3. Capture at least one frame with the camera as close as the near-clip
   allows, to resolve eye/mouth geometry pixel-for-pixel.
4. If the original avatar animates (blink, idle motion), capture a short
   `HTMLCanvasElement.captureStream()` recording rather than a screenshot —
   per `SAMSY_AGENT_HANDOFF.md` §19, Playwright screenshots have previously
   returned black canvases for WebGPU content; canvas-stream capture was the
   method that worked.
5. Save outputs under `docs/design-references/character-recon-v1/` and update
   this document with real measurements once captured.
