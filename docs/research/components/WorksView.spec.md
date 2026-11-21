# WorksView Specification

## Overview
- **Target:** Works branch in `src/components/samsy/SamsyExperience.tsx`
- **Reference:** `docs/design-references/3d/samsy-works-05.png`
- **Interaction model:** wheel, click/tap, arrow keyboard, modal

## Content
- 25 exact projects extracted from the production bundle and stored in `src/data/projects.json`.
- Local WebM counterpart for every project under `public/videos/works/`.
- Exact title, short title, subtitle, tags, description, information copy, visit URL, optional award/case link.

## Composition
- Centered 16:8.1 video panel over the persistent city.
- Dark left gradient and CRT scanline treatment.
- Large red project title and red pill actions.
- Bottom rail with 25 positions, active project label, and previous/next controls.
- Persistent sound control remains separate at bottom right.

## Behavior
- Video autoplays, loops, is muted, and uses `playsInline`.
- Wheel and arrow input change project.
- Click on any rail position selects that project.
- INFOS opens an accessible modal with extracted long description.
- VISIT opens the target URL in a new tab.
- Mode change closes the modal.

## Responsive
- Panel width increases to 94vw below 980 px.
- Long description/tags hide in the compact presentation frame.
- Rail remains horizontally compressed but keeps the selected project readable.

## Acceptance
- Every project can be reached.
- Project index wraps at both ends.
- No work video is hotlinked.
