# AboutView Specification

## Overview
- **Target:** About branch in `src/components/samsy/SamsyExperience.tsx`
- **Reference:** `docs/design-references/3d/samsy-about-05.png`
- **Interaction model:** static copy, animated background, external links

## Composition
- Persistent header remains visible.
- Large SMSY title begins below the header identity.
- English copy occupies the left column.
- Japanese copy occupies the adjacent column.
- Contact links sit at bottom left.
- Credits sit at bottom right.
- City remains visible under a dark overlay and perspective streak field.

## Typography and Color
- Local Forma DJR Display.
- Primary text `#ff0033`.
- Large title approximately 139 px desktop.
- Body copy at `max(1.25vw, 18px)` with `max(1.458vw, 21px)` line height, matching extracted CSS.

## Content
The English and Japanese biography, contact email, X profile, LinkedIn profile, and all three credit links are verbatim from the target bundle.

## Responsive
- Below 980 px, the content becomes a scrollable single English column.
- Japanese and credits hide when the viewport cannot accommodate the original two-column arrangement.
- Large title reduces to 73–110 px.

## Acceptance
- Links are pointer-accessible despite the decorative canvas.
- No duplicated header identity overlaps the title.
- World stays mounted and darkens rather than flashing to an unrelated background.
