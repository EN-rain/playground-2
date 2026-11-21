
 OVERVIEW
 ────────────────────────────────────────────
| key                | value                                                                                                                        |
| ---                | ---                                                                                                                          |
| version            | 2.0                                                                                                                          |
| generator          | VRM Add-on for Blender v2.20.86 with Khronos glTF Blender I/O v4.2.57                                                        |
| extensionsUsed     | KHR_materials_unlit, KHR_materials_emissive_strength, VRMC_materials_mtoon, KHR_texture_transform, VRMC_vrm, VRMC_springBone |
| extensionsRequired | none                                                                                                                         |


warn: Missing optional extension, "VRMC_materials_mtoon".
warn: Missing optional extension, "VRMC_vrm".
warn: Missing optional extension, "VRMC_springBone".

 SCENES
 ────────────────────────────────────────────
| #   | name  | rootName | bboxMin                    | bboxMax                  | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---   | ---      | ---                        | ---                      | ---                | ---               | ---                    |
| 0   | Scene | obake    | -0.5031, 0.06136, -0.60578 | 0.5031, 1.05231, 0.20853 | 2,646              | 552               | 552                    |

¹ Expected number of vertices processed by the vertex shader for one render
  pass, without considering the vertex cache.

² Expected number of vertices uploaded to GPU, assuming each Accessor
  is uploaded only once. Actual number uploaded may be higher, 
  dependent on the implementation and vertex buffer layout.

³ Expected number of vertices uploaded to GPU, assuming each Primitive
  is uploaded once, duplicating vertex attributes shared among Primitives.



 MESHES
 ────────────────────────────────────────────
| #   | name             | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                                                                                                                     | instances | size¹    |
| --- | ---              | ---       | ---            | ---          | ---      | ---     | ---                                                                                                                            | ---       | ---      |
| 0   | cozyblanket_pull | TRIANGLES | 1              | 882          | 552      | u16     | COLOR_0:u8_norm, COLOR_1:f32, JOINTS_0:u8, JOINTS_1:u8, NORMAL:f32, POSITION:f32, TEXCOORD_0:f32, WEIGHTS_0:f32, WEIGHTS_1:f32 | 1         | 53.87 KB |

⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are
  shared by other mesh primitives, but the meshes themselves are not reused, then
  the sum of all mesh sizes will overestimate the asset's total size. See "dedup".



 MATERIALS
 ────────────────────────────────────────────
| #   | name                  | instances | textures         | alphaMode | doubleSided |
| --- | ---                   | ---       | ---              | ---       | ---         |
| 0   | ゴースト_ブラック_owo | 1         | baseColorTexture | OPAQUE    | ✓           |



 TEXTURES
 ────────────────────────────────────────────
| #   | name             | uri | slots            | instances | mimeType   | compression | resolution | size     | gpuSize⁵ |
| --- | ---              | --- | ---              | ---       | ---        | ---         | ---        | ---      | ---      |
| 0   | ブラック_owo.jpg |     | baseColorTexture | 1         | image/jpeg |             | 2048x2048  | 99.86 KB | 22.37 MB |
| 1   | 無題.jpg         |     |                  | 0         | image/jpeg |             | 1024x1024  | 80.24 KB | 5.59 MB  |

⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require
  additional memory for GPU compression formats.



 ANIMATIONS
 ────────────────────────────────────────────
No animations found.

