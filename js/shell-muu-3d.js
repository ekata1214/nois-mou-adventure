import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const GLB_FALLBACK_FILES = ["speak_mou.glb", "speak_mou.GLB"];

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

function pickClip(clips, names) {
  if (!clips?.length || !names?.length) return null;
  const lowered = names.map((n) => n.toLowerCase());
  for (const clip of clips) {
    const name = clip.name.toLowerCase();
    if (lowered.includes(name)) return clip;
  }
  for (const clip of clips) {
    const name = clip.name.toLowerCase();
    if (lowered.some((n) => name.includes(n) || n.includes(name))) return clip;
  }
  return null;
}

function fitMuuRoot(root, manifest, roomFit) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const targetHeight = manifest?.targetHeight ?? 1.35;
  const autoScale = targetHeight / maxDim;
  const scale = manifest?.scale ?? autoScale;
  root.scale.multiplyScalar(scale);

  const group = new THREE.Group();
  group.add(root);

  if (manifest?.position) {
    const [x, y, z] = manifest.position;
    group.position.set(x, y, z);
  } else {
    group.position.set(0, (roomFit?.size?.y ?? 1) * -0.12, (roomFit?.dist ?? 2) * 0.28);
  }

  if (manifest?.rotation) {
    const [x, y, z] = manifest.rotation;
    group.rotation.set(x, y, z);
  }

  return { group, size };
}

async function loadGlb(basePath, manifest) {
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

function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose?.());
    }
  });
}

export async function attachShellMuu3d(scene, roomFit, basePath = "assets/muu") {
  const manifest = await readManifest(basePath);
  const loaded = await loadGlb(basePath, manifest);
  if (!loaded.gltf) {
    return {
      ready: false,
      error: "muu_glb_not_found",
      detail: loaded.errors?.join(" | ") ?? "no candidates",
      update() {},
      playSpeak() {},
      playIdle() {},
      dispose() {},
    };
  }

  const { gltf, name: modelName } = loaded;
  const modelRoot = gltf.scene;
  const { group } = fitMuuRoot(modelRoot, manifest, roomFit);
  scene.add(group);

  const mixer = new THREE.AnimationMixer(modelRoot);
  const clips = gltf.animations ?? [];
  const idleNames = manifest?.animations?.idle ?? ["idle", "Idle", "rest"];
  const speakNames = manifest?.animations?.speak ?? [
    "speak_mou",
    "speak",
    "Speak",
    "speak mou",
    "Speak_mou",
  ];

  const idleClip = pickClip(clips, idleNames);
  const speakClip = pickClip(clips, speakNames) ?? clips[0] ?? null;

  let idleAction = null;
  let speakAction = null;

  if (idleClip) {
    idleAction = mixer.clipAction(idleClip);
    idleAction.play();
  } else if (speakClip) {
    idleAction = mixer.clipAction(speakClip);
    idleAction.play();
    idleAction.paused = true;
    idleAction.time = 0;
  }

  function playIdle() {
    if (!idleAction) return;
    if (speakAction) {
      speakAction.fadeOut(0.15);
      speakAction = null;
    }
    idleAction.reset().fadeIn(0.15).play();
    idleAction.paused = false;
  }

  function playSpeak() {
    if (!speakClip) {
      playIdle();
      return;
    }

    if (speakAction) {
      speakAction.stop();
      speakAction = null;
    }

    speakAction = mixer.clipAction(speakClip);
    speakAction.reset();
    speakAction.setLoop(THREE.LoopOnce, 1);
    speakAction.clampWhenFinished = true;

    if (idleAction && idleClip && idleClip !== speakClip) {
      idleAction.fadeOut(0.12);
    }

    speakAction.fadeIn(0.12).play();

    const onFinished = (event) => {
      if (event.action !== speakAction) return;
      mixer.removeEventListener("finished", onFinished);
      speakAction = null;
      playIdle();
    };
    mixer.addEventListener("finished", onFinished);
  }

  return {
    ready: true,
    modelName,
    clipNames: clips.map((c) => c.name),
    idleClip: idleClip?.name ?? speakClip?.name ?? null,
    speakClip: speakClip?.name ?? null,
    root: group,
    mixer,
    update(dt = 0) {
      mixer.update(dt);
    },
    playSpeak,
    playIdle,
    dispose() {
      mixer.stopAllAction();
      scene.remove(group);
      disposeObject3D(group);
    },
  };
}
