# Markdown Usage Audit

The new `samsy clone` project was created from the complete upgraded `clone workflow` folder. All 19 Markdown files were copied, enumerated, hashed, and accounted for before implementation.

## Source-of-Truth Files

| File | How it was used |
| --- | --- |
| `AGENTS.md` | Applied project structure, exact-fidelity rules, Next.js 16 requirements, system-level 3D rules, evidence labels, build commands, and synchronization requirements. |
| `.claude/skills/clone-website/SKILL.md` | Applied the full reconnaissance → foundation → component/scene specification → build → assembly → visual QA workflow. |
| `docs/research/INSPECTION_GUIDE.md` | Used for visual audit, design tokens, component inventory, layout architecture, interaction capture, and stack analysis. |
| `docs/research/INTERACTIVE_3D_INSPECTION_GUIDE.md` | Used for passive 3D detection, asset manifest, canvas map, deterministic states, interaction matrix, scene specification, performance/lifecycle requirements, and limitations reporting. |
| `README.md` | Used the documented template structure, commands, output folders, and supported-agent workflow. |
| `CHANGELOG.md` | Reviewed to understand the template revision history and intended current workflow behavior. |
| `CLAUDE.md` | Confirmed it imports the shared project rules rather than defining conflicting behavior. |
| `GEMINI.md` | Confirmed it imports the shared project rules rather than defining conflicting behavior. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Used its verification/documentation expectations as a final completeness check even though no pull request was created. |

## Synchronized Skill Copies

These files are generated platform representations of `.claude/skills/clone-website/SKILL.md`. Each copy was retained and validated so the completed Samsy workflow remains usable from every supported agent:

- `.augment/commands/clone-website.md`
- `.codex/skills/clone-website/SKILL.md`
- `.continue/commands/clone-website.md`
- `.cursor/commands/clone-website.md`
- `.github/skills/clone-website/SKILL.md`
- `.opencode/commands/clone-website.md`
- `.windsurf/workflows/clone-website.md`

## Synchronized Agent-Rule Copies

These files are generated from `AGENTS.md`. Each was retained and checked as part of the cross-agent project setup:

- `.amazonq/rules/project.md`
- `.continue/rules/project.md`
- `.github/copilot-instructions.md`

## Result

The authoritative Markdown files directly guided the work. Generated copies were not treated as separate contradictory instructions; they were validated as synchronized platform outputs and preserved in the new folder. The target-specific evidence, specs, QA, and limitations generated during this clone are also stored under `docs/research/`.
