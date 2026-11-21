import fs from 'node:fs';
import vm from 'node:vm';

function extractObjectLiteral(source, marker) {
  const startMarker = source.indexOf(marker);
  if (startMarker < 0) throw new Error(`Missing ${marker}`);
  const start = source.indexOf('{', startMarker);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unclosed object');
}

function readGlbJson(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('utf8', 0, 4) !== 'glTF') throw new Error('Not GLB');
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) return JSON.parse(data.toString('utf8').replace(/\0+$/g, ''));
    offset += 8 + length;
  }
  throw new Error('No JSON chunk');
}

const I = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function trs(t=[0,0,0], q=[0,0,0,1], s=[1,1,1]) { const [x,y,z,w]=q,[sx,sy,sz]=s,[tx,ty,tz]=t; return [
(1-2*y*y-2*z*z)*sx,(2*x*y+2*w*z)*sx,(2*x*z-2*w*y)*sx,0,
(2*x*y-2*w*z)*sy,(1-2*x*x-2*z*z)*sy,(2*y*z+2*w*x)*sy,0,
(2*x*z+2*w*y)*sz,(2*y*z-2*w*x)*sz,(1-2*x*x-2*y*y)*sz,0,
tx,ty,tz,1]; }
function eulerXYZ(x=0,y=0,z=0){const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3];}
function transform(m,p){const [x,y,z]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function empty(){return {min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};}
function addPoint(b,p){for(let i=0;i<3;i++){b.min[i]=Math.min(b.min[i],p[i]);b.max[i]=Math.max(b.max[i],p[i]);}}
function addBox(b,src,m=I()){for(const x of [src.min[0],src.max[0]])for(const y of [src.min[1],src.max[1]])for(const z of [src.min[2],src.max[2]])addPoint(b,transform(m,[x,y,z]));}
function finish(b){return {min:b.min,max:b.max,size:b.max.map((v,i)=>v-b.min[i]),center:b.max.map((v,i)=>(v+b.min[i])/2)};}

const source=fs.readFileSync('docs/research/samsy/raw/main.js','utf8');
const literal=extractObjectLiteral(source,'C40=');
const kit=vm.runInNewContext(`(${literal})`,Object.create(null),{timeout:1000});
const gltf=readGlbJson('public/models/cyberfix.glb');
const rootByName=new Map();
for(const scene of gltf.scenes||[])for(const idx of scene.nodes||[])rootByName.set(gltf.nodes[idx].name,idx);
const rootBounds={};
for(const [name,root] of rootByName){
 const b=empty();
 const childNodes=gltf.nodes[root].children?.length ? gltf.nodes[root].children : [root];
 for(const ni of childNodes){
   const node=gltf.nodes[ni]; if(node.mesh==null)continue;
   for(const prim of gltf.meshes[node.mesh].primitives||[]){const a=gltf.accessors[prim.attributes.POSITION]; if(!a?.min||!a?.max)continue;addBox(b,{min:a.min,max:a.max},I());}
 }
 rootBounds[name]=Number.isFinite(b.min[0]) ? finish(b) : null;
}

const original=empty();
const originalExplore=empty();
const perItem={};
let total=0, exploreTotal=0;
const scales=[];
for(const [name,instances] of Object.entries(kit)){
 const rb=rootBounds[name]; if(!rb || !Number.isFinite(rb.min[0])){continue;}
 const itemBox=empty();
 for(const instance of instances){
  total++;
  const p=instance.position||{x:0,y:0,z:0}; const r=instance.rotation||{x:0,y:0,z:0}; const s=instance.scale||{x:1,y:1,z:1};
  scales.push(s.x,s.y,s.z);
  const m=trs([p.x,p.y,p.z],eulerXYZ(r.x,r.y,r.z),[s.x,s.y,s.z]);
  addBox(original,rb,m); addBox(itemBox,rb,m);
  if(instance.scriptData?.id!=='about'){addBox(originalExplore,rb,m); exploreTotal++;}
 }
 perItem[name]={instances:instances.length,localBounds:rb,worldBounds:instances.length?finish(itemBox):null};
}
const result={
 source:'extracted original C40 instance map + cyberfix.glb accessor bounds',
 kitItems:Object.keys(kit).length,totalInstances:total,exploreInstances:exploreTotal,
 instancePositionRange:{
  x:[Math.min(...Object.values(kit).flat().map(v=>v.position?.x??0)),Math.max(...Object.values(kit).flat().map(v=>v.position?.x??0))],
  y:[Math.min(...Object.values(kit).flat().map(v=>v.position?.y??0)),Math.max(...Object.values(kit).flat().map(v=>v.position?.y??0))],
  z:[Math.min(...Object.values(kit).flat().map(v=>v.position?.z??0)),Math.max(...Object.values(kit).flat().map(v=>v.position?.z??0))],
 },
 scaleRange:[Math.min(...scales),Math.max(...scales)],
 originalAllBounds:finish(original),originalExploreBounds:finish(originalExplore),
 cloneCurrentKnown:{cityRootScale:0.31,approxBounds:{min:[-32.31,-3.57,-69.8],max:[17.42,47.63,11.29],size:[49.73,51.2,81.08]}},
 ratioOriginalExploreToClone:[finish(originalExplore).size[0]/49.73,finish(originalExplore).size[1]/51.2,finish(originalExplore).size[2]/81.08],
 perItem,
};
fs.mkdirSync('docs/research/samsy/recon-v2',{recursive:true});
fs.writeFileSync('docs/research/samsy/recon-v2/original-world-scale.json',JSON.stringify(result,null,2));
fs.writeFileSync('docs/research/samsy/recon-v2/original-instance-map.json',JSON.stringify(kit,null,2));
console.log(JSON.stringify({kitItems:result.kitItems,totalInstances:result.totalInstances,exploreInstances:result.exploreInstances,positionRange:result.instancePositionRange,scaleRange:result.scaleRange,originalExploreBounds:result.originalExploreBounds,clone:result.cloneCurrentKnown,ratio:result.ratioOriginalExploreToClone},null,2));
