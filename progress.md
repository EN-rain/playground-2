# Cyberpunk Profile / SMSY Clone — Progress

**Updated:** 2026-08-03
**Active project folder:** `cyberpunkprofile` (this folder)

> There is a separate, older sibling folder at `../samsy clone` with its own
> `SAMSY_AGENT_HANDOFF.md`. That is a **different lineage** of this project,
> not this one. Do not read its state as current for `cyberpunkprofile`, and
> do not copy files between the two without checking which one the person
> actually means.

This file is the single source of truth for **current** state. If anything
elsewhere (including `SAMSY_AGENT_HANDOFF.md` in this folder) conflicts with
this file, this file wins — update it whenever you change architecture,
archive/restore something, or add a runtime marker.

---

## Current phase

Rebuilding the city from an empty slate: a shaped reflective floor, a main
billboard, and moonlit lighting near spawn. The original kit city is fully
built in memory but **hidden and archived** — see below — while new custom
buildings are designed in Blender (`reference.blend`) and hand-written as
Three.js geometry in `CyberCityCanvas.tsx` (no GLB export/import round-trip
for new work).

---

## ⚠️ Archived / hidden things — reference only

**Nothing below this line is deleted.** Everything here is intentionally kept
in memory/scene-graph but hidden and stripped from collision, purely so later
work has something to compare against or read a texture/geometry from. Do not
re-enable, delete, or "clean up" any of it without the person asking —
"archived" here means *paused*, not *finished with*.

| Asset | State | Why it's kept |
|---|---|---|
| `cityRoot` — full kit-instanced city (`block_0/1/2`, `distributor_0/1`, `garbage`, `crossing_0/1`, `tower`, `map`, `barrier`, `wall_0`, `mac`, `buildingramp`, `samsy_logo`, `nintendo`, `notnyc_logo` — the whole `samsy-world-layout.json` set) | `cityRoot.visible = false`; its meshes are stripped out of `collisionMeshes` / `groundMeshes` / `cameraCollisionSurfaces` after being built | The main billboard's screen material and proportions are read from a `/screen/` mesh inside it at build time — still needed as a texture/geometry **source**, not just left over |
| `derivative.webm` — far-field decorative video plane | `visible = false`, `autoplay = false`, kept in scene graph | Restore target once new far-world design calls for it again |
| `akira.webm` — near-spawn "works" video plane | `visible = false`, `autoplay = false`, kept in scene graph | Same — restore only when the new design specifically wants a video board there |
| Custom spawn tower (`buildingGroup`, box body + rooftop rail) | **Fully removed**, not just hidden — this one really is gone | Player no longer spawns on a rooftop; spawn is at ground level now (see below). If you want it back, it needs to be rebuilt from scratch, not un-hidden |

Runtime markers that reflect this (read via `renderer.domElement.dataset`):

```text
worldLayout        = archived-kit-instances-pending-new-buildings
archivedBillboards = decorative-video,works-video
cityInstanceCount  = <kit instance count, still built, just hidden>
```

---

## Live / active right now

### Main Billboard (kit-referenced, not a placeholder)

Rebuilt to match the **archived kit screens' actual treatment** instead of a
flat color panel:

- Texture: real `map` sampled from the first `/screen/`-named mesh found by
  traversing the (hidden) `cityRoot` — same source the kit signs use
- Material: `createSourceScreenMaterial()` — identical function the kit
  screens use (PCG RGB burst, whole-panel flicker keyed off world origin, UV
  tint + alpha discard, `MeshBasicMaterial`, `toneMapped: false`, `DoubleSide`)
- Bloom: `layers.enable(BLOOM_SCENE_LAYER)`, registered in
  `animatedScreenMaterials` so the per-frame `uScreenTime` update drives it
- Size: kit mesh bounding-box width/height × 1.35, clamped to 14×20
- Object name: `"main-billboard"` (matches the Blender reference object
  `Main Billboard` in `reference.blend` by name, on purpose)
- Position: ground-level now — `(ORIGINAL_SPAWN.x, panelH/2 + 0.4,
  ORIGINAL_SPAWN.z + 22)` (previously offset by the now-removed tower's
  height; that offset is gone)

A second kit-derived screen is stacked directly above the main board. It uses
the next distinct `/screen/` texture discovered in the archived city rather than
copying the main billboard artwork. It is 82% of the main width and 42% of its
height, with a proportional clear gap, while sharing the RGB-glitch/flicker
material treatment and bloom layer. Its object name is `upper-main-billboard`;
the original main board remains unchanged.

```text
customBillboard      = kit-screen-texture-animated-bloom
customBillboardSize  = <panelW>x<panelH>
upperBillboard       = distinct-kit-screen-texture-animated-bloom
upperBillboardSize   = <upperPanelW>x<upperPanelH>
upperBillboardGap    = <clear vertical gap>
```

### Floor — reverted to the `samsy clone` reference plane

A blanket `25,000 × 25,000` reflective plane, matching the sibling
`../samsy clone` project's `CyberCityCanvas.tsx` floor exactly —
`new THREE.PlaneGeometry(25_000, 25_000, 20, 20)` feeding the same
`Reflector` + `originalMaskedReflectorShader` setup as before. A road/plaza
shape traced from `reference.blend` was tried and then **reverted** in favor
of matching the `samsy clone` reference — if a shaped floor is wanted again
later, start from that earlier attempt's approach (`THREE.Shape` +
`ShapeGeometry`, with UVs manually remapped to the plane's world-space UV
formula so the shader's tiling frequency doesn't compress), not from
scratch.

```text
floorSurface           = original-masked-reflector
floorGrid              = dual-scale-reflection-mask
floorGridSpacing       = 50-unit-macro-10-unit-fine
floorReflectorResolution = 0.75
```

### Spawn point

Ground-level. Baked from the person's in-game **M1** HUD mark:

```text
ORIGINAL_SPAWN = (46.23, 0, -225.65)
player.position = ORIGINAL_SPAWN
```

Floor road/plaza and main billboard offsets are relative to `ORIGINAL_SPAWN`,
so they recenter with this value. Camera spawn target uses the same point.
`SPAWN_TOWER_HEIGHT` is gone (no rooftop spawn).

### Lighting — day/night system

- `hemiLight` — hemisphere light, retuned per mode
- `moonLight` — cool-blue `DirectionalLight` (`0xaec2ff`), soft shadows
  (`PCFSoftShadowMap`, 2048² shadow map, shadow camera frustum ±180 units
  around spawn), the key light at night
- `sunLight` — day-mode key light (added alongside moonlight)
- `dayAmbient` — flat ambient fill, day-mode only
- Existing neon accents (`redLight`, `cyanLight`, `magentaLight`) dial down
  in day mode, up at night
- `applyDayMode(enabled)` toggles all of the above plus scene background/fog/
  clear color/tone-mapping exposure and the floor shader's `dayBoost`
  uniform; wired to a `DAY`/`NIGHT` toggle button (top-left) in
  `SamsyExperience.tsx` via `dayModeRef`/`applyDayModeRef`

```text
moonlight = cool-directional-key-light-with-soft-shadows
lightMode = day | night
```

Note: the reflective floor's shader is unlit/custom (its "lighting" is the
baked reflection + bump mask, not scene lights), so moonlight/sunlight
mainly affect standard-material objects — currently the VRM player avatar —
and will light up new buildings once they're added with standard materials.

---

## Known limitations / approximations (labeled honestly, not guessed silently)

- With the kit city's ramp/ground meshes archived out of `groundMeshes`,
  ground-height sampling falls back to `y = 0` everywhere (see
  `sampleGroundHeight`'s `groundMeshes.length === 0` early return) — this is
  an existing fallback in the code, not something added for this phase, but
  it's now doing more work since there's so little real ground geometry.
- Exact spawn/road-entrance centering is still eyeballed pending the
  person's `M1` coordinates (see above). The floor itself is back to the
  plain blanket plane (no shaped road/plaza), so this only affects where
  `ORIGINAL_SPAWN` and the billboard sit, not the floor's extent.

---

## Next

1. Model real Main Billboard frame/structure in Blender for reference; keep
   or swap the live screen panel accordingly.
3. Hand-write new custom buildings as Three.js geometry (primitives /
   `THREE.Shape` etc.) using Blender purely for visual/proportion reference —
   no GLB export/import for this new work.
4. Restore the two archived video boards only where/if the new design
   specifically wants them.
5. Re-enable collision on new structural meshes as they're added; the
   archived kit city's collision remains stripped in the meantime.
