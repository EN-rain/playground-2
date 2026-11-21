# 3D Interaction Matrix

| Input | Original observation | Clone implementation | Evidence |
| --- | --- | --- | --- |
| W / Up | Moves the player forward through the cybercity | Moves avatar on negative Z with bounded world limits and camera follow | measured |
| S / Down | Moves backward | Moves avatar on positive Z | measured |
| A / Left | Strafes/turns left | Moves avatar on negative X and rotates toward travel direction | measured |
| D / Right | Strafes/turns right | Moves avatar on positive X and rotates toward travel direction | measured |
| Space | Jumps; tutorial explicitly labels SPACE/JUMP | Gravity-based jump with grounded reset and local jump sound | extracted + measured |
| Pointer move | Scene/camera responds subtly and powers raycast hover states | Subtle camera parallax in every mode | inferred/approximated |
| Click/tap navigation | EXPLORE, WORKS, ABOUT switch application modes | Semantic buttons update mode and browser history | measured |
| Wheel in Works | Advances the selected project with a transition/cooldown | Advances the local 25-project carousel with 650 ms input lock | extracted + measured |
| Arrow keys in Works | Nxt/Prev project navigation is exposed | Previous/next project | measured |
| Project INFOS | Opens a full-screen project explanation | Accessible modal with exact extracted project copy | extracted |
| Project VISIT | Opens external work URL | Opens exact extracted URL in new tab | extracted |
| Mobile controls | Runtime bundle contains joystick/touch control paths | Visible touch D-pad and jump control | extracted + approximated |
| Resize | Original renderer and UI recompose | Renderer/FOV/DPR and CSS layouts update | measured |
| Reduced motion | Not fully observable | Disables CSS tunnel/loading animation; 3D remains usable | approximated fallback |

## Constraints and Reset

- Explore movement is bounded to the reconstructed city area.
- Jump cannot retrigger until the avatar returns to ground level.
- Mode changes close the project-information modal.
- Works wheel navigation ignores very small deltas and repeated input during its cooldown.
- Browser back/forward synchronizes the current application mode.
- Direct `/works` and `/about` routes render the same persistent experience and initialize the correct state.
