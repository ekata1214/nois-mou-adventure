import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { raycastFloorY } from "./shell-floor.js";

const GLB_FALLBACK_FILES = ["speak-mou5.glb", "speak-mou4.glb", "speak-mou3.glb", "speak-mou2.glb", "speak_mou.glb", "speak-mou.glb"];

function modelUrl(basePath, name) {
  return `${basePath}/${encodeURIComponent(name)}?v=20260704l`;
}

async function readManifest(basePath) {
  try {
    const res = await fetch(`${basePath}/manifest.json?v=20260704l`);
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
  return clips.reduce((best, clip) =>
    !best || clip.duration > best.duration ? clip : best
  );
}

function clipsMatching(allClips, patterns) {
  if (!allClips?.length || !patterns?.length) return [];
  const lowered = patterns.map((p) => p.toLowerCase());
  return allClips.filter((clip) => {
    const name = clip.name.toLowerCase();
    return lowered.some((pat) => {
      if (name === pat) return true;
      if (name.endsWith(`|${pat}`)) return true;
      if (name.split("|").pop() === pat) return true;
      return name.includes(pat);
    });
  });
}

function pickNamedLoopClip(allClips, patterns) {
  const matches = clipsMatching(allClips, patterns);
  return pickBestClip(matches, patterns);
}

async function loadExtraAnimationClips(basePath, manifest) {
  const sources = manifest?.animationClips ?? ["good-mou.glb", "good_mou.glb"];
  const loader = new GLTFLoader();
  const extra = [];
  for (const name of sources) {
    try {
      const gltf = await loader.loadAsync(modelUrl(basePath, name));
      if (gltf.animations?.length) {
        extra.push(...gltf.animations);
        console.info(`[shell-muu] extra clips from ${name}:`, gltf.animations.map((c) => c.name).join(", "));
      }
    } catch {
      // optional file
    }
  }
  return extra;
}

function buildShellLoopPool(allClips, manifest) {
  const speakPatterns = manifest?.animations?.speak ?? ["speak_mou", "speak-mou"];
  const goodPatterns = manifest?.animations?.good ?? ["good_mou", "good-mou"];
  const pool = [];
  const speak = pickNamedLoopClip(allClips, speakPatterns);
  const good = pickNamedLoopClip(allClips, goodPatterns);
  if (speak) pool.push(speak);
  if (good && good !== speak) pool.push(good);
  return pool;
}

function meshBounds(root, { excludeBrain = true } = {}) {
  const box = new THREE.Box3();
  let init = false;
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    if (excludeBrain && /brain/i.test(obj.name)) return;
    const b = new THREE.Box3().setFromObject(obj);
    if (!init) {
      box.copy(b);
      init = true;
    } else {
      box.union(b);
    }
  });
  return init ? box : new THREE.Box3().setFromObject(root);
}

function fitMuuRoot(root, manifest, roomFit, roomRoot = null, roomManifest = null) {
  const box = meshBounds(root);
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
  const grounded = meshBounds(root);
  root.position.y -= grounded.min.y;

  const group = new THREE.Group();
  group.add(root);

  const pos = manifest?.position ?? [0, 0, (roomFit?.dist ?? 2) * 0.28];
  const footOffset = manifest?.footOffset ?? 0.02;
  let floorY = roomFit?.floorY ?? 0;

  group.position.set(pos[0] ?? 0, floorY + (pos[1] ?? 0), pos[2] ?? 0);

  if (roomRoot) {
    const snapped = raycastFloorY(roomRoot, group.position.x, group.position.z, roomManifest);
    if (snapped != null) {
      floorY = snapped;
      group.position.y = floorY + (pos[1] ?? 0) + footOffset;
    }
  } else {
    group.position.y += footOffset;
  }

  if (manifest?.rotation) {
    const [x, y, z] = manifest.rotation;
    group.rotation.set(x, y, z);
  }

  console.info("[shell-muu] floorY:", floorY.toFixed(3), "footOffset:", footOffset, "worldY:", group.position.y.toFixed(3));

  return { group, size, floorY: group.position.y };
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

export async function attachShellMuu3d(scene, roomFit, basePath = "assets/muu", roomRoot = null, roomManifest = null) {
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
  const { group } = fitMuuRoot(modelRoot, manifest, roomFit, roomRoot, roomManifest);
  scene.add(group);

  const mixer = new THREE.AnimationMixer(mixerRoot);
  const extraClips = await loadExtraAnimationClips(basePath, manifest);
  const clips = [...(gltf.animations ?? []), ...extraClips];
  const speakNames = manifest?.animations?.speak ?? ["speak_mou", "speak-mou", "speak mou", "speak", "Speak"];
  const speakClip = pickNamedLoopClip(clips, speakNames) ?? pickBestClip(clips, speakNames) ?? clips[0] ?? null;
  const shellLoopPool = buildShellLoopPool(clips, manifest);

  if (clips.length === 0) {
    console.warn(
      "[shell-muu] GLB にアニメーションがありません（T-poseになります）。Blender export で Animation をオンにしてください。"
    );
  } else {
    console.info("[shell-muu] animation clips:", clips.map((c) => c.name).join(", "));
    console.info(
      "[shell-muu] shell loop pool:",
      shellLoopPool.map((c) => c.name).join(" | ") || "(none)",
      "/ speak:",
      speakClip?.name ?? "(none)"
    );
  }

  let loopAction = null;
  let speakAction = null;
  let loopClip = null;

  function pickRandomShellLoop() {
    if (shellLoopPool.length) {
      return shellLoopPool[Math.floor(Math.random() * shellLoopPool.length)];
    }
    return speakClip;
  }

  function startShellLoop({ fade = 0.15 } = {}) {
    const next = pickRandomShellLoop();
    if (!next) return;

    if (loopAction) loopAction.fadeOut(fade);
    if (speakAction) {
      speakAction.fadeOut(fade);
      speakAction = null;
    }

    loopClip = next;
    loopAction = mixer.clipAction(next);
    loopAction.reset();
    loopAction.setLoop(THREE.LoopRepeat);
    loopAction.clampWhenFinished = false;
    loopAction.fadeIn(fade).play();
    console.info("[shell-muu] shell loop →", next.name);
  }

  startShellLoop({ fade: 0 });

  function playIdle() {
    startShellLoop();
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

    if (loopAction) loopAction.fadeOut(0.12);

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
    loopClip: loopClip?.name ?? null,
    get loopClipName() {
      return loopClip?.name ?? null;
    },
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
