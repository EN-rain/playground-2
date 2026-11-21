
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                            |
| ---                | ---                              |
| version            | 2.0                              |
| generator          | Khronos glTF Blender I/O v4.4.56 |
| extensionsUsed     | KHR_materials_unlit              |
| extensionsRequired | none                             |



 SCENES
 ────────────────────────────────────────────
| #   | name  | rootName | bboxMin                          | bboxMax                       | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---      | ---                              | ---                           | ---                | ---               | ---                    |
| 0   | Scene | block_0  | -61.65723, -11.50098, -150.95619 | 98.7695, 153.64931, 110.60088 | 47,145             | 38,450            | 38,450                 |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher, 
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                               | instances | size¹     |
| --- | ---        | ---       | ---            | ---          | ---      | ---     | ---                                      | ---       | ---       |
| 0   | Mesh_1     | TRIANGLES | 1              | 26           | 56       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 1.95 KB   |
| 1   | Mesh_0     | TRIANGLES | 1              | 1,489        | 3,337    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 115.72 KB |
| 2   | Mesh_0.016 | TRIANGLES | 1              | 325          | 716      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 24.86 KB  |
| 3   | Mesh_1.001 | TRIANGLES | 1              | 38           | 78       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 2.72 KB   |
| 4   | Mesh_0.001 | TRIANGLES | 1              | 2,599        | 6,499    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 223.56 KB |
| 5   | Cube.003   | TRIANGLES | 1              | 331          | 601      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 21.22 KB  |
| 6   | Mesh_1.002 | TRIANGLES | 1              | 62           | 124      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 4.34 KB   |
| 7   | Mesh_0.002 | TRIANGLES | 1              | 3,070        | 7,131    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 246.61 KB |
| 8   | Mesh_0.015 | TRIANGLES | 1              | 543          | 1,153    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 40.15 KB  |
| 9   | Mesh_0.004 | TRIANGLES | 1              | 236          | 623      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 21.35 KB  |
| 10  | Mesh_1.004 | TRIANGLES | 1              | 2            | 6        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 204 Bytes |
| 11  | Mesh_2.003 | TRIANGLES | 1              | 236          | 623      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 21.35 KB  |
| 12  | Mesh_3     | TRIANGLES | 1              | 2            | 6        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 204 Bytes |
| 13  | Mesh_4     | TRIANGLES | 1              | 120          | 288      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 9.94 KB   |
| 14  | Mesh_5     | TRIANGLES | 1              | 120          | 352      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 11.98 KB  |
| 15  | Mesh_6     | TRIANGLES | 1              | 96           | 222      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 7.68 KB   |
| 16  | Mesh_7     | TRIANGLES | 1              | 60           | 170      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 5.8 KB    |
| 17  | Mesh_8     | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 18  | Mesh_9     | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 19  | Mesh_10    | TRIANGLES | 1              | 12           | 24       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 840 Bytes |
| 20  | Mesh_11    | TRIANGLES | 1              | 8            | 16       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 560 Bytes |
| 21  | Mesh_13    | TRIANGLES | 1              | 112          | 251      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 8.7 KB    |
| 22  | Mesh_14    | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 23  | Mesh_12    | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 24  | Mesh_0.003 | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 25  | Mesh_1.003 | TRIANGLES | 1              | 2            | 4        | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 140 Bytes |
| 26  | Mesh_5.001 | TRIANGLES | 1              | 8            | 16       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 560 Bytes |
| 27  | Mesh_6.001 | TRIANGLES | 1              | 50           | 144      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 4.91 KB   |
| 28  | Mesh_0.011 | TRIANGLES | 1              | 10           | 28       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 956 Bytes |
| 29  | Mesh_2.001 | TRIANGLES | 1              | 3,748        | 9,841    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 337.4 KB  |
| 30  | Mesh_1.007 | TRIANGLES | 1              | 328          | 640      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 22.45 KB  |
| 31  | Mesh_0.010 | TRIANGLES | 1              | 12           | 24       | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 840 Bytes |
| 32  | Mesh_0.005 | TRIANGLES | 1              | 860          | 2,068    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 71.34 KB  |
| 33  | Mesh_1.008 | TRIANGLES | 1              | 428          | 1,248    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 42.5 KB   |
| 34  | Mesh_2.002 | TRIANGLES | 1              | 288          | 812      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 27.71 KB  |
| 35  | Mesh_3.001 | TRIANGLES | 1              | 384          | 1,035    | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 35.42 KB  |
| 36  | Mesh_4.001 | TRIANGLES | 1              | 50           | 148      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 5.04 KB   |
| 37  | Mesh_6.002 | TRIANGLES | 1              | 50           | 146      | u16     | NORMAL:f32, POSITION:f32, TEXCOORD_0:f32 | 1         | 4.97 KB   |

⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are
  shared by other mesh primitives, but the meshes themselves are not reused, then
  the sum of all mesh sizes will overestimate the asset's total size. See "dedup".



 MATERIALS
 ────────────────────────────────────────────
| #   | name           | instances | textures         | alphaMode | doubleSided |
| --- | ---            | ---       | ---              | ---       | ---         |
| 0   | Material_1     | 1         | baseColorTexture | BLEND     | ✓           |
| 1   | Material_0     | 1         | baseColorTexture | OPAQUE    |             |
| 2   | Material_1.001 | 1         | baseColorTexture | OPAQUE    | ✓           |
| 3   | Material_0.001 | 1         | baseColorTexture | OPAQUE    |             |
| 4   | Material_1.002 | 1         | baseColorTexture | OPAQUE    |             |
| 5   | Material_0.002 | 1         | baseColorTexture | OPAQUE    |             |
| 6   | propsitem      | 6         | baseColorTexture | OPAQUE    |             |
| 7   | propscreen     | 8         | baseColorTexture | OPAQUE    |             |
| 8   | wallmaterial   | 4         | baseColorTexture | OPAQUE    | ✓           |
| 9   | holo3D         | 2         | baseColorTexture | OPAQUE    | ✓           |
| 10  | Mat.1          | 1         | baseColorTexture | OPAQUE    | ✓           |
| 11  | Mat            | 1         | baseColorTexture | OPAQUE    | ✓           |
| 12  | Mat.002        | 6         | baseColorTexture | OPAQUE    | ✓           |



 TEXTURES
 ────────────────────────────────────────────
| #   | name    | uri | slots            | instances | mimeType   | compression | resolution | size      | gpuSize⁵ |
| --- | ---     | --- | ---              | ---       | ---        | ---         | ---        | ---       | ---      |
| 0   | Image_1 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 190.66 KB | 5.59 MB  |
| 1   | Image_0 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 50.55 KB  | 5.59 MB  |
| 2   | Image_1 |     | baseColorTexture | 1         | image/jpeg |             | 1080x1080  | 197.54 KB | 6.22 MB  |
| 3   | Image_0 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 54.78 KB  | 5.59 MB  |
| 4   | Image_1 |     | baseColorTexture | 1         | image/jpeg |             | 1080x1080  | 243.75 KB | 6.22 MB  |
| 5   | Image_0 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 52.61 KB  | 5.59 MB  |
| 6   | Image_2 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 100.62 KB | 5.59 MB  |
| 7   | Image_8 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 161.54 KB | 5.59 MB  |
| 8   | Image_1 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 144.74 KB | 5.59 MB  |
| 9   | Image_0 |     | baseColorTexture | 2         | image/jpeg |             | 1024x1024  | 109.05 KB | 5.59 MB  |
| 10  | Image_1 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 93.54 KB  | 5.59 MB  |
| 11  | Image_0 |     | baseColorTexture | 1         | image/jpeg |             | 1024x1024  | 194.04 KB | 5.59 MB  |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.

