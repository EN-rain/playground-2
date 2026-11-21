# Original vs Current Clone — Visual Comparison V5

Reference: user-supplied original screenshot, 1919×893.
Candidate: `docs/design-references/lighting-billboards-v4/production-final-clonex.png`, 1919×893.

## Global tone

The whole-frame RGB distribution is close:

- Original mean RGB: 64.03 / 50.75 / 64.51
- Clone mean RGB: 62.91 / 49.51 / 64.16
- Original no-left-UI mean RGB: 66.64 / 53.63 / 68.58
- Clone no-left-UI mean RGB: 66.24 / 53.00 / 68.71

This does not mean the images are structurally close. The same total light is distributed into different objects and screen regions.

## Regional measurements

### Left UI and left city

- Original mean: 51.70 / 31.23 / 36.67
- Clone mean: 50.29 / 30.00 / 38.65
- Original dark-pixel fraction: 18.81%
- Clone dark-pixel fraction: 31.20%
- Original edge-gradient mean: 4.619
- Clone edge-gradient mean: 3.201

The clone has much more empty darkness and less fine structure. Its UI is smaller and lower-density, while missing original UI elements change the visual balance.

### Center city

- Original mean: 86.89 / 74.29 / 91.96
- Clone mean: 95.68 / 80.04 / 96.94
- Original edge-gradient mean: 5.140
- Clone edge-gradient mean: 4.278

The clone center is brighter but blurrier. The CLONEX presentation lacks the original's full red rectangular backing and surrounding screen hierarchy.

### Right city

- Original mean: 78.38 / 62.75 / 78.52
- Clone mean: 73.11 / 61.68 / 72.44
- Original dark-pixel fraction: 4.32%
- Clone dark-pixel fraction: 10.46%
- Original edge-gradient mean: 4.684
- Clone edge-gradient mean: 3.076

The clone right side is darker, softer, and less detailed. Several original panels and the local white/cyan lighting hierarchy are not reproduced correctly.

### Floor

- Original mean: 63.65 / 54.13 / 72.21
- Clone mean: 72.41 / 55.27 / 75.83
- Original saturation: 0.2810
- Clone saturation: 0.3617
- Original bright-pixel fraction: 0.58%
- Clone bright-pixel fraction: 2.13%
- Original edge-gradient mean: 3.604
- Clone edge-gradient mean: 2.404

The floor topology is close, but the final reflected result is too red/saturated, contains too many bright hotspots, and is blurrier than the original.

### Avatar/NPC band

- Original mean: 83.41 / 71.87 / 90.88
- Clone mean: 101.12 / 80.72 / 97.86
- Original bright-pixel fraction: 3.41%
- Clone bright-pixel fraction: 5.98%

The clone's repeated proxy cats are too large, too uniform, and too bright. The original remote avatars are smaller and more varied. The original foreground player is clearly visible; the clone foreground player is largely lost below the composition.

## Highest-impact remaining mismatches

1. Foreground player position/presentation is wrong.
2. Remote avatar row uses large repeated proxies instead of small varied avatars.
3. CLONEX center panel lacks the original red backing and correct physical size.
4. Right-side billboard hierarchy and density are wrong.
5. Clone uses too much global haze/softness; original text and screen edges are sharper.
6. Floor reflection is over-saturated and over-bright despite correct mask topology.
7. UI is incomplete: music player is absent, bottom-right status icon is wrong, compass is extra, and control/logo sizes differ.

## Honest status

- Global color and brightness: close.
- Floor mask/topology: close.
- Billboard temporal shader behavior: directionally close.
- Scene composition, local light placement, avatar presentation, and UI: not yet close enough for a faithful clone.
