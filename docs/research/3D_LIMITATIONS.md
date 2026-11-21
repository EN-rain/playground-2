# 3D Reconstruction Limitations

## Directly Extracted

- Production HTML, CSS, JavaScript bundle, project data, and public runtime resources.
- Cybercity GLB, both VRM files, embedded model textures, UI atlases, bitmap fonts, audio, and all 25 work videos.
- Original route states, visible copy, project metadata, navigation labels, links, timing checkpoints, and interaction labels.
- Source-extracted `C40` world instance map: 17 kit item types and 35 Explore instances with positions, Euler rotations, scales, and script metadata.
- Live original spawn, player radius, avatar scale, camera distance/FOV/polar limits, zoom/rotate settings, and source movement/jump constants.
- Original runtime identified itself as WebGPU during automated capture.

## Inferred or Approximated

- The original spawn, primary camera range, FOV, polar limits, source movement constants, jump profile, and world-instance transforms were recovered. Their broad behavior is no longer treated as a visual guess.
- The original private WebGPU material-node graph, post-processing shader response, dynamic screen-video assignment, full physics solver, and complete animation/network systems were not reconstructed byte-for-byte.
- The clone now recreates the source 35-instance kit layout and uses each instance's authored collision geometry for horizontal movement plus player-to-camera raycasts; exact capsule, slope, step, and solver behavior remains approximate.
- The clone uses Three.js WebGL, UnrealBloomPass, a Reflector plane, fog, and reconstructed lighting rather than claiming to reproduce the private renderer byte-for-byte.
- NPC quest objects are reconstructed from their observable red floating silhouettes and markers.
- Horizontal and vertical left-drag orbit, wheel zoom, and camera-relative movement are recreated. Not every original raycast hotspot, quest state, or in-world interaction has been recreated.
- The target's exact mobile joystick artwork and device-orientation behavior were not fully observable; the clone supplies an equivalent touch D-pad and jump control.

## Legal/Operational Boundary

All downloaded assets were publicly served by the target during inspection and are stored locally only for this requested reconstruction project. The clone does not hotlink runtime assets. Ownership, branding, and third-party asset licenses remain with their respective owners; publication or commercial redistribution should be reviewed separately.
