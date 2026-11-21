<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Current project state lives in `progress.md`

This template has been used to build an explorable Three.js cyberpunk city
(`src/components/samsy/CyberCityCanvas.tsx` + `SamsyExperience.tsx`). Before
making any change to that engine, read **`progress.md`** at the repo root —
it's the up-to-date source of truth for what's currently live, what's
archived/hidden (and why it's kept, not deleted), and what's still an open
question. Also read `.claude/skills/explorable-webgl-world/SKILL.md` and its
worked-example reference before editing that engine file. `SAMSY_AGENT_HANDOFF.md`
at the root has useful history but is partially superseded — see the banner
at its top.

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Radix primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** Vercel

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography, animation, and interaction states exactly
- **System-level 3D fidelity** — when WebGL/WebGPU is present, reproduce the camera, scene graph, materials, lighting, post-processing, timelines, input mapping, DOM synchronization, responsive composition, loading, lifecycle, and fallbacks rather than matching only one screenshot
- **Evidence before guessing** — label non-obvious 3D values as extracted, measured, inferred, or approximated
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and permitted assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    icons.tsx       # Extracted SVG icons as React components
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  images/           # Downloaded images from target site
  videos/           # Downloaded videos from target site
  models/           # 3D models and geometry buffers
  textures/         # Material and compressed textures
  environments/     # HDR/EXR/cubemap environments
  shaders/          # Extracted or reconstructed shader sources
  seo/              # Favicons, OG images, webmanifest
docs/
  research/         # Inspection output (design tokens, components, layout, behaviors)
    components/     # DOM component specifications
    scenes/         # Interactive 3D scene specifications
    INTERACTIVE_3D_INSPECTION_GUIDE.md
  design-references/ # Screenshots and visual references, including deterministic 3D checkpoints
scripts/            # Asset download, inspection, conversion, and QA scripts
```

## MOST IMPORTANT NOTES
- When launching Claude Code agent teams, ALWAYS have each teammate work in their own worktree branch and merge everyone's work at the end, resolving any merge conflicts smartly since you are basically serving the orchestrator role and have full context to our goals, work given, work achieved, and desired outcomes.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific instruction files.
- After editing `.claude/skills/clone-website/SKILL.md`, run `node scripts/sync-skills.mjs` to regenerate the skill for all platforms.

@docs/research/INSPECTION_GUIDE.md
@docs/research/INTERACTIVE_3D_INSPECTION_GUIDE.md
