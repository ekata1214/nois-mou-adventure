import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { attachShellMuu3d } from "./shell-muu-3d.js?v=20260705shell";
import { estimateRoomFloorY } from "./shell-floor.js";
import { createProceduralShellRoom } from "./shell-procedural-room.js?v=20260705shell";
import {
  assetUrl,
  estimateMobileRoomBudget,
  loadFirstGlb,
} from "./shell-asset-loader.js?v=20260705shell";
import { isMobileDevice } from "./mobile-viewport.js?v=20260705shell";

const GLB_FALLBACK_FILES = ["this ver2.glb", "this ver2.GLB", "this.glb", "this.GLB"];

async function readManifest(basePath) {
  try {
    const res = await fetch(assetUrl(basePath, "manifest.json"));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function modelCandidates(manifest, { mobile = false } = {}) {
  const files = [];
  if (mobile && manifest?.mobileModel) files.push(manifest.mobileModel);
  if (Array.isArray(manifest?.mobileModels)) files.push(...manifest.mobileModels);
  if (manifest?.model) files.push(manifest.model);
  if (Array.isArray(manifest?.models)) files.push(...manifest.models);
  return [...new Set([...files, ...GLB_FALLBACK_FILES])];
}

function fitModel(root, camera, manifest) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  if (manifest?.scale) root.scale.multiplyScalar(manifest.scale);

  const fov = camera.fov * (Math.PI / 180);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const dist = (maxDim / (2 * Math.tan(fov / 2))) * (manifest?.cameraDistance ?? 1.35);

  let lookAt = new THREE.Vector3(0, size.y * 0.05, 0);
  if (manifest?.camera?.lookAt) {
    const [x, y, z] = manifest.camera.lookAt;
    lookAt.set(x, y, z);
  }

  if (manifest?.camera?.position) {
    const [x, y, z] = manifest.camera.position;
    camera.position.set(x, y, z);
  } else {
    camera.position.set(0, size.y * 0.2, dist);
  }

  camera.lookAt(lookAt);

  const floorY = estimateRoomFloorY(root, manifest);

  return { size, dist, lookAt, floorY };
}

function makeFlareTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.2, "rgba(220,240,255,0.9)");
  core.addColorStop(0.55, "rgba(140,190,255,0.18)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "lighter";
  const streak = (w, h, alpha) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.35, `rgba(200,230,255,${alpha * 0.45})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  streak(size * 0.95, size * 0.06, 0.95);
  streak(size * 0.06, size * 0.95, 0.95);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function randomSpherePoint(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = Math.PI * 2 * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * (0.82 + Math.random() * 0.18);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function createStarfield(scene, manifest) {
  const group = new THREE.Group();
  const starCount = manifest?.starCount ?? 2800;
  const brightCount = manifest?.brightStarCount ?? 48;
  const radius = manifest?.starRadius ?? 120;

  const dimPositions = new Float32Array(starCount * 3);
  const dimColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const p = randomSpherePoint(radius);
    dimPositions[i * 3] = p.x;
    dimPositions[i * 3 + 1] = p.y;
    dimPositions[i * 3 + 2] = p.z;
    const tint = 0.75 + Math.random() * 0.25;
    dimColors[i * 3] = tint;
    dimColors[i * 3 + 1] = tint;
    dimColors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
  }

  const dimGeo = new THREE.BufferGeometry();
  dimGeo.setAttribute("position", new THREE.BufferAttribute(dimPositions, 3));
  dimGeo.setAttribute("color", new THREE.BufferAttribute(dimColors, 3));
  const dimMat = new THREE.PointsMaterial({
    size: manifest?.starSize ?? 0.55,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const dimStars = new THREE.Points(dimGeo, dimMat);
  group.add(dimStars);

  const flareTexture = makeFlareTexture();
  const brightPositions = new Float32Array(brightCount * 3);
  const brightSizes = new Float32Array(brightCount);
  const twinklePhase = new Float32Array(brightCount);
  for (let i = 0; i < brightCount; i += 1) {
    const p = randomSpherePoint(radius * 0.96);
    brightPositions[i * 3] = p.x;
    brightPositions[i * 3 + 1] = p.y;
    brightPositions[i * 3 + 2] = p.z;
    brightSizes[i] = 3.5 + Math.random() * 5.5;
    twinklePhase[i] = Math.random() * Math.PI * 2;
  }

  const brightGeo = new THREE.BufferGeometry();
  brightGeo.setAttribute("position", new THREE.BufferAttribute(brightPositions, 3));
  brightGeo.setAttribute("size", new THREE.BufferAttribute(brightSizes, 1));
  const brightMat = new THREE.PointsMaterial({
    map: flareTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xe8f2ff,
    size: 6,
    sizeAttenuation: true,
    opacity: 0.95,
  });
  const brightStars = new THREE.Points(brightGeo, brightMat);
  group.add(brightStars);

  scene.add(group);

  return {
    group,
    dimStars,
    brightStars,
    twinklePhase,
    brightSizes,
    update(time) {
      group.rotation.y = time * 0.008;
      const sizes = brightGeo.attributes.size.array;
      for (let i = 0; i < brightCount; i += 1) {
        const pulse = 0.72 + Math.sin(time * (0.7 + (i % 5) * 0.11) + twinklePhase[i]) * 0.28;
        sizes[i] = brightSizes[i] * pulse;
      }
      brightGeo.attributes.size.needsUpdate = true;
      dimMat.opacity = 0.82 + Math.sin(time * 0.15) * 0.04;
    },
    dispose() {
      dimGeo.dispose();
      dimMat.dispose();
      brightGeo.dispose();
      brightMat.dispose();
      flareTexture.dispose();
      scene.remove(group);
    },
  };
}

function defaultRoomFit(manifest) {
  const lookAt = new THREE.Vector3(0, 0.85, 0);
  return {
    size: new THREE.Vector3(4, 3, 4),
    dist: (manifest?.cameraDistance ?? 1.35) * 2.8,
    lookAt,
    floorY: 0,
  };
}

function canvasSize(canvas) {
  const parent = canvas.parentElement;
  if (parent) {
    const rect = parent.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w > 0 && h > 0) return { w, h };
  }
  return {
    w: parent?.clientWidth || canvas.clientWidth || 696,
    h: parent?.clientHeight || canvas.clientHeight || 424,
  };
}

async function loadRoomModel(basePath, manifest, { mobile = false, forceFull = false } = {}) {
  const params = new URLSearchParams(location.search);
  const wantFull = forceFull || params.has("fullroom");
  const skipHeavyOnMobile = mobile && manifest?.mobileSkipFullRoom !== false && !wantFull;

  if (skipHeavyOnMobile) {
    return {
      errors: ["mobile: full room GLB skipped (use ?fullroom=1 to force)"],
      skipped: true,
    };
  }

  const maxBytes = mobile
    ? (manifest?.mobileMaxRoomBytes ?? estimateMobileRoomBudget(manifest) * 1024 * 1024)
    : Infinity;
  const timeoutMs = mobile ? (manifest?.mobileRoomTimeoutMs ?? 45000) : (manifest?.roomTimeoutMs ?? 180000);

  return loadFirstGlb(basePath, modelCandidates(manifest, { mobile }), {
    timeoutMs,
    maxBytes,
  });
}

export async function createShellRoomView(canvas, basePath = "assets/room", hooks = {}) {
  if (!canvas) return { ready: false, error: "canvas missing" };

  const mobile = isMobileDevice();
  const manifest = await readManifest(basePath);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: mobile ? "default" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = manifest?.exposure ?? 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(manifest?.backgroundColor ?? 0x000000);
  const starfield = createStarfield(scene, manifest);

  const camera = new THREE.PerspectiveCamera(manifest?.camera?.fov ?? 42, 1, 0.05, 500);
  scene.add(new THREE.AmbientLight(0xffffff, manifest?.ambient ?? 0.65));
  const key = new THREE.DirectionalLight(0xfff0e0, manifest?.keyLight ?? 1.1);
  key.position.set(2, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8d8ff, manifest?.fillLight ?? 0.45);
  fill.position.set(-3, 1, -2);
  scene.add(fill);

  const roomRoot = new THREE.Group();
  scene.add(roomRoot);

  let fit;
  let modelName = null;
  let roomMode = "void";
  let proceduralRoom = null;
  let loadErrors = [];

  const loaded = await loadRoomModel(basePath, manifest, { mobile });
  loadErrors = loaded.errors ?? [];

  if (loaded.gltf) {
    roomRoot.add(loaded.gltf.scene);
    modelName = loaded.name;
    fit = fitModel(roomRoot, camera, manifest);
    roomMode = "glb";
    starfield.group.visible = false;
  } else {
    proceduralRoom = createProceduralShellRoom(manifest);
    roomRoot.add(proceduralRoom.group);
    fit = proceduralRoom.fit;
    camera.position.set(0, fit.lookAt.y + 0.35, fit.dist);
    camera.lookAt(fit.lookAt);
    roomMode = loaded.skipped || mobile ? "procedural" : "procedural";
    starfield.group.visible = roomMode === "void";
    if (roomMode === "procedural") starfield.group.visible = false;
  }

  const roomMissing = roomMode !== "glb";

  let muu = {
    ready: false,
    update() {},
    playSpeak() {},
    playIdle() {},
    dispose() {},
  };
  try {
    muu = await attachShellMuu3d(scene, fit, "assets/muu", roomRoot, manifest, {
      onLoopChange: hooks.onMuuLoopChange,
      mobile,
    });
  } catch (err) {
    console.warn("shell muu load failed:", err);
    loadErrors.push(`muu: ${err?.message ?? err}`);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(fit.lookAt);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;
  controls.enablePan = false;
  controls.minDistance = fit.dist * 0.45;
  controls.maxDistance = fit.dist * 2.8;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.minPolarAngle = Math.PI * 0.12;

  const state = {
    ready: true,
    roomMissing,
    roomMode,
    mobile,
    canvas,
    renderer,
    scene,
    camera,
    controls,
    starfield,
    roomRoot,
    manifest,
    modelName,
    muu,
    muuReady: muu.ready,
    time: 0,
    userOrbit: false,
    error: roomMissing ? (roomMode === "procedural" ? "procedural_fallback" : "glb_not_found") : null,
    detail: loadErrors.join(" | ") || null,
  };

  controls.addEventListener("start", () => {
    state.userOrbit = true;
  });

  function resize() {
    const { w, h } = canvasSize(canvas);
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(dt = 0) {
    if (!state.ready) return;
    state.time += dt;
    if (roomMode === "glb" && manifest?.rotate && !state.userOrbit) {
      roomRoot.rotation.y += dt * (manifest.rotateSpeed ?? 0.08);
    }
    muu.update(dt);
    starfield.update(state.time);
    controls.update();
    renderer.render(scene, camera);
  }

  function playMuuSpeak() {
    muu.playSpeak();
  }

  function playMuuIdle() {
    muu.playIdle();
  }

  function dispose() {
    controls.dispose();
    muu.dispose();
    starfield.dispose();
    proceduralRoom?.dispose();
    renderer.dispose();
    roomRoot.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose?.());
      }
    });
  }

  resize();
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);

  return { ...state, resize, render, dispose, playMuuSpeak, playMuuIdle };
}
