import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const GLB_FALLBACK_FILES = ["this.glb", "this.GLB"];

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

  if (manifest?.camera?.position) {
    const [x, y, z] = manifest.camera.position;
    camera.position.set(x, y, z);
  } else {
    camera.position.set(0, size.y * 0.2, dist);
  }

  if (manifest?.camera?.lookAt) {
    const [x, y, z] = manifest.camera.lookAt;
    camera.lookAt(x, y, z);
  } else {
    camera.lookAt(0, size.y * 0.05, 0);
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

export async function createShellRoomView(canvas, basePath = "assets/room") {
  if (!canvas) return { ready: false, error: "canvas missing" };

  const manifest = await readManifest(basePath);
  const loaded = await loadGlbModel(basePath, manifest);
  if (!loaded.gltf) {
    return {
      ready: false,
      error: "glb_not_found",
      detail: loaded.errors?.join(" | ") ?? "no candidates",
      resize() {},
      render() {},
      dispose() {},
    };
  }

  const { gltf, name: modelName } = loaded;
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
  scene.background = new THREE.Color(manifest?.backgroundColor ?? 0x050508);

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
  roomRoot.add(gltf.scene);
  fitModel(roomRoot, camera, manifest);

  const state = {
    ready: true,
    canvas,
    renderer,
    scene,
    camera,
    roomRoot,
    manifest,
    modelName,
    time: 0,
    error: null,
  };

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
    if (manifest?.rotate) {
      roomRoot.rotation.y += dt * (manifest.rotateSpeed ?? 0.08);
    }
    renderer.render(scene, camera);
  }

  function dispose() {
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

  return { ...state, resize, render, dispose };
}
