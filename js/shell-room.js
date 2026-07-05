import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { attachShellMuu3d } from "./shell-muu-3d.js?v=20260706muu4";
import { estimateRoomFloorY } from "./shell-floor.js";

const GLB_FALLBACK_FILES = ["this ver2.glb", "this ver2.GLB", "this.glb", "this.GLB"];

function modelUrl(basePath, name) {
  return `${basePath}/${encodeURIComponent(name)}`;
}

async function readManifest(basePath) {
  try {
    const res = await fetch(`${basePath}/manifest.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function modelCandidates(manifest) {
  const files = [];
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

const CRAFT_PROP_LAYOUT = {
  warm_lamp: { x: -0.55, z: 0.35, yOff: 0.02 },
  memo_wall: { x: 0.72, z: -0.2, yOff: 0.55 },
  grow_pot: { x: 0.15, z: 0.62, yOff: 0.02 },
};

function createCraftProp(recipeId) {
  const group = new THREE.Group();
  group.name = `craft:${recipeId}`;

  if (recipeId === "warm_lamp") {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.85 })
    );
    base.position.y = 0.02;
    group.add(base);

    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xffd89a,
        emissive: 0xffa040,
        emissiveIntensity: 0.85,
        roughness: 0.35,
        transparent: true,
        opacity: 0.92,
      })
    );
    shade.position.y = 0.1;
    group.add(shade);

    const glow = new THREE.PointLight(0xffc870, 0.55, 2.2);
    glow.position.y = 0.12;
    group.add(glow);
  } else if (recipeId === "memo_wall") {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x3a4a52, roughness: 0.9 })
    );
    group.add(board);

    for (let i = 0; i < 4; i += 1) {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08 + (i % 2) * 0.03, 0.06),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0xe8f4ff : 0xfff0d8,
          roughness: 0.75,
          side: THREE.DoubleSide,
        })
      );
      note.position.set(-0.1 + (i % 2) * 0.16, 0.05 - Math.floor(i / 2) * 0.1, 0.012);
      note.rotation.z = (i - 1.5) * 0.08;
      group.add(note);
    }
  } else if (recipeId === "grow_pot") {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.12, 14),
      new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.88 })
    );
    pot.position.y = 0.06;
    group.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 1 })
    );
    soil.position.y = 0.11;
    group.add(soil);

    const sprout = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x5ecf6a, roughness: 0.7 })
    );
    sprout.position.y = 0.18;
    group.add(sprout);
  }

  return group;
}

function syncCraftedProps(roomRoot, craftedIds, fit) {
  if (!roomRoot) return;
  const floorY = fit?.floorY ?? 0;
  const wanted = new Set(craftedIds ?? []);

  roomRoot.children
    .filter((child) => child.name?.startsWith("craft:"))
    .forEach((child) => {
      const id = child.name.slice(6);
      if (!wanted.has(id)) roomRoot.remove(child);
    });

  for (const id of wanted) {
    if (roomRoot.getObjectByName(`craft:${id}`)) continue;
    const layout = CRAFT_PROP_LAYOUT[id];
    if (!layout) continue;
    const prop = createCraftProp(id);
    prop.position.set(layout.x, floorY + layout.yOff, layout.z);
    roomRoot.add(prop);
  }
}

async function loadGlbModel(basePath, manifest) {
  const loader = new GLTFLoader();
  const errors = [];
  for (const name of modelCandidates(manifest)) {
    const url = modelUrl(basePath, name);
    try {
      const gltf = await loader.loadAsync(url);
      return { gltf, name, url };
    } catch (err) {
      errors.push(`${name}: ${err?.message ?? err}`);
    }
  }
  return { errors };
}

export async function createShellRoomView(canvas, basePath = "assets/room", hooks = {}) {
  if (!canvas) return { ready: false, error: "canvas missing" };

  const manifest = await readManifest(basePath);
  const loaded = await loadGlbModel(basePath, manifest);
  const roomMissing = !loaded.gltf;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
  if (roomMissing) {
    fit = defaultRoomFit(manifest);
    camera.position.set(0, fit.lookAt.y + 0.35, fit.dist);
    camera.lookAt(fit.lookAt);
  } else {
    const { gltf, name } = loaded;
    modelName = name;
    roomRoot.add(gltf.scene);
    fit = fitModel(roomRoot, camera, manifest);
  }

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
    });
  } catch (err) {
    console.warn("shell muu load failed:", err);
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
    error: roomMissing ? "glb_not_found" : null,
    detail: roomMissing ? loaded.errors?.join(" | ") ?? "no candidates" : null,
  };

  controls.addEventListener("start", () => {
    state.userOrbit = true;
  });

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || canvas.clientWidth || 696;
    const h = parent?.clientHeight || canvas.clientHeight || 424;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(dt = 0) {
    if (!state.ready) return;
    state.time += dt;
    if (!roomMissing && manifest?.rotate && !state.userOrbit) {
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

  function syncCrafted(craftedIds) {
    syncCraftedProps(roomRoot, craftedIds, fit);
  }

  function dispose() {
    controls.dispose();
    muu.dispose();
    starfield.dispose();
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
  window.addEventListener("resize", resize);

  return { ...state, resize, render, dispose, playMuuSpeak, playMuuIdle, syncCrafted };
}
