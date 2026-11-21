"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm";
import worldLayoutData from "@/data/samsy-world-layout.json";
import type { EngineStats, SamsyMode } from "@/types/samsy";

interface CyberCityCanvasProps {
  mode: SamsyMode;
  /** Daytime visibility mode for modeling (sky + sun + lit floor). */
  dayMode?: boolean;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onStats: (stats: EngineStats) => void;
}

const SCENE_BG_NIGHT = 0x17101c;
const SCENE_BG_DAY = 0x6a8fad;

interface WorldTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  scriptData?: { id?: string; class?: string };
}

const worldLayout = worldLayoutData as Record<string, WorldTransform[]>;
// Baked from markers.txt M1 mark: X 49.36  Y 0.00  Z -284.76
const ORIGINAL_SPAWN = new THREE.Vector3(49.36, 0, -284.76);
// Road strip runs from ORIGINAL_SPAWN.z - 80 to ORIGINAL_SPAWN.z - 10 (see the
// floor-shape generation below), so ORIGINAL_SPAWN itself sits just past the
// road entrance, inside the plaza. Pull the actual player start back into the
// middle of the road strip instead.
const PLAYER_SPAWN = new THREE.Vector3(ORIGINAL_SPAWN.x, ORIGINAL_SPAWN.y, ORIGINAL_SPAWN.z - 45);
const PLAYER_BASE_SPEED = 5;
const PLAYER_MAX_SPEED_MULTIPLIER = 3;
const PLAYER_ACCELERATION_RATE = 1.2;
const PLAYER_DECELERATION_RATE = 3;
const PLAYER_SPRINT_BOOST = 2;
const PLAYER_PHYSICS_STEPS = 3;
const PLAYER_MAX_JUMPS = 2;
const PLAYER_COYOTE_TIME = 0.1;
const JUMP_FORCE = 2 * 6 / 0.34;
const GRAVITY = 2 * 6 / 0.35 ** 2;
const FLY_SPEED = 9;
const FLY_MAX_ALTITUDE = 260;
const AUTO_DESCEND_SPEED = 22;
const PLAYER_RADIUS = 0.5;
const PLAYER_COLLISION_SKIN = 0.055;
const PLAYER_COLLISION_HEIGHTS = [0.45, 1.4] as const;
const PLAYER_SLIDE_ITERATIONS = 3;
const CAMERA_TARGET_HEIGHT = 1.8;
const CAMERA_CLEARANCE = 0.12;
const CAMERA_COLLISION_RADIUS = 0.32;
const CAMERA_COLLISION_MIN_DISTANCE = 0.72;
const CAMERA_RESTORE_SPEED = 6;
const CAMERA_POSITION_DAMPING = 18;
const CAMERA_TARGET_DAMPING = 22;
const CAMERA_POINTER_MAX_DELTA = 80;
const CAMERA_DEFAULT_DISTANCE = 8.38;
const CAMERA_MIN_DISTANCE = 7.95;
const CAMERA_MAX_DISTANCE = 8.4;
const CAMERA_INITIAL_ELEVATION = -0.12;
const CAMERA_MIN_POLAR = 0.75;
const CAMERA_MAX_POLAR = 2.5;
const CAMERA_MIN_ELEVATION = Math.PI / 2 - CAMERA_MAX_POLAR;
const CAMERA_MAX_ELEVATION = Math.PI / 2 - CAMERA_MIN_POLAR;
const CAMERA_DRAG_SENSITIVITY = 0.007;
const CAMERA_ROTATION_DAMPING = 0.1;
const WORLD_BOUNDARY_INSET = 1;
const ANIMATED_SCREEN_NAME = /screen/i;
const ROTATING_SCREEN_NAME = /screen_rotate/i;
const BLOOM_SCENE_LAYER = 1;

const pcgHash01 = (value: number) => {
  const seed = Math.trunc(value) >>> 0;
  const state = (Math.imul(seed, 747796405) + 2891336453) >>> 0;
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0;
  const result = ((word >>> 22) ^ word) >>> 0;
  return result / 4294967296;
};

const originalMaskedReflectorShader = {
  name: "OriginalMaskedReflectorShader",
  uniforms: {
    ...THREE.UniformsLib.fog,
    color: { value: null },
    tDiffuse: { value: null },
    floorTexture: { value: null },
    textureMatrix: { value: null },
    dayBoost: { value: 0 },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vReflectionUv;
    varying vec2 vFloorUv;

    #include <common>
    #include <fog_pars_vertex>
    #include <logdepthbuf_pars_vertex>

    void main() {
      vReflectionUv = textureMatrix * vec4(position, 1.0);
      vFloorUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <logdepthbuf_vertex>
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D floorTexture;
    uniform float dayBoost;
    varying vec4 vReflectionUv;
    varying vec2 vFloorUv;

    #include <logdepthbuf_pars_fragment>
    #include <fog_pars_fragment>

    vec3 sampleReflection(vec4 projectedUv, vec2 offset) {
      vec4 shiftedUv = projectedUv;
      shiftedUv.xy += offset * projectedUv.w;
      return texture2DProj(tDiffuse, shiftedUv).rgb;
    }

    void main() {
      #include <logdepthbuf_fragment>

      vec3 macroSample = texture2D(floorTexture, vFloorUv * 500.0).rgb;
      vec3 fineSample = texture2D(floorTexture, vFloorUv * 2500.0).rgb;
      vec2 reflectionOffset = (macroSample.yx * 2.0 - 1.0) * 0.01;
      float reflectionMask =
        (1.0 - fineSample.g) *
        min(1.0, 1.0 - macroSample.r);

      vec3 reflectedScene = sampleReflection(vReflectionUv, reflectionOffset);
      vec3 uvTint = vec3(vFloorUv, 1.0);
      // Night wet floor (source-matched).
      vec3 nightFloor = reflectedScene * reflectionMask * uvTint * 0.78;
      // Day: concrete albedo + softer reflection so looking down is not pure black.
      vec3 dayAlbedo = vec3(0.42, 0.44, 0.46) * (0.35 + 0.65 * reflectionMask);
      vec3 dayFloor = dayAlbedo + reflectedScene * reflectionMask * 0.22;
      vec3 floorColor = mix(nightFloor, dayFloor, clamp(dayBoost, 0.0, 1.0));

      gl_FragColor = vec4(floorColor, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
};

export function CyberCityCanvas({
  mode,
  dayMode = false,
  onReady,
  onProgress,
  onStats,
}: CyberCityCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const modeRef = useRef(mode);
  const dayModeRef = useRef(dayMode);
  const applyDayModeRef = useRef<((enabled: boolean) => void) | null>(null);
  const callbacksRef = useRef({ onReady, onProgress, onStats });

  useEffect(() => {
    const handleKillSwitch = () => setKillSwitchTriggered(true);
    window.addEventListener("samsy-cpu-killswitch", handleKillSwitch);
    return () => window.removeEventListener("samsy-cpu-killswitch", handleKillSwitch);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    dayModeRef.current = dayMode;
    applyDayModeRef.current?.(dayMode);
  }, [dayMode]);

  useEffect(() => {
    callbacksRef.current = { onReady, onProgress, onStats };
  }, [onReady, onProgress, onStats]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
    let avatar: VRM | null = null;
    let avatarRoot: THREE.Object3D | null = null;
    let cityRoot: THREE.Object3D | null = null;
    const collisionMeshes: THREE.Mesh[] = [];
    const groundMeshes: THREE.Mesh[] = [];
    const cameraCollisionSurfaces: THREE.Mesh[] = [];
    const playableBounds = new THREE.Box3(
      new THREE.Vector3(-2163, 0, -2716),
      new THREE.Vector3(1294, 0, 744),
    );
    let lastStatsUpdate = 0;
    let statsFrames = 0;
    let statsElapsed = 0;
    let lastReportedFps = 0;
    let lastReportedFrameMs = 0;
    let jumpVelocity = 0;
    let jumpCount = 0;
    let autoDescending = false;
    let flightMode = false;
    const positionMarks: { x: number; y: number; z: number }[] = [];
    let markHeading = 0;
    let currentGroundHeight = 0;
    let speedMultiplier = 1;
    let isGrounded = true;
    let lastGroundedTime = performance.now() / 1000;
    const animatedScreenMaterials: THREE.MeshBasicMaterial[] = [];
    const rotatingScreens: THREE.Object3D[] = [];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BG_NIGHT);
    scene.fog = new THREE.Fog(SCENE_BG_NIGHT, 700, 800);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 800);
    camera.position.set(
      PLAYER_SPAWN.x,
      PLAYER_SPAWN.y + CAMERA_TARGET_HEIGHT + Math.sin(CAMERA_INITIAL_ELEVATION) * CAMERA_DEFAULT_DISTANCE,
      PLAYER_SPAWN.z - Math.cos(CAMERA_INITIAL_ELEVATION) * CAMERA_DEFAULT_DISTANCE,
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(SCENE_BG_NIGHT, 1);

    // Filled after lights + floor are created.
    let applyDayMode: (enabled: boolean) => void = () => undefined;

    renderer.domElement.className = "samsy-webgl";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", "Interactive cybercity. Click the left mouse button to enter mouse look, press Escape to release it, use the wheel to zoom, WASD to move, tap Space to jump or hold it to fly up (release to hover), hold Control to fly down, and press X to auto-descend to the ground.");
    host.appendChild(renderer.domElement);

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.27, 0);
    bloomComposer.addPass(bloom);

    const bloomOccluderMaterialCache = new Map<string, THREE.Material>();
    const bloomMaterialRestore = new Map<
      THREE.Mesh,
      THREE.Material | THREE.Material[]
    >();
    const getBloomOccluderMaterial = (sourceMaterial: THREE.Material) => {
      const cached = bloomOccluderMaterialCache.get(sourceMaterial.uuid);
      if (cached) return cached;

      const occluder = sourceMaterial.clone();
      occluder.name = `${sourceMaterial.name || sourceMaterial.uuid}_bloom_depth_occluder`;

      if ("color" in occluder && occluder.color instanceof THREE.Color) {
        occluder.color.setHex(0x000000);
      }
      if ("emissive" in occluder && occluder.emissive instanceof THREE.Color) {
        occluder.emissive.setHex(0x000000);
      }
      if ("emissiveIntensity" in occluder) {
        (occluder as unknown as Record<string, number>).emissiveIntensity = 0;
      }
      const hasAlpha = occluder.transparent || occluder.alphaTest > 0;
      if ("map" in occluder && !hasAlpha) {
        (occluder as unknown as Record<string, unknown>).map = null;
      }
      occluder.toneMapped = false;

      bloomOccluderMaterialCache.set(sourceMaterial.uuid, occluder);
      return occluder;
    };

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(new RenderPass(scene, camera));
    const sourceComposite = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        bloomTexture: { value: null },
        bloomGain: { value: 0.9 },
        bloomTint: { value: new THREE.Vector3(1.35, 0.72, 0.65) },
        resolution: { value: new THREE.Vector2(1, 1) },
        vignetteWidth: { value: 0.33 },
        scanlineStrength: { value: 0.005 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D bloomTexture;
        uniform float bloomGain;
        uniform vec3 bloomTint;
        uniform vec2 resolution;
        uniform float vignetteWidth;
        uniform float scanlineStrength;
        varying vec2 vUv;

        vec3 linearToSrgb(vec3 value) {
          vec3 low = value * 12.92;
          vec3 high = 1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          vec3 useLow = vec3(1.0) - step(vec3(0.0031308), value);
          return mix(high, low, useLow);
        }

        vec3 srgbToLinear(vec3 value) {
          vec3 low = value / 12.92;
          vec3 high = pow((value + 0.055) / 1.055, vec3(2.4));
          vec3 useLow = vec3(1.0) - step(vec3(0.04045), value);
          return mix(high, low, useLow);
        }

        void main() {
          vec4 sceneColor = texture2D(tDiffuse, vUv);
          vec3 bloomColor =
            texture2D(bloomTexture, vUv).rgb * bloomGain * bloomTint;
          vec3 composited = vec3(1.0) -
            (vec3(1.0) - sceneColor.rgb) * (vec3(1.0) - bloomColor);

          float horizontalVignette =
            smoothstep(0.0, vignetteWidth, vUv.x) *
            smoothstep(0.0, vignetteWidth, 1.0 - vUv.x);
          composited *= horizontalVignette;

          float luminance = dot(composited, vec3(0.2125, 0.7154, 0.0721));
          composited += vec3(1.0 - luminance) * 0.0104;

          float scanlineFrequency = 3200.0 * resolution.y / 1080.0;
          composited += sin(vUv.y * scanlineFrequency) * scanlineStrength;

          vec3 displayColor = linearToSrgb(max(composited, vec3(0.0)));
          const vec3 blackPoint = vec3(-0.35, -0.15693, -0.2656);
          const vec3 whitePoint = vec3(0.7775, 0.89607, 0.90612);
          const vec3 channelGamma = vec3(2.53453, 1.66628, 1.90751);
          displayColor = pow(
            clamp((displayColor - blackPoint) / (whitePoint - blackPoint), 0.0, 1.0),
            channelGamma
          );
          composited = srgbToLinear(displayColor);
          gl_FragColor = vec4(composited, sceneColor.a);
        }
      `,
    });
    sourceComposite.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
    finalComposer.addPass(sourceComposite);
    finalComposer.addPass(new OutputPass());

    const renderPostProcessedScene = () => {
      const savedBackground = scene.background;
      const savedCameraMask = camera.layers.mask;
      const savedReflectorBeforeRender = reflector.onBeforeRender;
      scene.background = new THREE.Color(0x000000);
      camera.layers.enable(0);
      camera.layers.enable(BLOOM_SCENE_LAYER);

      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object.layers.isEnabled(BLOOM_SCENE_LAYER)) return;
        bloomMaterialRestore.set(object, object.material);
        object.material = Array.isArray(object.material)
          ? object.material.map(getBloomOccluderMaterial)
          : getBloomOccluderMaterial(object.material);
      });

      // Capture the reflection fresh during the emissive pass (the first pass this frame), then
      // reuse that same-frame texture for the final pass below. Previously the reflector was
      // disabled here and re-enabled for the final pass, which meant the bloom pass composited
      // the *previous* frame's reflection on top of the *current* frame's reflection in the final
      // pass. Those two textures only match while the camera is stationary; once the camera moves
      // they diverge, producing a duplicated/ghosted reflection trailing the real one. Rendering
      // fresh here and reusing it below keeps the cost at one planar-reflection capture per frame
      // while keeping both passes in sync.
      try {
        bloomComposer.render();
      } finally {
        bloomMaterialRestore.forEach((material, object) => {
          object.material = material;
        });
        bloomMaterialRestore.clear();
        camera.layers.mask = savedCameraMask;
        scene.background = savedBackground;
      }
      reflector.onBeforeRender = () => undefined;
      try {
        finalComposer.render();
      } finally {
        reflector.onBeforeRender = savedReflectorBeforeRender;
      }
    };

    const hemiLight = new THREE.HemisphereLight(0x493f52, 0x020103, 0.12);
    scene.add(hemiLight);

    // Moonlight — soft cool-blue directional key light, angled down over spawn.
    const moonLight = new THREE.DirectionalLight(0xaec2ff, 0.55);
    moonLight.position.set(ORIGINAL_SPAWN.x - 140, 260, ORIGINAL_SPAWN.z + 110);
    moonLight.target.position.copy(ORIGINAL_SPAWN);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 700;
    moonLight.shadow.camera.left = -180;
    moonLight.shadow.camera.right = 180;
    moonLight.shadow.camera.top = 180;
    moonLight.shadow.camera.bottom = -180;
    moonLight.shadow.bias = -0.0015;
    moonLight.shadow.normalBias = 0.02;
    scene.add(moonLight);
    scene.add(moonLight.target);
    renderer.domElement.dataset.moonlight = "cool-directional-key-light-with-soft-shadows";

    const redLight = new THREE.PointLight(0xff003d, 0.24, 13, 1.8);
    redLight.position.copy(ORIGINAL_SPAWN).add(new THREE.Vector3(0, 9, 5));
    scene.add(redLight);
    const cyanLight = new THREE.PointLight(0x62c8ef, 0.12, 55, 2);
    cyanLight.position.copy(ORIGINAL_SPAWN).add(new THREE.Vector3(-40, 28, 35));
    scene.add(cyanLight);
    const magentaLight = new THREE.PointLight(0xff3cbd, 0.16, 55, 2);
    magentaLight.position.copy(ORIGINAL_SPAWN).add(new THREE.Vector3(45, 24, -55));
    scene.add(magentaLight);

    // Day-mode sun + ambient fill (off until day mode is enabled).
    const sunLight = new THREE.DirectionalLight(0xfff2d6, 0);
    sunLight.position.set(ORIGINAL_SPAWN.x + 120, 320, ORIGINAL_SPAWN.z - 80);
    sunLight.target.position.copy(ORIGINAL_SPAWN);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    sunLight.shadow.camera.left = -220;
    sunLight.shadow.camera.right = 220;
    sunLight.shadow.camera.top = 220;
    sunLight.shadow.camera.bottom = -220;
    scene.add(sunLight);
    scene.add(sunLight.target);
    const dayAmbient = new THREE.AmbientLight(0xdde6f0, 0);
    scene.add(dayAmbient);

    // wetFloorMaterial is assigned after Reflector creation; day mode hooks it then.
    let wetFloorMaterial: THREE.ShaderMaterial | null = null;

    const decorativeVideo = document.createElement("video");
    decorativeVideo.src = "/videos/works/derivative.webm";
    decorativeVideo.crossOrigin = "anonymous";
    decorativeVideo.autoplay = true;
    decorativeVideo.loop = true;
    decorativeVideo.muted = true;
    decorativeVideo.playsInline = true;
    decorativeVideo.preload = "auto";
    const decorativeVideoTexture = new THREE.VideoTexture(decorativeVideo);
    decorativeVideoTexture.colorSpace = THREE.SRGBColorSpace;
    decorativeVideoTexture.minFilter = THREE.LinearFilter;
    decorativeVideoTexture.magFilter = THREE.LinearFilter;
    decorativeVideoTexture.generateMipmaps = false;
    const decorativeVideoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: decorativeVideoTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    decorativeVideoPlane.name = "original-decorative-video-plane";
    decorativeVideoPlane.scale.set(350 * 16 / 9, 350, 350);
    decorativeVideoPlane.position.set(-550, 175, -350);
    decorativeVideoPlane.rotation.y = Math.PI / 2;
    // Archived: large far-field billboard while custom city is rebuilt.
    decorativeVideoPlane.visible = true;
    scene.add(decorativeVideoPlane);
    // Keep in scene graph for restore; do not play while archived.

    const worksVideo = document.createElement("video");
    worksVideo.src = "/videos/works/akira.webm";
    worksVideo.crossOrigin = "anonymous";
    worksVideo.autoplay = true;
    worksVideo.loop = true;
    worksVideo.muted = true;
    worksVideo.playsInline = true;
    worksVideo.preload = "auto";
    const worksVideoTexture = new THREE.VideoTexture(worksVideo);
    worksVideoTexture.colorSpace = THREE.SRGBColorSpace;
    worksVideoTexture.minFilter = THREE.LinearFilter;
    worksVideoTexture.magFilter = THREE.LinearFilter;
    worksVideoTexture.generateMipmaps = false;
    const worksVideoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 5, 5),
      new THREE.MeshBasicMaterial({
        map: worksVideoTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    worksVideoPlane.name = "persistent-works-video-plane";
    worksVideoPlane.scale.set(50 * 1.88, 50, 1);
    worksVideoPlane.position.set(47, 25, -10);
    worksVideoPlane.rotation.y = Math.PI;
    // Archived: near-spawn works video billboard while custom city is rebuilt.
    worksVideoPlane.visible = true;
    scene.add(worksVideoPlane);
    // Keep in scene graph for restore; do not play while archived.

    const floorTexture = new THREE.TextureLoader().load("/textures/bump-floor_fxrdig.jpg");
    floorTexture.colorSpace = THREE.NoColorSpace;
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    floorTexture.magFilter = THREE.LinearFilter;
    floorTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const initialFloorWidth = host.clientWidth || window.innerWidth;
    const initialFloorHeight = host.clientHeight || window.innerHeight;
    const initialFloorDpr = Math.min(
      window.devicePixelRatio,
      initialFloorWidth < 720 ? 1.15 : 1.5,
    );
    const floorGeometry = new THREE.PlaneGeometry(25_000, 25_000, 20, 20);
    const reflector = new Reflector(floorGeometry, {
      clipBias: 0.003,
      textureWidth: Math.max(1, Math.round(initialFloorWidth * initialFloorDpr * 0.75)),
      textureHeight: Math.max(1, Math.round(initialFloorHeight * initialFloorDpr * 0.75)),
      color: 0x000000,
      multisample: 0,
      shader: originalMaskedReflectorShader,
    });
    wetFloorMaterial = reflector.material as THREE.ShaderMaterial;
    wetFloorMaterial.uniforms.floorTexture.value = floorTexture;
    if (!wetFloorMaterial.uniforms.dayBoost) {
      wetFloorMaterial.uniforms.dayBoost = { value: 0 };
    }
    wetFloorMaterial.fog = true;
    reflector.name = "original-masked-reflector";
    reflector.layers.enable(BLOOM_SCENE_LAYER);
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -0.035;
    scene.add(reflector);

    applyDayMode = (enabled: boolean) => {
      const colorHex = enabled ? SCENE_BG_DAY : SCENE_BG_NIGHT;
      const color = new THREE.Color(colorHex);
      scene.background = color;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(color);
        scene.fog.near = enabled ? 80 : 700;
        scene.fog.far = enabled ? 1400 : 800;
      }
      renderer.setClearColor(colorHex, 1);
      renderer.toneMappingExposure = enabled ? 1.05 : 1;

      hemiLight.color.setHex(enabled ? 0xa8bdd4 : 0x493f52);
      hemiLight.groundColor.setHex(enabled ? 0x7a848e : 0x020103);
      hemiLight.intensity = enabled ? 0.45 : 0.12;

      // Night moon stays subtle in day; sun takes the key.
      moonLight.color.setHex(enabled ? 0xfff0d8 : 0xaec2ff);
      moonLight.intensity = enabled ? 0.15 : 0.55;

      sunLight.intensity = enabled ? 0.85 : 0;
      dayAmbient.intensity = enabled ? 0.28 : 0;

      // Neon accents read as night; dial them down in day.
      redLight.intensity = enabled ? 0.06 : 0.24;
      cyanLight.intensity = enabled ? 0.05 : 0.12;
      magentaLight.intensity = enabled ? 0.05 : 0.16;

      if (wetFloorMaterial?.uniforms.dayBoost) {
        // Partial mix keeps grid readable without washing out.
        wetFloorMaterial.uniforms.dayBoost.value = enabled ? 0.7 : 0;
      }

      renderer.domElement.dataset.lightMode = enabled ? "day" : "night";
    };
    applyDayModeRef.current = applyDayMode;
    applyDayMode(dayModeRef.current);

    renderer.domElement.dataset.floorSurface = "original-masked-reflector";
    renderer.domElement.dataset.floorGrid = "dual-scale-reflection-mask";
    renderer.domElement.dataset.floorGridSpacing = "50-unit-macro-10-unit-fine";
    renderer.domElement.dataset.floorReflectorResolution = "0.75";
    renderer.domElement.dataset.postProfile = "source-emissive-mrt-screen-blend-approximation";
    renderer.domElement.dataset.billboardShader = "source-pcg-burst-panel-flicker-no-near-stripe";
    renderer.domElement.dataset.buildingMaterialProfile = "source-height-faded-textures";
    renderer.domElement.dataset.bloomProfile = "selective-emissive-screen-blend";
    renderer.domElement.dataset.bloomOcclusionProfile = "source-depth-occluded-emissive";

    // Custom spawn tower removed — player spawns at ground-level PLAYER_SPAWN,
    // in the middle of the road strip (ORIGINAL_SPAWN still anchors the
    // road/plaza/lighting/billboard layout). M marks are temporary reference
    // coords only, not spawn.
    const player = new THREE.Group();
    player.position.set(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z);
    scene.add(player);

    // Custom kit-matched billboard is created after cybercity.glb screens load.
    let customKitBillboard: THREE.Object3D | null = null;

    const fallbackAvatar = new THREE.Group();
    fallbackAvatar.name = "loading-avatar-fallback";
    fallbackAvatar.visible = false;
    player.add(fallbackAvatar);

    // Fallback body sized to match owo7.vrm (1.75m tall, 0.84m wide)
    const fallbackBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.90, 8, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0c0b10,
        roughness: 0.86,
        metalness: 0.02,
      }),
    );
    fallbackBody.position.y = 0.88;
    fallbackBody.castShadow = true;
    fallbackAvatar.add(fallbackBody);

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff194a, toneMapped: false });
    for (const x of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), eyeMaterial);
      eye.position.set(x, 1.22, 0.35);
      eye.layers.enable(BLOOM_SCENE_LAYER);
      fallbackAvatar.add(eye);
      const halo = new THREE.PointLight(0xff003d, 0.09, 1.35, 2);
      halo.position.copy(eye.position);
      fallbackAvatar.add(halo);
    }
    const mouth = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.08, 1.08, 0.36),
        new THREE.Vector3(-0.025, 1.02, 0.36),
        new THREE.Vector3(-0.025, 1.02, 0.36),
        new THREE.Vector3(0.025, 1.08, 0.36),
        new THREE.Vector3(0.025, 1.08, 0.36),
        new THREE.Vector3(0.08, 1.02, 0.36),
      ]),
      new THREE.LineBasicMaterial({ color: 0xffd7df, toneMapped: false }),
    );
    mouth.layers.enable(BLOOM_SCENE_LAYER);
    fallbackAvatar.add(mouth);

    // Face overlay: head-bone local space, positioned flush on the FACE quad mesh.
    // FACE mesh center in obake-local: Y = 0.687, Z = 0.187.
    // Head bone in obake-local: Y = 0.737.
    // Head-local coordinates: Y = -0.05 (face center), Z = +0.187 (face surface).
    const createHeadFaceOverlay = () => {
      const overlay = new THREE.Group();
      overlay.name = "emissive-face-overlay";

      const eyeMat = new THREE.MeshBasicMaterial({
        color: 0xfff7f8,
        toneMapped: false,
        depthTest: true,
        depthWrite: true,
      });
      const mouthMat = new THREE.MeshBasicMaterial({
        color: 0xffedf1,
        toneMapped: false,
        depthTest: true,
        depthWrite: true,
      });

      // Eyes: ±X=0.065, Y=+0.03 (upper face quad), Z=+0.188 (flush on face surface)
      const eyeRadius = 0.038;
      for (const xSign of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 14, 14), eyeMat);
        eye.position.set(xSign * 0.065, 0.030, 0.188);
        eye.layers.enable(BLOOM_SCENE_LAYER);
        eye.renderOrder = 20;
        overlay.add(eye);
      }

      // Mouth 'w' shape: connected directly below eyes (Y = -0.11 to -0.13, Z = +0.188)
      const mouthZ = 0.188;
      const mouthSegs = [
        { x: -0.055, y: -0.110, rz: -0.62 },
        { x:  0,     y: -0.130, rz:  0.62 },
        { x:  0.055, y: -0.110, rz: -0.62 },
      ];
      mouthSegs.forEach((seg) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.016, 0.012), mouthMat);
        m.position.set(seg.x, seg.y, mouthZ);
        m.rotation.z = seg.rz;
        m.layers.enable(BLOOM_SCENE_LAYER);
        m.renderOrder = 20;
        overlay.add(m);
      });

      return overlay;
    };

    // Fallback overlay for the capsule-body ghost shown during VRM loading.
    // Ghost body in obake-local: Y=0.061 to 1.052, Z=-0.606 to +0.208
    // With avatarRoot scale=1.65 and position.y=0.02:
    //   body world top ≈ 1.052*1.65+0.02 = 1.756
    //   face front in world Z = 0.208*1.65 = 0.343
    // Face mesh center Y ≈ 0.687*1.65+0.02 = 1.154  ← eyes here
    // Mouth bottom Y ≈ 0.536*1.65+0.02 = 0.905
    // But fallback is a rough capsule, not the real mesh.
    // Fallback capsule head center is at approx world Y=1.55 (body top area)
    const createFaceOverlay = () => {
      const overlay = new THREE.Group();
      overlay.name = "emissive-face-overlay";
      const overlayEyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff7f8,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      });
      // Fallback eyes: match ghost head position (world Y≈1.55, front Z≈0.34)
      for (const x of [-0.19, 0.19]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 14), overlayEyeMaterial);
        eye.position.set(x, 1.55, 0.34);
        eye.layers.enable(BLOOM_SCENE_LAYER);
        eye.renderOrder = 20;
        overlay.add(eye);
      }
      const mouthMaterial = new THREE.MeshBasicMaterial({
        color: 0xffedf1,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      });
      const mouthGeometry = new THREE.BoxGeometry(0.09, 0.022, 0.020);
      const mouthSegments = [
        { x: -0.07, y: 1.43, rotation: -0.62 },
        { x: 0,     y: 1.41, rotation:  0.62 },
        { x: 0.07,  y: 1.43, rotation: -0.62 },
      ];
      mouthSegments.forEach((segment) => {
        const mouthSegment = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouthSegment.position.set(segment.x, segment.y, 0.34);
        mouthSegment.rotation.z = segment.rotation;
        mouthSegment.layers.enable(BLOOM_SCENE_LAYER);
        mouthSegment.renderOrder = 20;
        overlay.add(mouthSegment);
      });
      return overlay;
    };

    const npcSilhouetteMaterial = new THREE.MeshBasicMaterial({
      color: 0x450512,
      toneMapped: false,
    });
    const npcBodyGeometry = new THREE.SphereGeometry(0.82, 10, 8);
    const npcHeadGeometry = new THREE.SphereGeometry(0.64, 10, 8);
    const npcEarGeometry = new THREE.ConeGeometry(0.28, 0.54, 3);
    const createNpcProxy = () => {
      const proxy = new THREE.Group();
      const body = new THREE.Mesh(npcBodyGeometry, npcSilhouetteMaterial);
      body.position.y = 1.02;
      body.scale.set(1.18, 1.35, 0.78);
      proxy.add(body);
      const head = new THREE.Mesh(npcHeadGeometry, npcSilhouetteMaterial);
      head.position.y = 1.82;
      head.scale.set(1, 0.9, 0.8);
      proxy.add(head);
      for (const earX of [-0.37, 0.37]) {
        const ear = new THREE.Mesh(npcEarGeometry, npcSilhouetteMaterial);
        ear.position.set(earX, 2.33, 0.02);
        ear.rotation.z = earX < 0 ? -0.12 : 0.12;
        proxy.add(ear);
      }
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 20),
        new THREE.MeshBasicMaterial({ color: 0xff143f, toneMapped: false }),
      );
      badge.position.set(0, 1.84, 0.535);
      badge.layers.enable(BLOOM_SCENE_LAYER);
      proxy.add(badge);
      const badgeCore = new THREE.Mesh(
        new THREE.CircleGeometry(0.11, 14),
        new THREE.MeshBasicMaterial({ color: 0xffe9ed, toneMapped: false }),
      );
      badgeCore.position.set(0, 1.84, 0.54);
      badgeCore.layers.enable(BLOOM_SCENE_LAYER);
      proxy.add(badgeCore);
      return proxy;
    };
    const makeNpcAnchor = (offsetX: number, offsetZ: number, scale = 1) => {
      const group = new THREE.Group();
      group.position.set(ORIGINAL_SPAWN.x + offsetX, -0.22, ORIGINAL_SPAWN.z + offsetZ);
      group.scale.setScalar(scale);
      group.userData.baseY = -0.22;
      group.add(createNpcProxy());
      scene.add(group);
      return group;
    };
    const npcs: THREE.Group[] = [];

    const gltfLoader = new GLTFLoader();
    let completedLoads = 0;
    const reportProgress = (fraction: number) => callbacksRef.current.onProgress(Math.min(95, fraction));
    const markLoaded = () => {
      completedLoads += 1;
      reportProgress(20 + completedLoads * 75);
      if (completedLoads >= 1) {
        callbacksRef.current.onProgress(100);
        callbacksRef.current.onReady();
      }
    };

    gltfLoader.load(
      "/models/cyberfix.glb",
      (gltf) => {
        if (disposed) return;
        const sourceItems = new Map(
          gltf.scene.children.map((child) => [child.name, child] as const),
        );
        cityRoot = new THREE.Group();
        cityRoot.name = "smsy-original-instance-layout";
        let instanceCount = 0;

        for (const [itemName, transforms] of Object.entries(worldLayout)) {
          const sourceItem = sourceItems.get(itemName);
          if (!sourceItem) continue;

          for (const transform of transforms) {
            if (transform.scriptData?.id === "about") continue;
            const instance = new THREE.Group();
            instance.name = `${itemName}_instance_${instanceCount}`;
            const sourceChildren = sourceItem.children.length > 0
              ? sourceItem.children
              : [sourceItem];
            sourceChildren.forEach((child) => {
              const childClone = child.clone(true);
              childClone.position.set(0, 0, 0);
              childClone.rotation.set(0, 0, 0);
              childClone.scale.set(1, 1, 1);
              instance.add(childClone);
            });
            instance.position.set(
              transform.position.x,
              transform.position.y,
              transform.position.z,
            );
            instance.rotation.set(
              transform.rotation.x,
              transform.rotation.y,
              transform.rotation.z,
            );
            instance.scale.set(
              transform.scale.x,
              transform.scale.y,
              transform.scale.z,
            );
            instance.userData.sourceItem = itemName;
            instance.userData.scriptData = transform.scriptData ?? null;
            cityRoot.add(instance);
            instanceCount += 1;
          }
        }

        const unlitMaterialCache = new Map<string, THREE.Material>();
        const createSourceScreenMaterial = (
          sourceMaterial: THREE.Material,
          objectName: string,
        ) => {
          const source = sourceMaterial as THREE.MeshStandardMaterial;
          const isTransparent = source.transparent || source.opacity < 1;
          const material = new THREE.MeshBasicMaterial({
            map: source.map ?? null,
            alphaMap: source.alphaMap ?? null,
            color: 0xffffff,
            opacity: source.opacity,
            transparent: isTransparent,
            alphaTest: source.alphaTest,
            side: THREE.DoubleSide,
            depthWrite: !isTransparent,
            toneMapped: false,
          });
          material.name = `${sourceMaterial.name || objectName}_source_animated_screen`;
          material.onBeforeCompile = (shader) => {
            shader.uniforms.uScreenTime = { value: 0 };
            shader.vertexShader = `
              varying vec3 vScreenWorldPosition;
              varying float vScreenOriginY;
              varying float vScreenOriginZ;
            ` + shader.vertexShader.replace(
              "#include <project_vertex>",
              `#include <project_vertex>
               vScreenWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
               vScreenOriginY = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).y;
               vScreenOriginZ = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;`,
            );
            shader.fragmentShader = `
              uniform float uScreenTime;
              varying vec3 vScreenWorldPosition;
              varying float vScreenOriginY;
              varying float vScreenOriginZ;

              float smsyPcgHash(float seed) {
                uint state = uint(int(seed)) * 747796405u + 2891336453u;
                uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
                uint result = (word >> 22u) ^ word;
                return float(result) * (1.0 / 4294967296.0);
              }
            ` + shader.fragmentShader
              .replace(
                "#include <map_fragment>",
                `#ifdef USE_MAP
                  vec2 smsyUv = vMapUv;
                  float smsySeed = floor(vScreenOriginZ + uScreenTime * 10.0);
                  float smsyHash = smsyPcgHash(smsySeed);
                  float smsyAmount = 6.0 * step(0.965, smsyHash);
                  vec4 smsyTexel = texture2D(map, smsyUv);
                  if (smsyAmount > 0.5) {
                    float smsyOffsetX = smsyAmount * 0.001;
                    float smsyOffsetY = smsyAmount * 0.002;
                    float smsyNoiseOffset =
                      smsyAmount *
                      sin(0.3 * uScreenTime + smsyUv.y * 21.0) *
                      sin(0.7 * uScreenTime + smsyUv.y * 29.0) *
                      sin(0.3 + 0.33 * uScreenTime + smsyUv.y * 31.0) *
                      0.0017;
                    smsyTexel.r = texture2D(
                      map,
                      vec2(smsyUv.x + smsyNoiseOffset + smsyOffsetX, smsyUv.y + smsyOffsetX)
                    ).r + 0.05;
                    smsyTexel.g = texture2D(
                      map,
                      vec2(smsyUv.x + smsyNoiseOffset, smsyUv.y - smsyOffsetY)
                    ).g + 0.05;
                    smsyTexel.b = texture2D(
                      map,
                      vec2(smsyUv.x + smsyNoiseOffset - smsyOffsetY, smsyUv.y)
                    ).b + 0.05;
                    float smsyZoom = smsyAmount * 0.75;
                    smsyTexel.r += 0.08 * texture2D(
                      map,
                      smsyZoom * vec2(smsyNoiseOffset + 0.025, -0.027) +
                        smsyAmount * vec2(smsyUv.x + 0.001, smsyUv.y + 0.001)
                    ).r;
                    smsyTexel.g += 0.05 * texture2D(
                      map,
                      smsyZoom * vec2(smsyNoiseOffset - 0.022, -0.02) +
                        smsyAmount * vec2(smsyUv.x, smsyUv.y - 0.002)
                    ).g;
                    smsyTexel.b += 0.08 * texture2D(
                      map,
                      smsyZoom * vec2(smsyNoiseOffset - 0.02, -0.018) +
                        smsyAmount * vec2(smsyUv.x - 0.002, smsyUv.y)
                    ).b;
                  }
                  diffuseColor *= smsyTexel;
                #endif`,
              )
              .replace(
                "#include <alphatest_fragment>",
                `float smsyFlickerWave = 0.35 + 0.35 * sin(
                    uScreenTime * 17.5 +
                    vScreenOriginY * 20.0
                  );
                  float smsyFlickerPulse = smoothstep(0.06, 0.16, smsyFlickerWave);
                  float smsyFlicker = mix(0.9, 1.0, smsyFlickerPulse);
                  diffuseColor.rgb *= smsyFlicker;
                #ifdef USE_MAP
                  diffuseColor.rgb *= mix(vec3(1.0), vec3(vMapUv, 1.0), 0.9);
                #endif
                  diffuseColor.a *= min(
                    diffuseColor.r + diffuseColor.g + diffuseColor.b,
                    1.0
                  );
                  if (diffuseColor.a < 0.1) discard;
                  #include <alphatest_fragment>`,
              );
            material.userData.screenUniforms = {
              time: shader.uniforms.uScreenTime,
            };
          };
          material.customProgramCacheKey = () => "smsy-source-screen-v6-panel-flicker";
          material.needsUpdate = true;
          return material;
        };

        const toOriginalUnlitMaterial = (
          sourceMaterial: THREE.Material,
          objectName: string,
        ) => {
          const isScreen = ANIMATED_SCREEN_NAME.test(objectName);
          if (isScreen) return createSourceScreenMaterial(sourceMaterial, objectName);

          const cacheKey = `${sourceMaterial.uuid}:surface`;
          const cached = unlitMaterialCache.get(cacheKey);
          if (cached) return cached;

          const source = sourceMaterial as THREE.MeshStandardMaterial;
          const isTransparent = source.transparent || source.opacity < 1;
          const material = new THREE.MeshBasicMaterial({
            map: source.map ?? null,
            alphaMap: source.alphaMap ?? null,
            color: source.color?.clone() ?? new THREE.Color(1, 1, 1),
            opacity: source.opacity,
            transparent: isTransparent,
            alphaTest: source.alphaTest,
            side: THREE.DoubleSide,
            depthWrite: !isTransparent,
            toneMapped: false,
          });
          material.name = `${sourceMaterial.name || objectName}_source_dark_surface`;
          material.onBeforeCompile = (shader) => {
            shader.vertexShader = `
              varying float vSurfaceWorldY;
            ` + shader.vertexShader.replace(
              "#include <project_vertex>",
              `#include <project_vertex>
               vSurfaceWorldY = (modelMatrix * vec4(transformed, 1.0)).y;`,
            );
            shader.fragmentShader = `
              varying float vSurfaceWorldY;
            ` + shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
               diffuseColor.rgb *= 0.3 * smoothstep(0.0, 20.0, vSurfaceWorldY);`,
            );
          };
          material.customProgramCacheKey = () => "smsy-source-surface-v5";
          material.needsUpdate = true;
          unlitMaterialCache.set(cacheKey, material);
          return material;
        };

        let sourceScreenMeshCount = 0;
        let sourceSurfaceMeshCount = 0;
        cityRoot.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const sourceMaterials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          if (/collision/i.test(object.name)) {
            sourceMaterials.forEach((material) => {
              material.side = THREE.DoubleSide;
            });
            object.visible = false;
            if (/ramp_collision/i.test(object.name)) groundMeshes.push(object);
            else collisionMeshes.push(object);
            cameraCollisionSurfaces.push(object);
            return;
          }

          object.material = Array.isArray(object.material)
            ? sourceMaterials.map((material) => toOriginalUnlitMaterial(material, object.name))
            : toOriginalUnlitMaterial(sourceMaterials[0], object.name);
          if (ANIMATED_SCREEN_NAME.test(object.name)) {
            sourceScreenMeshCount += 1;
            object.layers.enable(BLOOM_SCENE_LAYER);
            const screenMaterials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            screenMaterials.forEach((material) => {
              if (!(material instanceof THREE.MeshBasicMaterial)) return;
              if (!animatedScreenMaterials.includes(material)) animatedScreenMaterials.push(material);
            });
          } else {
            sourceSurfaceMeshCount += 1;
            if (/^ramp$/i.test(object.name)) {
              groundMeshes.push(object);
            } else {
              collisionMeshes.push(object);
            }
            cameraCollisionSurfaces.push(object);
          }

          if (ROTATING_SCREEN_NAME.test(object.name)) {
            const instanceOffset = object.parent?.position ?? object.position;
            const phaseSeed = instanceOffset.x + instanceOffset.y + instanceOffset.z;
            object.userData.rotationPhase = pcgHash01(phaseSeed) * Math.PI * 2;
            rotatingScreens.push(object);
          }
          object.castShadow = false;
          object.receiveShadow = false;
        });

        // Custom billboards: clone real kit screen meshes so art/UVs match city signs.
        const kitScreenMeshes: THREE.Mesh[] = [];
        const kitScreenSeenMaps = new Set<THREE.Texture>();
        cityRoot.traverse((object) => {
          if (kitScreenMeshes.length >= 3 || !(object instanceof THREE.Mesh)) return;
          if (!ANIMATED_SCREEN_NAME.test(object.name)) return;
          const mats = Array.isArray(object.material) ? object.material : [object.material];
          const basic = mats.find(
            (m): m is THREE.MeshBasicMaterial =>
              m instanceof THREE.MeshBasicMaterial && !!m.map,
          );
          if (!basic?.map || kitScreenSeenMaps.has(basic.map)) return;
          kitScreenSeenMaps.add(basic.map);
          kitScreenMeshes.push(object);
        });

        if (kitScreenMeshes.length > 0) {
          // Use first kit screen for main board size reference
          const refMesh = kitScreenMeshes[0];
          refMesh.geometry.computeBoundingBox();
          const refSize = new THREE.Vector3();
          refMesh.geometry.boundingBox?.getSize(refSize);
          const dims = [Math.abs(refSize.x), Math.abs(refSize.y), Math.abs(refSize.z)].sort(
            (a, b) => b - a,
          );
          const kitW = Math.max(4, dims[0]);
          const kitH = Math.max(4, dims[1]);
          const panelW = Math.min(14, kitW * 1.35);
          const panelH = Math.min(20, kitH * 1.35);

          // Main: plane with first kit texture (existing look you liked)
          const mainSource = new THREE.MeshStandardMaterial({
            map: (refMesh.material as THREE.MeshBasicMaterial).map,
            alphaMap: (refMesh.material as THREE.MeshBasicMaterial).alphaMap,
            transparent: (refMesh.material as THREE.MeshBasicMaterial).transparent,
            opacity: (refMesh.material as THREE.MeshBasicMaterial).opacity,
            alphaTest: (refMesh.material as THREE.MeshBasicMaterial).alphaTest,
            side: THREE.DoubleSide,
          });
          const customMat = createSourceScreenMaterial(mainSource, "main_world_screen");
          if (customMat instanceof THREE.MeshBasicMaterial) {
            animatedScreenMaterials.push(customMat);
          }
          const mainBillboard = new THREE.Mesh(
            new THREE.PlaneGeometry(panelW, panelH),
            customMat,
          );
          mainBillboard.name = "main-billboard";
          mainBillboard.position.set(
            ORIGINAL_SPAWN.x,
            panelH * 0.5 + 0.4,
            ORIGINAL_SPAWN.z + 22,
          );
          mainBillboard.rotation.y = Math.PI;
          mainBillboard.layers.enable(BLOOM_SCENE_LAYER);
          mainBillboard.castShadow = false;
          mainBillboard.receiveShadow = false;
          scene.add(mainBillboard);
          customKitBillboard = mainBillboard;

          const upperPanelW = panelW * 0.82;
          const upperPanelH = panelH * 0.42;
          const upperPanelGap = Math.max(0.6, panelH * 0.06);
          const upperRefMesh = kitScreenMeshes[1] ?? kitScreenMeshes[0];
          const upperRefMaterials = Array.isArray(upperRefMesh.material)
            ? upperRefMesh.material
            : [upperRefMesh.material];
          const upperRefMaterial = upperRefMaterials.find(
            (material): material is THREE.MeshBasicMaterial =>
              material instanceof THREE.MeshBasicMaterial && !!material.map,
          );
          const upperSource = new THREE.MeshStandardMaterial({
            map: upperRefMaterial?.map ?? mainSource.map,
            alphaMap: upperRefMaterial?.alphaMap ?? mainSource.alphaMap,
            transparent: upperRefMaterial?.transparent ?? mainSource.transparent,
            opacity: upperRefMaterial?.opacity ?? mainSource.opacity,
            alphaTest: upperRefMaterial?.alphaTest ?? mainSource.alphaTest,
            side: THREE.DoubleSide,
          });
          const upperMat = createSourceScreenMaterial(upperSource, "upper_world_screen");
          if (upperMat instanceof THREE.MeshBasicMaterial) {
            animatedScreenMaterials.push(upperMat);
          }
          const upperBillboard = new THREE.Mesh(
            new THREE.PlaneGeometry(upperPanelW, upperPanelH),
            upperMat,
          );
          upperBillboard.name = "upper-main-billboard";
          upperBillboard.position.set(
            mainBillboard.position.x,
            mainBillboard.position.y + panelH * 0.5 + upperPanelGap + upperPanelH * 0.5,
            mainBillboard.position.z,
          );
          upperBillboard.rotation.copy(mainBillboard.rotation);
          upperBillboard.layers.enable(BLOOM_SCENE_LAYER);
          upperBillboard.castShadow = false;
          upperBillboard.receiveShadow = false;
          scene.add(upperBillboard);

          renderer.domElement.dataset.customBillboard = "kit-screen-texture-animated-bloom";
          renderer.domElement.dataset.customBillboardSize =
            panelW.toFixed(2) + "x" + panelH.toFixed(2);
          renderer.domElement.dataset.upperBillboard = "distinct-kit-screen-texture-animated-bloom";
          renderer.domElement.dataset.upperBillboardSize =
            upperPanelW.toFixed(2) + "x" + upperPanelH.toFixed(2);
          renderer.domElement.dataset.upperBillboardGap = upperPanelGap.toFixed(2);

        } else {

          renderer.domElement.dataset.customBillboard = "missing-kit-screen-source";
        }
        renderer.domElement.dataset.archivedBillboards = "decorative-video,works-video";

        scene.add(cityRoot);
        cityRoot.updateMatrixWorld(true);
        const cityBounds = new THREE.Box3().setFromObject(cityRoot);
        playableBounds.min.set(
          cityBounds.min.x + WORLD_BOUNDARY_INSET,
          0,
          cityBounds.min.z + WORLD_BOUNDARY_INSET,
        );
        playableBounds.max.set(
          cityBounds.max.x - WORLD_BOUNDARY_INSET,
          0,
          cityBounds.max.z - WORLD_BOUNDARY_INSET,
        );

        // ── Kit city fully visible and active ──────────────────────────────
        // All instances, collision meshes, ground meshes, and camera surfaces
        // are live. Decorative and works video planes are also live.
        cityRoot.visible = true;
        void decorativeVideo.play().catch(() => undefined);
        void worksVideo.play().catch(() => undefined);

        renderer.domElement.dataset.cityInstanceCount = String(instanceCount);
        renderer.domElement.dataset.sourceScreenMeshCount = String(sourceScreenMeshCount);
        renderer.domElement.dataset.sourceSurfaceMeshCount = String(sourceSurfaceMeshCount);
        renderer.domElement.dataset.playerCollisionMeshCount = String(collisionMeshes.length);
        renderer.domElement.dataset.cameraCollisionMeshCount = String(cameraCollisionSurfaces.length);
        renderer.domElement.dataset.rotatingScreenProfile = "source-pcg-local-y";
        renderer.domElement.dataset.worldLayout = "original-kit-instances";
        markLoaded();
      },
      (event) => {
        if (event.total > 0) reportProgress((event.loaded / event.total) * 45);
      },
      () => markLoaded(),
    );



    const keyState = new Set<string>();
    const movementCodes = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowLeft",
      "ArrowDown",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "KeyX",
      "KeyM",
      "Space",
    ]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
        return;
      }
      if (modeRef.current === "explore" && movementCodes.has(event.code)) event.preventDefault();
      keyState.add(event.code);

      // Holding Space/Control cancels an in-progress auto-descend so manual flight always wins.
      if (
        (event.code === "Space" || event.code === "ControlLeft" || event.code === "ControlRight") &&
        modeRef.current === "explore"
      ) {
        autoDescending = false;
      }

      // X: auto-descend straight down to the ground from wherever you're flying.
      if (event.code === "KeyX" && !event.repeat && modeRef.current === "explore") {
        autoDescending = true;
        isGrounded = false;
      }

      // M: temporary reference mark only (keep last 3). Not spawn.
      // Also mirrors the list into project-root markers.txt via /api/markers.
      if (event.code === "KeyM" && !event.repeat && modeRef.current === "explore") {
        positionMarks.push({
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        });
        if (positionMarks.length > 3) positionMarks.splice(0, positionMarks.length - 3);
        renderer.domElement.dataset.markCount = String(positionMarks.length);
        const marksSnapshot = positionMarks.map((mark) => ({ ...mark }));
        callbacksRef.current.onStats({
          fps: lastReportedFps,
          frameMs: lastReportedFrameMs,
          engine: "WebGL",
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          marks: marksSnapshot,
        });
        void fetch("/api/markers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marks: marksSnapshot }),
        }).catch(() => {
          // Dev-only log; ignore network failures silently.
        });
      }

      if (event.code === "Space" && !event.repeat && modeRef.current === "explore") {
        const nowSeconds = performance.now() / 1000;
        const withinCoyoteWindow = isGrounded || nowSeconds - lastGroundedTime <= PLAYER_COYOTE_TIME;
        if (!withinCoyoteWindow && jumpCount === 0) jumpCount = 1;
        if (jumpCount < PLAYER_MAX_JUMPS) {
        jumpVelocity = JUMP_FORCE;
        isGrounded = false;
        jumpCount = withinCoyoteWindow ? 1 : jumpCount + 1;
        renderer.domElement.dataset.jumpCount = String(jumpCount);
        renderer.domElement.dataset.isGrounded = "false";
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keyState.delete(event.code);
    const onWindowBlur = () => keyState.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);

    const pointer = new THREE.Vector2();
    let cameraHeading = 0;
    let targetCameraHeading = 0;
    let cameraElevation = CAMERA_INITIAL_ELEVATION;
    let targetCameraElevation = CAMERA_INITIAL_ELEVATION;
    let cameraDistance = CAMERA_DEFAULT_DISTANCE;
    let targetCameraDistance = CAMERA_DEFAULT_DISTANCE;
    let resolvedCameraDistance = CAMERA_DEFAULT_DISTANCE;
    let cameraLooking = false;
    renderer.domElement.dataset.mouseLook = "click-to-look";

    const onPointerLockChange = () => {
      cameraLooking = document.pointerLockElement === renderer.domElement;
      targetCameraHeading = cameraHeading;
      targetCameraElevation = cameraElevation;
      renderer.domElement.classList.toggle("is-camera-looking", cameraLooking);
      renderer.domElement.dataset.mouseLook = cameraLooking ? "locked" : "click-to-look";
    };
    const onPointerLockError = () => {
      renderer.domElement.dataset.mouseLook = "pointer-lock-unavailable";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (modeRef.current !== "explore" || event.button !== 0) return;
      event.preventDefault();
      renderer.domElement.focus({ preventScroll: true });
      if (!cameraLooking) {
        renderer.domElement.dataset.mouseLook = "requesting";
        void renderer.domElement.requestPointerLock();
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight * 2 - 1);
      if (!cameraLooking) return;
      const movementX = THREE.MathUtils.clamp(
        Number.isFinite(event.movementX) ? event.movementX : 0,
        -CAMERA_POINTER_MAX_DELTA,
        CAMERA_POINTER_MAX_DELTA,
      );
      const movementY = THREE.MathUtils.clamp(
        Number.isFinite(event.movementY) ? event.movementY : 0,
        -CAMERA_POINTER_MAX_DELTA,
        CAMERA_POINTER_MAX_DELTA,
      );
      targetCameraHeading = Math.atan2(
        Math.sin(targetCameraHeading - movementX * CAMERA_DRAG_SENSITIVITY),
        Math.cos(targetCameraHeading - movementX * CAMERA_DRAG_SENSITIVITY),
      );
      targetCameraElevation = THREE.MathUtils.clamp(
        targetCameraElevation - movementY * CAMERA_DRAG_SENSITIVITY,
        CAMERA_MIN_ELEVATION,
        CAMERA_MAX_ELEVATION,
      );
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onWheel = (event: WheelEvent) => {
      if (modeRef.current !== "explore") return;
      event.preventDefault();
      targetCameraDistance = THREE.MathUtils.clamp(
        targetCameraDistance + event.deltaY * 0.025,
        CAMERA_MIN_DISTANCE,
        CAMERA_MAX_DISTANCE,
      );
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });

    let previousFrameTime = performance.now();
    let elapsedTime = 0;
    const playerDirection = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    const cameraRight = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();
    const moveStep = new THREE.Vector3();
    const movementPerpendicular = new THREE.Vector3();
    const movementHitNormal = new THREE.Vector3();
    const movementSlideDirection = new THREE.Vector3();
    const movementNormalMatrix = new THREE.Matrix3();
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const movementRaycaster = new THREE.Raycaster();
    const groundRaycaster = new THREE.Raycaster();
    const groundRayOrigin = new THREE.Vector3();
    const groundRayDirection = new THREE.Vector3(0, -1, 0);
    const cameraCollisionRaycaster = new THREE.Raycaster();
    const cameraCollisionDirection = new THREE.Vector3();
    const cameraSweepRight = new THREE.Vector3();
    const cameraSweepUp = new THREE.Vector3();
    const cameraSweepOrigin = new THREE.Vector3();
    const cameraWorldUp = new THREE.Vector3(0, 1, 0);
    const cameraTarget = new THREE.Vector3(
      PLAYER_SPAWN.x,
      PLAYER_SPAWN.y + CAMERA_TARGET_HEIGHT,
      PLAYER_SPAWN.z,
    );
    const desiredCamera = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const modeCamera = {
      explore: new THREE.Vector3(0, 8.2, 44),
      works: new THREE.Vector3(0, 10.5, 44),
      about: new THREE.Vector3(0, 12, 52),
    } satisfies Record<SamsyMode, THREE.Vector3>;

    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, width < 720 ? 1.15 : 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      bloomComposer.setPixelRatio(dpr);
      bloomComposer.setSize(width, height);
      bloom.radius = 0.27 * dpr;
      finalComposer.setPixelRatio(dpr);
      finalComposer.setSize(width, height);
      sourceComposite.uniforms.resolution.value.set(width * dpr, height * dpr);
      reflector.getRenderTarget().setSize(
        Math.max(1, Math.round(width * dpr * 0.75)),
        Math.max(1, Math.round(height * dpr * 0.75)),
      );
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width < 720 ? 75 : 60;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const applyPlanarPlayerMove = (direction: THREE.Vector3, distance: number) => {
      moveStep.copy(direction).multiplyScalar(distance);
      player.position.add(moveStep);
      player.position.x = THREE.MathUtils.clamp(
        player.position.x,
        playableBounds.min.x,
        playableBounds.max.x,
      );
      player.position.z = THREE.MathUtils.clamp(
        player.position.z,
        playableBounds.min.z,
        playableBounds.max.z,
      );
    };

    const castPlayerSweep = (direction: THREE.Vector3, distance: number) => {
      let nearestHit: THREE.Intersection<THREE.Object3D> | null = null;
      movementPerpendicular.set(-direction.z, 0, direction.x).normalize();
      movementRaycaster.near = 0;
      movementRaycaster.far = distance + PLAYER_COLLISION_SKIN;

      for (const height of PLAYER_COLLISION_HEIGHTS) {
        for (const lateralOffset of [-1, 0, 1] as const) {
          const edgeSample = Math.abs(lateralOffset);
          const forwardRadius = PLAYER_RADIUS * (edgeSample === 0 ? 1 : Math.SQRT1_2);
          const lateralRadius = PLAYER_RADIUS * Math.SQRT1_2 * lateralOffset;
          rayOrigin
            .set(player.position.x, player.position.y + height, player.position.z)
            .addScaledVector(direction, forwardRadius)
            .addScaledVector(movementPerpendicular, lateralRadius);
          movementRaycaster.set(rayOrigin, direction);
          const [hit] = movementRaycaster.intersectObjects(collisionMeshes, false);
          if (hit && (!nearestHit || hit.distance < nearestHit.distance)) nearestHit = hit;
        }
      }
      return nearestHit;
    };

    const movePlayer = (direction: THREE.Vector3, distance: number) => {
      if (distance <= 0) return;
      rayDirection.copy(direction).setY(0);
      if (rayDirection.lengthSq() < 1e-8) return;
      rayDirection.normalize();
      let remainingDistance = distance;

      for (let iteration = 0; iteration < PLAYER_SLIDE_ITERATIONS; iteration += 1) {
        if (remainingDistance <= PLAYER_COLLISION_SKIN) break;
        const hit = collisionMeshes.length > 0
          ? castPlayerSweep(rayDirection, remainingDistance)
          : null;
        if (!hit) {
          applyPlanarPlayerMove(rayDirection, remainingDistance);
          break;
        }

        const travelDistance = Math.min(
          remainingDistance,
          Math.max(0, hit.distance - PLAYER_COLLISION_SKIN),
        );
        if (travelDistance > 0) applyPlanarPlayerMove(rayDirection, travelDistance);
        remainingDistance -= travelDistance;
        if (remainingDistance <= PLAYER_COLLISION_SKIN || !hit.face) break;

        movementNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
        movementHitNormal.copy(hit.face.normal).applyMatrix3(movementNormalMatrix);
        movementHitNormal.y = 0;
        if (movementHitNormal.lengthSq() < 1e-8) break;
        movementHitNormal.normalize();
        let inwardAmount = rayDirection.dot(movementHitNormal);
        if (inwardAmount > 0) {
          movementHitNormal.negate();
          inwardAmount = -inwardAmount;
        }
        if (inwardAmount >= -1e-4) break;

        movementSlideDirection
          .copy(rayDirection)
          .addScaledVector(movementHitNormal, -inwardAmount);
        const slideScale = movementSlideDirection.length();
        if (slideScale < 1e-4) break;
        remainingDistance *= slideScale;
        rayDirection.copy(movementSlideDirection).multiplyScalar(1 / slideScale);
      }
    };

    const sampleGroundHeight = () => {
      if (groundMeshes.length === 0) return 0;
      const rayStartY = player.position.y + 1.0;
      groundRayOrigin.set(player.position.x, rayStartY, player.position.z);
      groundRaycaster.set(groundRayOrigin, groundRayDirection);
      groundRaycaster.near = 0;
      groundRaycaster.far = 4.0;
      const hits = groundRaycaster.intersectObjects(groundMeshes, false);
      for (const hit of hits) {
        if (hit.point.y <= player.position.y + 0.35) {
          return Math.max(0, hit.point.y);
        }
      }
      return 0;
    };

    const resolveExploreCameraDistance = (
      target: THREE.Vector3,
      direction: THREE.Vector3,
      idealDistance: number,
    ) => {
      if (cameraCollisionSurfaces.length === 0) return idealDistance;

      cameraSweepRight.crossVectors(direction, cameraWorldUp);
      if (cameraSweepRight.lengthSq() < 1e-8) cameraSweepRight.set(1, 0, 0);
      else cameraSweepRight.normalize();
      cameraSweepUp.crossVectors(cameraSweepRight, direction).normalize();

      let nearestDistance = idealDistance;
      const sweepSamples = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [Math.SQRT1_2, Math.SQRT1_2],
        [-Math.SQRT1_2, Math.SQRT1_2],
        [Math.SQRT1_2, -Math.SQRT1_2],
        [-Math.SQRT1_2, -Math.SQRT1_2],
      ] as const;

      for (const [rightOffset, upOffset] of sweepSamples) {
        cameraSweepOrigin
          .copy(target)
          .addScaledVector(cameraSweepRight, rightOffset * CAMERA_COLLISION_RADIUS)
          .addScaledVector(cameraSweepUp, upOffset * CAMERA_COLLISION_RADIUS);
        cameraCollisionRaycaster.set(cameraSweepOrigin, direction);
        cameraCollisionRaycaster.near = 0.02;
        cameraCollisionRaycaster.far = idealDistance;
        const [hit] = cameraCollisionRaycaster.intersectObjects(cameraCollisionSurfaces, false);
        if (hit) nearestDistance = Math.min(nearestDistance, hit.distance - CAMERA_CLEARANCE);
      }

      return THREE.MathUtils.clamp(
        nearestDistance,
        CAMERA_COLLISION_MIN_DISTANCE,
        idealDistance,
      );
    };

    let highCpuStartTime = 0;
    let isKillSwitchTriggered = false;

    const resumeEngine = () => {
      if (isKillSwitchTriggered) {
        isKillSwitchTriggered = false;
        highCpuStartTime = 0;
        previousFrameTime = performance.now();
        animate();
      }
    };
    const onResumeEvent = () => resumeEngine();
    window.addEventListener("samsy-resume-cpu-killswitch", onResumeEvent);

    const onManualKillSwitch = () => {
      isKillSwitchTriggered = true;
      cancelAnimationFrame(animationFrame);
      console.warn("[CPU Kill Switch] Manually triggered. Terminating dev server...");
      if (renderer?.domElement) {
        renderer.domElement.dataset.killSwitch = "true";
      }
      void fetch("/api/cpu-kill-switch", { method: "POST" }).catch(() => undefined);
      window.dispatchEvent(new CustomEvent("samsy-cpu-killswitch"));
    };
    (window as unknown as Record<string, unknown>).__triggerCpuKillSwitch = onManualKillSwitch;

    const onKeyDownKillSwitch = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toUpperCase() === "K") {
        onManualKillSwitch();
      }
    };
    window.addEventListener("keydown", onKeyDownKillSwitch);

    const animate = (time = performance.now()) => {
      if (disposed || isKillSwitchTriggered) return;
      const workStart = performance.now();
      animationFrame = requestAnimationFrame(animate);
      const rawDelta = Math.max(0, (time - previousFrameTime) / 1000);
      previousFrameTime = time;
      const delta = Math.min(rawDelta, 0.05);
      elapsedTime += delta;
      const elapsed = elapsedTime;
      statsFrames += 1;
      statsElapsed += rawDelta;

      const activeMode = modeRef.current;
      const isSprinting = true;
      if (activeMode === "explore") {
        const orbitDamping = 1 - Math.pow(1 - CAMERA_ROTATION_DAMPING, delta * 60);
        const headingError = Math.atan2(
          Math.sin(targetCameraHeading - cameraHeading),
          Math.cos(targetCameraHeading - cameraHeading),
        );
        cameraHeading = Math.atan2(
          Math.sin(cameraHeading + headingError * orbitDamping),
          Math.cos(cameraHeading + headingError * orbitDamping),
        );
        markHeading = cameraHeading;
        cameraElevation = THREE.MathUtils.lerp(cameraElevation, targetCameraElevation, orbitDamping);

        const forwardInput =
          (keyState.has("KeyW") || keyState.has("ArrowUp") ? 1 : 0) -
          (keyState.has("KeyS") || keyState.has("ArrowDown") ? 1 : 0);
        const strafeInput =
          (keyState.has("KeyD") || keyState.has("ArrowRight") ? 1 : 0) -
          (keyState.has("KeyA") || keyState.has("ArrowLeft") ? 1 : 0);
        cameraForward.set(Math.sin(cameraHeading), 0, Math.cos(cameraHeading));
        cameraRight.set(-Math.cos(cameraHeading), 0, Math.sin(cameraHeading));
        playerDirection
          .set(0, 0, 0)
          .addScaledVector(cameraForward, forwardInput)
          .addScaledVector(cameraRight, strafeInput);
        const isMoving = playerDirection.lengthSq() > 0;
        speedMultiplier = isMoving
          ? Math.min(
              PLAYER_MAX_SPEED_MULTIPLIER,
              speedMultiplier + PLAYER_ACCELERATION_RATE * delta,
            )
          : Math.max(1, speedMultiplier - PLAYER_DECELERATION_RATE * delta);
        if (isMoving) {
          playerDirection.normalize();
          const movementDistance =
            PLAYER_BASE_SPEED * speedMultiplier * (isSprinting ? PLAYER_SPRINT_BOOST : 1) * delta;
          for (let step = 0; step < PLAYER_PHYSICS_STEPS; step += 1) {
            movePlayer(playerDirection, movementDistance / PLAYER_PHYSICS_STEPS);
          }
          const targetHeading = Math.atan2(playerDirection.x, playerDirection.z);
          const rotationDelta = Math.atan2(
            Math.sin(targetHeading - player.rotation.y),
            Math.cos(targetHeading - player.rotation.y),
          );
          player.rotation.y += rotationDelta * (1 - Math.exp(-10 * delta));
        }

        const physicsDelta = delta / PLAYER_PHYSICS_STEPS;
        const isFlyingUp = keyState.has("Space");
        const isFlyingDown = keyState.has("ControlLeft") || keyState.has("ControlRight");
        for (let step = 0; step < PLAYER_PHYSICS_STEPS; step += 1) {
          if (autoDescending) {
            // X: fast automatic descent straight down to the ground below.
            flightMode = true;
            currentGroundHeight = sampleGroundHeight();
            const descendStep = AUTO_DESCEND_SPEED * physicsDelta;
            if (player.position.y - currentGroundHeight <= descendStep) {
              player.position.y = currentGroundHeight;
              jumpVelocity = 0;
              isGrounded = true;
              jumpCount = 0;
              lastGroundedTime = time / 1000;
              autoDescending = false;
              flightMode = false;
            } else {
              player.position.y -= descendStep;
              isGrounded = false;
            }
          } else if (isFlyingUp || isFlyingDown) {
            // Hold Space to fly up, hold Control to fly down. Releasing holds altitude (hover).
            // Space wins if both are held — no opposing cancel that can stall the loop.
            flightMode = true;
            isGrounded = false;
            jumpVelocity = 0;
            const vertical = isFlyingUp ? 1 : isFlyingDown ? -1 : 0;
            const flyStep = vertical * FLY_SPEED * physicsDelta;
            player.position.y = THREE.MathUtils.clamp(player.position.y + flyStep, 0, FLY_MAX_ALTITUDE);
            currentGroundHeight = sampleGroundHeight();
            // Only land while descending; never force-land while Space is held.
            if (!isFlyingUp && player.position.y <= currentGroundHeight) {
              player.position.y = currentGroundHeight;
              isGrounded = true;
              jumpCount = 0;
              lastGroundedTime = time / 1000;
              flightMode = false;
            }
          } else if (flightMode) {
            // Hover: stay at current altitude until Control/X or ground contact.
            jumpVelocity = 0;
            isGrounded = false;
            currentGroundHeight = sampleGroundHeight();
            if (player.position.y <= currentGroundHeight) {
              player.position.y = currentGroundHeight;
              isGrounded = true;
              jumpCount = 0;
              lastGroundedTime = time / 1000;
              flightMode = false;
            }
          } else {
            currentGroundHeight = sampleGroundHeight();
            if (isGrounded) {
              if (currentGroundHeight < player.position.y - 0.35) {
                isGrounded = false;
                jumpVelocity = 0;
              } else {
                player.position.y = currentGroundHeight;
                lastGroundedTime = time / 1000;
              }
            }
            if (!isGrounded) {
              jumpVelocity -= GRAVITY * physicsDelta;
              player.position.y += jumpVelocity * physicsDelta;
              currentGroundHeight = sampleGroundHeight();
              if (player.position.y <= currentGroundHeight) {
                player.position.y = currentGroundHeight;
                jumpVelocity = 0;
                isGrounded = true;
                jumpCount = 0;
                lastGroundedTime = time / 1000;
              }
            }
          }
        }

        const eyeHeight = 1.65;
        camera.position.set(player.position.x, player.position.y + eyeHeight, player.position.z);
        const lookDirX = Math.sin(cameraHeading) * Math.cos(cameraElevation);
        const lookDirY = Math.sin(cameraElevation);
        const lookDirZ = Math.cos(cameraHeading) * Math.cos(cameraElevation);
        cameraTarget.set(
          camera.position.x + lookDirX * 10,
          camera.position.y + lookDirY * 10,
          camera.position.z + lookDirZ * 10,
        );
      } else {
        desiredCamera.copy(modeCamera[activeMode]);
        desiredCamera.x += pointer.x * (activeMode === "about" ? 1.5 : 0.55);
        desiredCamera.y += pointer.y * 0.35;
        desiredLook.set(0, activeMode === "about" ? 7 : 5, activeMode === "about" ? -28 : -20);
      }
      if (activeMode !== "explore") {
        cameraTarget.lerp(desiredLook, 1 - Math.pow(0.002, delta));
        camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, delta));
      }
      camera.lookAt(cameraTarget);
      renderer.domElement.dataset.playerX = player.position.x.toFixed(2);
      renderer.domElement.dataset.playerY = player.position.y.toFixed(2);
      renderer.domElement.dataset.playerZ = player.position.z.toFixed(2);
      renderer.domElement.dataset.groundHeight = currentGroundHeight.toFixed(2);
      renderer.domElement.dataset.cameraHeading = cameraHeading.toFixed(4);
      renderer.domElement.dataset.cameraElevation = cameraElevation.toFixed(4);
      renderer.domElement.dataset.cameraDistance = cameraDistance.toFixed(2);
      renderer.domElement.dataset.cameraActualDistance = resolvedCameraDistance.toFixed(2);
      renderer.domElement.dataset.cameraTargetDistance = targetCameraDistance.toFixed(2);
      renderer.domElement.dataset.cameraX = camera.position.x.toFixed(2);
      renderer.domElement.dataset.cameraY = camera.position.y.toFixed(2);
      renderer.domElement.dataset.cameraZ = camera.position.z.toFixed(2);
      renderer.domElement.dataset.cameraSolver = "third-person-sphere-sweep-v1";
      renderer.domElement.dataset.cameraObstructed = String(
        resolvedCameraDistance < cameraDistance - 0.03,
      );
      renderer.domElement.dataset.physicsProfile = "structural-capsule-slide-3-substeps";
      renderer.domElement.dataset.cameraFov = camera.fov.toFixed(2);
      renderer.domElement.dataset.fogNear = scene.fog instanceof THREE.Fog ? scene.fog.near.toFixed(2) : "0";
      renderer.domElement.dataset.fogFar = scene.fog instanceof THREE.Fog ? scene.fog.far.toFixed(2) : "0";
      renderer.domElement.dataset.worldMinX = playableBounds.min.x.toFixed(2);
      renderer.domElement.dataset.worldMaxX = playableBounds.max.x.toFixed(2);
      renderer.domElement.dataset.worldMinZ = playableBounds.min.z.toFixed(2);
      renderer.domElement.dataset.worldMaxZ = playableBounds.max.z.toFixed(2);
      renderer.domElement.dataset.avatarScale = avatarRoot?.scale.x.toFixed(2) ?? "0";
      renderer.domElement.dataset.speedMultiplier = speedMultiplier.toFixed(2);
      renderer.domElement.dataset.effectiveMovementSpeed = (
        PLAYER_BASE_SPEED * speedMultiplier * (isSprinting ? PLAYER_SPRINT_BOOST : 1)
      ).toFixed(2);
      renderer.domElement.dataset.sprinting = String(isSprinting);
      renderer.domElement.dataset.jumpCount = String(jumpCount);
      renderer.domElement.dataset.isGrounded = String(isGrounded);
      renderer.domElement.dataset.autoDescending = String(autoDescending);
      renderer.domElement.dataset.flightMode = String(flightMode);
      renderer.domElement.dataset.isFlying = String(
        flightMode || autoDescending || keyState.has("Space") || keyState.has("ControlLeft") || keyState.has("ControlRight"),
      );
      renderer.domElement.dataset.animatedScreenCount = String(animatedScreenMaterials.length);
      renderer.domElement.dataset.playingScreenVideos = String([
        decorativeVideo,
        worksVideo,
      ].filter((video) => !video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA).length);
      const decorativeVideoTime = Number.isFinite(decorativeVideo.currentTime)
        ? decorativeVideo.currentTime
        : 0;
      const worksVideoTime = Number.isFinite(worksVideo.currentTime)
        ? worksVideo.currentTime
        : 0;
      renderer.domElement.dataset.decorativeVideoTime = decorativeVideoTime.toFixed(3);
      renderer.domElement.dataset.worksVideoTime = worksVideoTime.toFixed(3);
      renderer.domElement.dataset.screenVideoTime = (
        decorativeVideoTime + worksVideoTime
      ).toFixed(3);
      redLight.position.copy(player.position).add(new THREE.Vector3(0, 9, 5));
      cyanLight.position.copy(player.position).add(new THREE.Vector3(-40, 28, 35));
      magentaLight.position.copy(player.position).add(new THREE.Vector3(45, 24, -55));

      const playerIsMoving = activeMode === "explore" && playerDirection.lengthSq() > 0.0001;
      if (avatar) avatar.update(delta);
      if (avatarRoot) {
        avatarRoot.position.y = playerIsMoving ? 0.02 : 0.02 + Math.sin(elapsed * 2.1) * 0.045;
      }
      animatedScreenMaterials.forEach((material) => {
        const uniforms = material.userData.screenUniforms as
          | { time?: { value: number } }
          | undefined;
        if (uniforms?.time) uniforms.time.value = elapsed;
      });
      rotatingScreens.forEach((screen) => {
        const phase = Number(screen.userData.rotationPhase) || 0;
        screen.rotation.y = elapsed + phase;
      });
      npcs.forEach((npc, index) => {
        const baseY = Number(npc.userData.baseY) || 0;
        npc.position.y = baseY + Math.sin(elapsed * 1.05 + index * 1.7) * 0.025;
        const targetYaw = Math.atan2(
          player.position.x - npc.position.x,
          player.position.z - npc.position.z,
        );
        const yawDelta = Math.atan2(
          Math.sin(targetYaw - npc.rotation.y),
          Math.cos(targetYaw - npc.rotation.y),
        );
        npc.rotation.y += yawDelta * (1 - Math.exp(-0.75 * delta));
      });
      redLight.intensity = 0.24 + Math.sin(elapsed * 3.2) * 0.04;
      bloom.strength = 0.34;
      sourceComposite.uniforms.bloomGain.value = activeMode === "explore" ? 0.95 : 0.68;

      renderPostProcessedScene();

      const workEnd = performance.now();
      const frameWorkMs = workEnd - workStart;
      const frameTotalMs = Math.max(1, rawDelta * 1000);
      const targetFrameBudgetMs = 16.67;
      const cpuWorkBudgetRatio = frameWorkMs / targetFrameBudgetMs;

      // High CPU / severe lag condition (over 90% frame budget used or < 30 FPS for 10 seconds):
      // Ignore initial 12 seconds during asset download and shader compilation
      const isHighCpu = (elapsed > 12) && (cpuWorkBudgetRatio >= 0.90 || frameWorkMs >= 15 || frameTotalMs >= 33.3);

      if (isHighCpu) {
        if (highCpuStartTime === 0) {
          highCpuStartTime = workEnd;
        } else if (workEnd - highCpuStartTime >= 10000) {
          isKillSwitchTriggered = true;
          cancelAnimationFrame(animationFrame);
          console.warn("[CPU Kill Switch] High CPU / Frame load (>90% or <30 FPS for 10s). Terminating dev server...");
          if (renderer?.domElement) {
            renderer.domElement.dataset.killSwitch = "true";
          }
          // Terminate the Next.js dev server process via API route
          void fetch("/api/cpu-kill-switch", { method: "POST" }).catch(() => undefined);
          // Also dispatch event so UI can show a message before reload
          window.dispatchEvent(
            new CustomEvent("samsy-cpu-killswitch", {
              detail: {
                reason: "CPU load above 90% or FPS below 30 for 10 seconds",
                workMs: Math.round(frameWorkMs * 10) / 10,
                frameTotalMs: Math.round(frameTotalMs * 10) / 10,
              },
            }),
          );
          return;
        }
      } else {
        highCpuStartTime = 0;
      }

      const now = performance.now();
      if (now - lastStatsUpdate > 750 && statsElapsed > 0) {
        const fps = statsFrames / statsElapsed;
        lastReportedFps = Math.round(fps);
        lastReportedFrameMs = Math.round((1000 / Math.max(fps, 1)) * 10) / 10;
        callbacksRef.current.onStats({
          fps: lastReportedFps,
          frameMs: lastReportedFrameMs,
          engine: "WebGL",
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          marks: positionMarks.map((mark) => ({ ...mark })),
        });
        lastStatsUpdate = now;
        statsFrames = 0;
        statsElapsed = 0;
      }
    };
    animate();

    const onVisibility = () => {
      if (!document.hidden) previousFrameTime = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      applyDayModeRef.current = null;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("samsy-resume-cpu-killswitch", onResumeEvent);
      window.removeEventListener("keydown", onKeyDownKillSwitch);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      decorativeVideo.pause();
      decorativeVideo.removeAttribute("src");
      decorativeVideo.load();
      decorativeVideoTexture.dispose();
      worksVideo.pause();
      worksVideo.removeAttribute("src");
      worksVideo.load();
      worksVideoTexture.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          material.dispose();
        });
      });
      bloomOccluderMaterialCache.forEach((material) => material.dispose());
      bloomOccluderMaterialCache.clear();
      floorTexture.dispose();
      reflector.getRenderTarget().dispose();
      bloomComposer.dispose();
      finalComposer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      host.replaceChildren();
      collisionMeshes.length = 0;
      groundMeshes.length = 0;
      cameraCollisionSurfaces.length = 0;
      avatar = null;
      avatarRoot = null;
      cityRoot = null;
    };
  }, []);

  return (
    <div ref={mountRef} className="samsy-canvas" aria-hidden="true">
      {killSwitchTriggered && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "rgba(20, 0, 0, 0.9)",
            border: "1px solid #ff3366",
            borderRadius: "6px",
            padding: "12px 20px",
            color: "#ff3366",
            fontFamily: "monospace",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 0 20px rgba(255, 51, 102, 0.4)",
          }}
        >
          <span>⚠️ <strong>CPU KILL SWITCH ACTIVATED</strong> (CPU usage &gt; 90% for 10s)</span>
          <button
            type="button"
            onClick={() => {
              setKillSwitchTriggered(false);
              window.dispatchEvent(new CustomEvent("samsy-resume-cpu-killswitch"));
            }}
            style={{
              backgroundColor: "#ff3366",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            RESUME ENGINE
          </button>
        </div>
      )}
    </div>
  );
}
