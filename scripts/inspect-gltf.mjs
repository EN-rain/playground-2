import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { writeFile } from 'node:fs/promises';

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Pass one or more GLB/VRM files.');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const file of files) {
  const document = await io.read(file);
  const root = document.getRoot();
  const nodes = root.listNodes().map((node, index) => ({
    index,
    name: node.getName(),
    parent: node.getParentNode()?.getName() ?? null,
    children: node.listChildren().map((child) => child.getName()),
    translation: node.getTranslation(),
    rotation: node.getRotation(),
    scale: node.getScale(),
    mesh: node.getMesh()?.getName() ?? null,
    camera: node.getCamera()?.getName() ?? null,
    skin: node.getSkin()?.getName() ?? null,
    weights: node.getWeights(),
  }));
  const meshes = root.listMeshes().map((mesh, index) => ({
    index,
    name: mesh.getName(),
    primitives: mesh.listPrimitives().map((primitive) => ({
      mode: primitive.getMode(),
      material: primitive.getMaterial()?.getName() ?? null,
      attributes: primitive.listSemantics(),
      targets: primitive.listTargets().length,
    })),
  }));
  const materials = root.listMaterials().map((material, index) => ({
    index,
    name: material.getName(),
    baseColorFactor: material.getBaseColorFactor(),
    emissiveFactor: material.getEmissiveFactor(),
    metallicFactor: material.getMetallicFactor(),
    roughnessFactor: material.getRoughnessFactor(),
    alphaMode: material.getAlphaMode(),
    doubleSided: material.getDoubleSided(),
    unlit: Boolean(material.getExtension('KHR_materials_unlit')),
  }));
  const result = {
    file,
    scenes: root.listScenes().map((scene) => ({ name: scene.getName(), children: scene.listChildren().map((child) => child.getName()) })),
    cameras: root.listCameras().map((camera) => ({
      name: camera.getName(),
      type: camera.getType(),
      yfov: camera.getYFov(),
      znear: camera.getZNear(),
      zfar: camera.getZFar(),
    })),
    nodes,
    meshes,
    materials,
    animations: root.listAnimations().map((animation) => ({
      name: animation.getName(),
      channels: animation.listChannels().length,
      samplers: animation.listSamplers().length,
    })),
    extensionsUsed: root.listExtensionsUsed().map((extension) => extension.extensionName),
  };
  const output = `docs/research/samsy/${file.split(/[\\/]/).pop().replace(/\.[^.]+$/, '')}-structure.json`;
  await writeFile(output, JSON.stringify(result, null, 2));
  console.log(output, `${nodes.length} nodes`, `${meshes.length} meshes`, `${materials.length} materials`);
}
