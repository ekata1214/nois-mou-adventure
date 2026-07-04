import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const GLB_FALLBACK_FILES = ["speak-mou5.glb", "speak-mou4.glb", "speak-mou3.glb", "speak-mou2.glb", "speak_mou.glb", "speak-mou.glb"];

function modelUrl(basePath, name) {
  return `${basePath}/${encodeURIComponent(name)}?v=20260704h`;
}

async function readManifest(basePath) {
  try {
    const res = await fetch(`${basePath}/manifest.json?v=20260704h`);
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

function findMixerRoot(scene) {
  let skinned = null;
  let armatureGroup = null;
  scene.traverse((obj) => {
    if (obj.isSkinnedMesh && !skinned) skinned = obj;
    if (/speak[-_]?mou|armature/i.test(obj.name) && obj.children?.length) {
      armatureGroup = obj;
    }
  });
  return armatureGroup || skinned || scene;
}

function pickClip(clips, names) {
  if (!clips?.length || !names?.length) return null;
  const lowered = names.map((n) => n.toLowerCase());
  for (const clip of clips) {
    const name = clip.name.toLowerCase();
    if (lowered.some((n) => name === n || name.includes(n) || n.includes(name))) return clip;
  }
  return null;
}

function pickBestClip(clips, preferNames) {
  const named = pickClip(clips, preferNames);
  if (named) return named;
  if (!clips?.length) return null;
  // 最長クリップ（Mixamo/NLA は often longest）
  return clips.reduce((best, clip) =>
    !best || clip.duration > best.duration ? clip : best
  );
}

function fitMuuRoot(root, manifest, roomFit) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // X/Z のみ中央寄せ（Y は後で床合わせ）
  root.position.x -= center.x;
  root.position.z -= center.z;

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const targetHeight = manifest?.targetHeight ?? 1.35;
  const autoScale = targetHeight / maxDim;
  const scale = manifest?.scale ?? autoScale;
  root.scale.multiplyScalar(scale);

  root.updateMatrixWorld(true);
  const grounded = new THREE.Box3().setFromObject(root);
  root.position.y -= grounded.min.y;

  const group = new THREE.Group();
  group.add(root);

  const roomFloorY = roomFit?.size?.y ? -roomFit.size.y * 0.5 : 0;
  const footOffset = manifest?.footOffset ?? 0;
  const pos = manifest?.position ?? [0, 0, (roomFit?.dist ?? 2) * 0.28];

  group.position.set(pos[0] ?? 0, roomFloorY + (pos[1] ?? 0) + footOffset, pos[2] ?? 0);

  if (manifest?.rotation) {
    const [x, y, z] = manifest.rotation;
    group.rotation.set(x, y, z);
  }

  return { group, size, floorY: roomFloorY + footOffset };
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

function fixGltfMaterials(root) {
  let texCount = 0;
  let plainCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.needsUpdate = true;
      const colorMaps = ["map", "emissiveMap"];
      const dataMaps = ["normalMap", "roughnessMap", "metalnessMap", "aoMap"];
      for (const key of colorMaps) {
        const tex = mat[key];
        if (tex?.isTexture) {
          tex.colorSpace = THREE.SRGBColorSpace;
          texCount += 1;
        }
      }
      for (const key of dataMaps) {
        const tex = mat[key];
        if (tex?.isTexture) {
          tex.colorSpace = THREE.LinearSRGBColorSpace;
          texCount += 1;
        }
      }
      const isBlack =
        mat.color &&
        mat.color.r < 0.05 &&
        mat.color.g < 0.05 &&
        mat.color.b < 0.05 &&
        !mat.map;
      if (isBlack) {
        console.warn(`[shell-muu] black material (no texture): mesh=${obj.name} mat=${mat.name || "(unnamed)"}`);
      }
      if (!mat.map && !mat.emissiveMap) plainCount += 1;
    }
  });
  console.info(`[shell-muu] texture maps: ${texCount}, plain materials: ${plainCount}`);
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
  fixGltfMaterials(modelRoot);
  const mixerRoot = findMixerRoot(modelRoot);
  const { group } = fitMuuRoot(modelRoot, manifest, roomFit);
  scene.add(group);

  const mixer = new THREE.AnimationMixer(mixerRoot);
  const clips = gltf.animations ?? [];
  const idleNames = manifest?.animations?.idle ?? ["idle", "Idle", "rest", "mixamo", "Layer0"];
  const speakNames = manifest?.animations?.speak ?? [
    "speak_mou",
    "speak-mou",
    "speak mou",
    "speak",
    "Speak",
    "mixamo",
    "Layer0",
    "remap",
    "NLA",
  ];

  const idleClip = pickClip(clips, idleNames);
  const speakClip = pickBestClip(clips, speakNames) ?? clips[0] ?? null;

  if (clips.length === 0) {
    console.warn(
      "[shell-muu] GLB にアニメーションがありません（T-poseになります）。Blender export で Animation をオンにしてください。"
    );
  } else {
    console.info("[shell-muu] animation clips:", clips.map((c) => c.name).join(", "));
    console.info("[shell-muu] using speak clip:", speakClip?.name ?? "(none)", "mixer root:", mixerRoot.name || mixerRoot.type);
  }

  let idleAction = null;
  let speakAction = null;

  if (idleClip) {
    idleAction = mixer.clipAction(idleClip);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.play();
  } else if (speakClip) {
    idleAction = mixer.clipAction(speakClip);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.play();
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
    hasAnimations: clips.length > 0,
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
