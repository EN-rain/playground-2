import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projects = JSON.parse(await readFile('docs/research/samsy/projects.json', 'utf8'));
const assets = [
  ['https://samsy.ninja/models/cyberfix.glb', 'public/models/cyberfix.glb', 'model'],
  ['https://samsy.ninja/vrm/owo3.vrm?gpu=true&Af', 'public/models/owo3.vrm', 'model'],
  ['https://samsy.ninja/vrm/owo7.vrm?gpu=true&QM%20eA', 'public/models/owo7.vrm', 'model'],
  ['https://samsy.ninja/textures/atlasemoji.png', 'public/textures/atlasemoji.png', 'texture'],
  ['https://samsy.ninja/textures/noisebake.png', 'public/textures/noisebake.png', 'texture'],
  ['https://samsy.ninja/textures/faces8.png', 'public/textures/faces8.png', 'texture'],
  ['https://samsy.ninja/textures/bump-floor_fxrdig.jpg', 'public/textures/bump-floor_fxrdig.jpg', 'texture'],
  ['https://samsy.ninja/textures/media.png', 'public/seo/media.png', 'image'],
  ['https://samsy.ninja/interaction/ui2.png', 'public/images/ui2.png', 'image'],
  ['https://samsy.ninja/interaction/ui2.json', 'public/images/ui2.json', 'data'],
  ['https://samsy.ninja/preloader/preloader.png', 'public/images/preloader.png', 'image'],
  ['https://samsy.ninja/front/quest4.svg', 'public/images/quest4.svg', 'image'],
  ['https://samsy.ninja/front/triangle.svg', 'public/images/triangle.svg', 'image'],
  ['https://samsy.ninja/videos/loading.mp4', 'public/videos/loading.mp4', 'video'],
  ['https://samsy.ninja/bmfont/formadjrregular.json', 'public/fonts/formadjrregular.json', 'font-data'],
  ['https://samsy.ninja/bmfont/formadjrregular.png', 'public/fonts/formadjrregular.png', 'font-texture'],
  ['https://samsy.ninja/bmfont/formadjrbold.json', 'public/fonts/formadjrbold.json', 'font-data'],
  ['https://samsy.ninja/bmfont/formadjrbold.png', 'public/fonts/formadjrbold.png', 'font-texture'],
  ['https://samsy.ninja/favicons/favicon.ico', 'public/seo/favicon.ico', 'icon'],
  ['https://samsy.ninja/favicons/favicon-16x16.png', 'public/seo/favicon-16x16.png', 'icon'],
  ['https://samsy.ninja/favicons/favicon-32x32.png', 'public/seo/favicon-32x32.png', 'icon'],
  ['https://samsy.ninja/favicons/apple-touch-icon.png', 'public/seo/apple-touch-icon.png', 'icon'],
  ['https://samsy.ninja/favicons/android-chrome-192x192.png', 'public/seo/android-chrome-192x192.png', 'icon'],
  ['https://samsy.ninja/favicons/android-chrome-512x512.png', 'public/seo/android-chrome-512x512.png', 'icon'],
];

for (const filename of ['slugabedsky.opus', 'notification.opus', 'hi.opus', 'jump.opus', 'hover.opus', 'text.opus']) {
  assets.push([`https://smsygen02.b-cdn.net/${filename}`, `public/audio/${filename}`, 'audio']);
}

for (const project of projects) {
  const filename = project.video.replace(/\.mp4$/i, '.webm');
  assets.push([`https://smsygen02.b-cdn.net/${filename}`, `public/videos/works/${filename}`, 'video']);
}

const manifest = [];
const headers = {
  'user-agent': 'Mozilla/5.0',
  referer: 'https://samsy.ninja/',
  origin: 'https://samsy.ninja',
};

for (let index = 0; index < assets.length; index += 1) {
  const [url, localPath, kind] = assets[index];
  await mkdir(path.dirname(localPath), { recursive: true });
  process.stdout.write(`[${index + 1}/${assets.length}] ${localPath} ... `);
  try {
    const response = await fetch(url, { headers, redirect: 'follow' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, bytes);
    manifest.push({
      url,
      localPath,
      kind,
      status: 'downloaded',
      source: 'network',
      evidence: 'extracted',
      contentType: response.headers.get('content-type'),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    console.log(`${bytes.length} bytes`);
  } catch (error) {
    manifest.push({
      url,
      localPath,
      kind,
      status: 'failed',
      source: 'network',
      evidence: 'extracted',
      notes: error instanceof Error ? error.message : String(error),
    });
    console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await writeFile('docs/research/3D_ASSET_MANIFEST.json', JSON.stringify(manifest, null, 2));
const successful = manifest.filter((item) => item.status === 'downloaded');
console.log(`Downloaded ${successful.length}/${manifest.length} assets (${successful.reduce((sum, item) => sum + item.bytes, 0)} bytes).`);
