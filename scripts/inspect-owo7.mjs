#!/usr/bin/env node
// inspect-owo7.mjs — dump meshes, materials, and UV bounds of owo7.vrm
import { NodeIO } from "@gltf-transform/core";

const doc = await new NodeIO().read("public/models/owo7.vrm");
const root = doc.getRoot();

console.log("=== meshes ===");
for (const mesh of root.listMeshes()) {
  console.log(`mesh: "${mesh.getName()}" prims=${mesh.listPrimitives().length}`);
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    const uv = prim.getAttribute("TEXCOORD_0");
    let uvStr = "none";
    if (uv) {
      const mn = [0, 0], mx = [0, 0];
      uv.getMin(mn); uv.getMax(mx);
      uvStr = `min=(${mn[0].toFixed(3)},${mn[1].toFixed(3)}) max=(${mx[0].toFixed(3)},${mx[1].toFixed(3)})`;
    }
    console.log(`   material="${mat?.getName()}" baseColor=${mat?.getBaseColorFactor()} alphaMode=${mat?.getAlphaMode()} uv=${uvStr}`);
  }
}

console.log("\n=== materials ===");
for (const m of root.listMaterials()) {
  console.log(`material: "${m.getName()}" baseColorFactor=${m.getBaseColorFactor()} emissive=${m.getEmissiveFactor()} baseTex=${m.getBaseColorTexture()?.getName() ?? "none"}`);
}

console.log("\n=== nodes (name -> mesh) ===");
for (const n of root.listNodes()) {
  const mesh = n.getMesh();
  if (mesh) console.log(`node "${n.getName()}" -> mesh "${mesh.getName()}"`);
}
