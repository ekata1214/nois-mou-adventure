import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { raycastFloorY } from "./shell-floor.js";
import {
  assetUrl,
  estimateMobileMuuBudget,
  loadFirstGlb,
  loadGltfAsync,
} from "./shell-asset-loader.js?v=20260705shell";

const GLB_FALLBACK_FILES = ["speak_mou.glb", "speak-mou.glb", "speak-mou5.glb", "speak-mou4.glb", "speak-mou3.glb", "speak-mou2.glb"];

function modelUrl(basePath, name) {
  return assetUrl(basePath, name);
}

async function readManifest(basePath) {
  try {
    const res = await fetch(assetUrl(basePath, "manifest.json"));
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
  let bestSkinned = null;
  let bestBoneCount = 0;
  let namedRoot = null;

  scene.traverse((obj) => {
    if (/speak[-_]?mou/i.test(obj.name) && obj.children?.length) {
      namedRoot = obj;
    }
    if (obj.isSkinnedMesh && obj.skeleton?.bones?.length > bestBoneCount) {
      bestSkinned = obj;
      bestBoneCount = obj.skeleton.bones.length;
    }
  });

  if (bestSkinned) {
    let root = bestSkinned;
    while (root.parent && root.parent !== scene && root.parent !== scene.parent) {
      root = root.parent;
    }
    return root;
  }
  return namedRoot || scene;
}

function clipBaseName(name) {
  if (!name) return "";
  return String(name).split("|").pop().trim();
}

function normalizeClipToken(value) {
  return value.toLowerCase().replace(/_/g, "-");
}

function clipMatchesPattern(clipName, pattern) {
  const base = normalizeClipToken(clipBaseName(clipName));
  const pat = normalizeClipToken(pattern);
  return base === pat || base.startsWith(`${pat}.`) || base.startsWith(`${pat}_`);
}

function findSkinnedMesh(root) {
  let mesh = null;
  root.traverse((obj) => {
    if (obj.isSkinnedMesh && !mesh) mesh = obj;
  });
  return mesh;
}

function pickClip(clips, names) {
  if (!clips?.length || !names?.length) return null;
  for (const clip of clips) {
    if (names.some((name) => clipMatchesPattern(clip.name, name))) return clip;
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
  return allClips.filter((clip) => patterns.some((pat) => clipMatchesPattern(clip.name, pat)));
}

function pickNamedLoopClip(allClips, patterns) {
  const matches = clipsMatching(allClips, patterns);
  return pickBestClip(matches, patterns);
}

function trackBoneName(trackName) {
  const dot = trackName.lastIndexOf(".");
  if (dot === -1) return null;
  const nodePath = trackName.slice(0, dot);
  const nodesMatch = nodePath.match(/^nodes\[(\d+)\]$/);
  if (nodesMatch) return null;
  const parts = nodePath.split(/[./]/).filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function trackProperty(trackName) {
  const dot = trackName.lastIndexOf(".");
  return dot === -1 ? null : trackName.slice(dot + 1);
}

function buildBonePathLookup(referenceClip) {
  const map = new Map();
  if (!referenceClip?.tracks?.length) return map;
  for (const track of referenceClip.tracks) {
    const boneName = trackBoneName(track.name);
    const property = trackProperty(track.name);
    if (!boneName || !property || map.has(boneName)) continue;
    map.set(boneName, track.name.slice(0, track.name.lastIndexOf(".")));
  }
  return map;
}

function buildBonePathMap(mixerRoot) {
  const map = new Map();

  function pathFromTo(root, target) {
    if (target === root) return "";
    const parts = [];
    let cur = target;
    while (cur && cur !== root) {
      parts.unshift(cur.name);
      cur = cur.parent;
    }
    return cur === root ? parts.join(".") : null;
  }

  mixerRoot.traverse((obj) => {
    const path = pathFromTo(mixerRoot, obj);
    if (path != null) map.set(obj.name, path);
  });

  const skinned = findSkinnedMesh(mixerRoot);
  if (skinned?.skeleton?.bones) {
    for (const bone of skinned.skeleton.bones) {
      const path = pathFromTo(mixerRoot, bone);
      if (path != null) map.set(bone.name, path);
    }
  }

  return map;
}

function buildGltfNodeIndex(scene) {
  const nodes = [];
  scene.traverse((obj) => nodes.push(obj));
  return nodes;
}

function resolveTrackBoneName(trackName, sourceNodes) {
  const nodesMatch = trackName.match(/^nodes\[(\d+)\]\./);
  if (nodesMatch) {
    const node = sourceNodes[Number(nodesMatch[1])];
    return node?.name ?? null;
  }
  return trackBoneName(trackName);
}

function cloneTrack(track, newName) {
  const TrackCtor = track.constructor;
  return new TrackCtor(newName, track.times.slice(), track.values.slice());
}

function remapClipTracks(clip, { referenceClip = null, mixerRoot = null, sourceNodes = null } = {}) {
  const pathByBone = referenceClip ? buildBonePathLookup(referenceClip) : new Map();
  const fallbackPaths = mixerRoot ? buildBonePathMap(mixerRoot) : new Map();
  const newTracks = [];
  let matched = 0;

  for (const track of clip.tracks) {
    const property = trackProperty(track.name);
    if (!property) continue;

    const boneName = sourceNodes
      ? resolveTrackBoneName(track.name, sourceNodes)
      : trackBoneName(track.name);
    if (!boneName) continue;

    const targetPath = pathByBone.get(boneName) ?? fallbackPaths.get(boneName);
    if (targetPath == null) continue;

    matched += 1;
    newTracks.push(cloneTrack(track, `${targetPath}.${property}`));
  }

  return { clip: new THREE.AnimationClip(clip.name, clip.duration, newTracks), matched, total: clip.tracks.length };
}

function retargetClips(clips, sourceScene, targetRoot, referenceClip = null) {
  const targetMesh = findSkinnedMesh(targetRoot);
  const sourceMesh = findSkinnedMesh(sourceScene);
  const sourceNodes = buildGltfNodeIndex(sourceScene);

  return clips.map((clip) => {
    const remapped = remapClipTracks(clip, {
      referenceClip,
      mixerRoot: findMixerRoot(targetRoot),
      sourceNodes,
    });

    console.info(
      `[shell-muu] remap ${clip.name}: ${remapped.matched}/${remapped.total} tracks` +
        (referenceClip ? ` (ref: ${referenceClip.name})` : "")
    );

    if (remapped.matched > 0) {
      return remapped.clip;
    }

    if (targetMesh && sourceMesh) {
      try {
        const retargeted = SkeletonUtils.retargetClip(targetMesh, sourceMesh, clip);
        retargeted.name = clip.name;
        console.info(`[shell-muu] skeleton retarget ${clip.name}: ${retargeted.tracks.length} tracks`);
        if (retargeted.tracks.length > 0) return retargeted;
      } catch (err) {
        console.warn("[shell-muu] skeleton retarget failed:", clip.name, err?.message ?? err);
      }
    }

    console.warn(`[shell-muu] could not remap ${clip.name}; motion may not play`);
    return clip;
  });
}

async function loadExtraAnimationClips(basePath, manifest, targetRoot, referenceClip = null) {
  const sources = manifest?.animationClips ?? ["good-mou.glb", "good_mou.glb"];
  const loader = new GLTFLoader();
  const extra = [];
  let loadedAny = false;

  for (const name of sources) {
    try {
      const gltf = await loadGltfAsync(loader, modelUrl(basePath, name), { timeoutMs: 60000 });
      if (!gltf.animations?.length) {
        console.warn(`[shell-muu] ${name}: animations なし`);
        continue;
      }
      const retargeted = retargetClips(gltf.animations, gltf.scene, targetRoot, referenceClip);
      extra.push(...retargeted);
      loadedAny = true;
      console.info(
        `[shell-muu] extra clips from ${name}:`,
        retargeted.map((c) => c.name).join(", "),
        `(tracks: ${retargeted.map((c) => c.tracks.length).join(", ")})`
      );
      break;
    } catch (err) {
      console.warn(`[shell-muu] failed to load ${name}:`, err?.message ?? err);
    }
  }

  if (!loadedAny) {
    console.warn(
      "[shell-muu] good-mou.glb が読めません。assets/muu/good-mou.glb を置くか、speak-mou5.glb に NLA トラック good-mou を同梱してください。"
    );
  }

  return extra;
}

function isRemapClip(clip) {
  return /(?:^|[|/])[^|/]*_?remap/i.test(clip?.name ?? "");
}

function usableLoopClips(clips) {
  return (clips ?? []).filter(
    (clip) => clip.duration > 0.35 && clip.tracks?.length > 0 && !isRemapClip(clip)
  );
}

function dedupeClips(clips) {
  const seen = new Set();
  const out = [];
  for (const clip of clips) {
    const key = `${clip.name}|${clip.duration.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clip);
  }
  return out;
}

function buildShellLoopPool(allClips, manifest) {
  const speakPatterns = manifest?.animations?.speak ?? ["speak_mou", "speak-mou", "layer0.001"];
  const goodPatterns = manifest?.animations?.good ?? ["good_mou", "good-mou", "layer0"];
  const pool = [];
  const speak = pickNamedLoopClip(allClips, speakPatterns);
  const good = pickNamedLoopClip(allClips, goodPatterns);
  if (speak) pool.push(speak);
  if (good && good !== speak) pool.push(good);

  if (!pool.length) {
    const fallback = dedupeClips(usableLoopClips(allClips));
    pool.push(...fallback.slice(0, 4));
    if (fallback.length) {
      console.info(
        "[shell-muu] loop pool fallback:",
        fallback.map((c) => c.name).join(" | ")
      );
    }
  }

  if (!good && !pool.some((c) => goodPatterns.some((p) => clipMatchesPattern(c.name, p)))) {
    console.warn(
      "[shell-muu] good-mou clip not found — speak_mou 内の Layer0 を使用:",
      allClips.map((c) => c.name).join(", ") || "(none)"
    );
  }
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

async function loadGlb(basePath, manifest, { mobile = false } = {}) {
  const maxBytes = mobile
    ? (manifest?.mobileMaxMuuBytes ?? estimateMobileMuuBudget(manifest) * 1024 * 1024)
    : Infinity;
  const timeoutMs = mobile ? (manifest?.mobileMuuTimeoutMs ?? 90000) : (manifest?.muuTimeoutMs ?? 180000);
  return loadFirstGlb(basePath, modelCandidates(manifest), { timeoutMs, maxBytes });
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

export async function attachShellMuu3d(scene, roomFit, basePath = "assets/muu", roomRoot = null, roomManifest = null, hooks = {}) {
  const manifest = await readManifest(basePath);
  const loaded = await loadGlb(basePath, manifest, { mobile: hooks.mobile });
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
  const speakNames = manifest?.animations?.speak ?? ["speak_mou", "speak-mou", "speak mou", "speak", "Speak"];
  const mainClips = gltf.animations ?? [];
  const speakClipFromMain =
    pickNamedLoopClip(mainClips, speakNames) ?? pickBestClip(mainClips, speakNames) ?? mainClips[0] ?? null;
  const extraClips = hooks.mobile
    ? []
    : await loadExtraAnimationClips(basePath, manifest, modelRoot, speakClipFromMain);
  const clips = [...mainClips, ...extraClips];
  const speakClip = pickNamedLoopClip(clips, speakNames) ?? speakClipFromMain ?? clips[0] ?? null;
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

  function notifyLoopChange() {
    hooks.onLoopChange?.(loopClip?.name ?? null);
  }

  function pickRandomShellLoop({ preferDifferent = false } = {}) {
    if (!shellLoopPool.length) return speakClip;
    if (preferDifferent && shellLoopPool.length > 1 && loopClip) {
      const others = shellLoopPool.filter((clip) => clip !== loopClip);
      if (others.length) {
        return others[Math.floor(Math.random() * others.length)];
      }
    }
    return shellLoopPool[Math.floor(Math.random() * shellLoopPool.length)];
  }

  function startShellLoop({ fade = 0.15, preferDifferent = false } = {}) {
    const next = pickRandomShellLoop({ preferDifferent });
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
    notifyLoopChange();
  }

  startShellLoop({ fade: 0 });

  mixer.addEventListener("loop", (event) => {
    if (event.action !== loopAction || shellLoopPool.length < 2) return;
    startShellLoop({ fade: 0.25, preferDifferent: true });
  });

  function playIdle() {
    startShellLoop({ preferDifferent: true });
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
