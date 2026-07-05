import * as THREE from "three";
import { PropertyBinding } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { raycastFloorY } from "./shell-floor.js";
import {
  createMuuGltfLoader,
  fixMuuMaterials,
  countMuuTextureMaps,
} from "./muu-gltf-loader.js?v=20260706muu3";

const GLB_FALLBACK_FILES = ["speak-mou5.glb", "speak-mou4.glb", "speak-mou.glb", "speak_mou.glb", "speak-mou3.glb", "speak-mou2.glb"];
const MIN_GLB_BYTES = 500_000;
const MIN_TEXTURE_MAPS = 4;

function modelUrl(basePath, name) {
  return `${basePath}/${encodeURIComponent(name)}?v=20260706muu3`;
}

async function readManifest(basePath) {
  try {
    const res = await fetch(`${basePath}/manifest.json?v=20260706muu3`);
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
    const trimmed = obj.name?.trim?.() ?? obj.name;
    if (/speak[-_]?mou/i.test(trimmed) && obj.children?.length) {
      namedRoot = obj;
    }
    if (obj.isSkinnedMesh && obj.skeleton?.bones?.length > bestBoneCount) {
      bestSkinned = obj;
      bestBoneCount = obj.skeleton.bones.length;
    }
  });

  if (bestSkinned) {
    let root = bestSkinned;
    while (root.parent && root.parent !== scene) {
      const parentName = root.parent.name?.trim?.() ?? root.parent.name;
      if (/speak[-_]?mou/i.test(parentName)) return root.parent;
      root = root.parent;
    }
    return root;
  }

  return namedRoot || scene;
}

function isRemapClip(clip) {
  return /remap/i.test(clip?.name ?? "");
}

function usableClip(clip, minTracks = 8) {
  return Boolean(
    clip &&
      clip.duration > 0.35 &&
      !isRemapClip(clip) &&
      (clip.tracks?.length ?? 0) >= minTracks
  );
}

function dedupeClips(clips) {
  const seen = new Set();
  const out = [];
  for (const clip of clips) {
    const key = `${clip.name}|${clip.duration.toFixed(2)}|${clip.tracks?.length ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clip);
  }
  return out;
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
  if (pat === "layer0") {
    return base === "layer0" || (base.startsWith("layer0") && !base.startsWith("layer0.001"));
  }
  return base === pat || base.startsWith(`${pat}.`) || base.startsWith(`${pat}_`);
}

function clipBindingScore(clip, root) {
  if (!clip?.tracks?.length || !root) return 0;
  let matched = 0;
  for (const track of clip.tracks) {
    try {
      const parsed = PropertyBinding.parseTrackName(track.name);
      if (PropertyBinding.findNode(root, parsed.nodeName)) matched += 1;
    } catch {
      // ignore malformed track
    }
  }
  return matched;
}

function isPlayableClip(clip, root, { minMatched = 12, minRatio = 0.04 } = {}) {
  if (!usableClip(clip)) return false;
  const matched = clipBindingScore(clip, root);
  return matched >= minMatched && matched >= clip.tracks.length * minRatio;
}

function displayClipName(clip) {
  if (!clip?.name) return "(none)";
  if (/good[-_]?mou/i.test(clip.name)) return "good-mou";
  if (/layer0\.001/i.test(clip.name)) return "speak-mou";
  if (/layer0/i.test(clip.name)) return "good-mou";
  return clipBaseName(clip.name) || clip.name;
}

function pickGoodLoopClip(allClips, manifest, speakClip, mainClips = [], mixerRoot = null) {
  const goodPatterns = manifest?.animations?.good ?? ["good_mou", "good-mou", "layer0"];
  const native = (mainClips ?? []).filter((clip) => usableClip(clip, 50));
  const canPlay = (clip) => !mixerRoot || isPlayableClip(clip, mixerRoot);

  const layer0 = native.filter((clip) => {
    if (clip === speakClip) return false;
    const base = normalizeClipToken(clipBaseName(clip.name));
    return base === "layer0" || (base.startsWith("layer0") && !base.startsWith("layer0.001"));
  });
  const nativeGood = pickBestClip(layer0.filter(canPlay), goodPatterns);
  if (nativeGood) return nativeGood;

  const nativeNamed = pickNamedLoopClip(
    native.filter((clip) => clip !== speakClip && canPlay(clip)),
    goodPatterns
  );
  if (nativeNamed) return nativeNamed;

  const external = clipsMatching(allClips, ["good_mou", "good-mou"]).filter(
    (clip) => usableClip(clip, 50) && clip !== speakClip && !native.includes(clip) && canPlay(clip)
  );
  if (external.length) return pickBestClip(external, ["good_mou", "good-mou"]);

  return pickNamedLoopClip(
    allClips.filter((clip) => clip !== speakClip && canPlay(clip)),
    goodPatterns
  );
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
  const loader = createMuuGltfLoader();
  const extra = [];
  let loadedAny = false;

  for (const name of sources) {
    try {
      const gltf = await loader.loadAsync(modelUrl(basePath, name));
      if (!gltf.animations?.length) {
        console.warn(`[shell-muu] ${name}: animations なし`);
        continue;
      }
      const retargeted = retargetClips(gltf.animations, gltf.scene, targetRoot, referenceClip);
      const valid = retargeted.filter((clip) => usableClip(clip, 50));
      if (!valid.length) {
        console.warn(`[shell-muu] ${name}: retarget produced no usable tracks`);
        continue;
      }
      extra.push(...valid);
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

function buildShellLoopPool(allClips, manifest, mainClips = [], speakClip = null, mixerRoot = null) {
  const speakPatterns = manifest?.animations?.speak ?? ["speak_mou", "speak-mou", "layer0.001"];
  const native = dedupeClips((mainClips ?? []).filter((clip) => usableClip(clip)));
  const canPlay = (clip) => !mixerRoot || isPlayableClip(clip, mixerRoot);
  const pool = [];

  const speak =
    speakClip ??
    pickNamedLoopClip(native.filter(canPlay), speakPatterns) ??
    pickNamedLoopClip(native.length ? native : allClips, speakPatterns);
  const good = pickGoodLoopClip(allClips, manifest, speak, mainClips, mixerRoot);

  if (speak && canPlay(speak)) pool.push(speak);
  if (good && good !== speak && canPlay(good)) pool.push(good);

  if (!pool.length) {
    const fallback = dedupeClips(allClips.filter((clip) => canPlay(clip)));
    pool.push(...fallback.slice(0, 4));
    if (fallback.length) {
      console.info("[shell-muu] loop pool fallback:", fallback.map((c) => displayClipName(c)).join(" | "));
    }
  }

  if (pool.length < 2) {
    console.warn(
      "[shell-muu] speak/good の2本立てになっていません:",
      pool.map((c) => displayClipName(c)).join(" | ") || "(none)"
    );
  } else {
    console.info(
      "[shell-muu] loop pool (speak + good):",
      pool.map((c) => `${displayClipName(c)} [${c.name}]`).join(" | ")
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

  const { x: worldX, z: worldZ } = resolveMuuWorldXZ(manifest, roomRoot, roomFit);
  const posY = manifest?.position?.[1] ?? 0;
  const footOffset = manifest?.footOffset ?? 0.02;
  let floorY = roomFit?.floorY ?? 0;

  group.position.set(worldX, floorY + posY, worldZ);

  if (roomRoot) {
    const snapped = raycastFloorY(roomRoot, group.position.x, group.position.z, roomManifest);
    if (snapped != null) {
      floorY = snapped;
      group.position.y = floorY + posY + footOffset;
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

/** カメラは +Z。部屋は原点中心 — 奥は min.z、手前は max.z */
function resolveMuuWorldXZ(manifest, roomRoot, roomFit) {
  const x = manifest?.position?.[0] ?? 0;
  if (roomRoot) {
    roomRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(roomRoot);
    const size = box.getSize(new THREE.Vector3());
    const depthFromBack = manifest?.depthFromBack ?? 0.28;
    const z = box.min.z + size.z * depthFromBack;
    console.info(
      "[shell-muu] placement:",
      `x=${x.toFixed(2)} z=${z.toFixed(2)}`,
      `(room z ${box.min.z.toFixed(2)}…${box.max.z.toFixed(2)}, depthFromBack=${depthFromBack})`
    );
    return { x, z };
  }
  const pos = manifest?.position ?? [0, 0, (roomFit?.dist ?? 2) * 0.28];
  return { x, z: pos[2] ?? 0 };
}

async function probeGlbUrl(url) {
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) return { ok: false, reason: `HTTP ${head.status}` };
  const bytes = Number(head.headers.get("content-length") || 0);
  if (bytes > 0 && bytes < MIN_GLB_BYTES) return { ok: false, reason: `too small (${bytes}B)` };

  const probe = await fetch(url, { headers: { Range: "bytes=0-11" } });
  if (!probe.ok && probe.status !== 206) return { ok: false, reason: "probe failed" };
  const buf = new Uint8Array(await probe.arrayBuffer());
  if (new TextDecoder().decode(buf).startsWith("version ")) {
    return { ok: false, reason: "LFS pointer" };
  }
  const isGlb = buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46;
  if (!isGlb) return { ok: false, reason: "not GLB" };
  return { ok: true, bytes };
}

async function loadGlb(basePath, manifest) {
  const loader = createMuuGltfLoader();
  const errors = [];
  let best = null;

  for (const name of modelCandidates(manifest)) {
    const url = modelUrl(basePath, name);
    try {
      const probe = await probeGlbUrl(url);
      if (!probe.ok) {
        errors.push(`${name}: ${probe.reason}`);
        continue;
      }

      const gltf = await loader.loadAsync(url);
      const texCount = countMuuTextureMaps(gltf.scene);
      const entry = { gltf, name, url, texCount };

      if (!best || texCount > best.texCount) best = entry;

      if (texCount >= MIN_TEXTURE_MAPS) {
        console.info(`[shell-muu] model: ${name} (${texCount} texture maps)`);
        return entry;
      }

      console.warn(`[shell-muu] ${name}: textures=${texCount} — 次の候補を試します`);
    } catch (err) {
      errors.push(`${name}: ${err?.message ?? err}`);
    }
  }

  if (best) {
    console.warn(
      `[shell-muu] fallback model: ${best.name} (${best.texCount} texture maps). speak-mou5.glb を assets/muu/ に置くと改善します。`
    );
    return best;
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

export async function attachShellMuu3d(scene, roomFit, basePath = "assets/muu", roomRoot = null, roomManifest = null, hooks = {}) {
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

  const { gltf, name: modelName, texCount: loadedTexCount = 0 } = loaded;
  const modelRoot = gltf.scene;
  const texCount = fixMuuMaterials(modelRoot);
  const lowTextures = Math.max(texCount, loadedTexCount) < MIN_TEXTURE_MAPS;
  const mixerRoot = findMixerRoot(modelRoot);
  const { group } = fitMuuRoot(modelRoot, manifest, roomFit, roomRoot, roomManifest);
  scene.add(group);

  const mixer = new THREE.AnimationMixer(mixerRoot);
  const speakNames = manifest?.animations?.speak ?? ["speak_mou", "speak-mou", "layer0.001"];
  const mainClips = (gltf.animations ?? []).filter((clip) => usableClip(clip));
  const speakClipFromMain =
    pickNamedLoopClip(mainClips, speakNames) ?? pickBestClip(mainClips, speakNames) ?? mainClips[0] ?? null;

  const extraClips = await loadExtraAnimationClips(basePath, manifest, modelRoot, speakClipFromMain);

  const clips = dedupeClips([...(gltf.animations ?? []), ...extraClips]);
  const speakClip =
    pickNamedLoopClip(mainClips.filter((c) => isPlayableClip(c, mixerRoot)), speakNames) ??
    speakClipFromMain ??
    clips.find((c) => isPlayableClip(c, mixerRoot)) ??
    clips[0] ??
    null;
  const shellLoopPool = buildShellLoopPool(clips, manifest, gltf.animations ?? [], speakClip, mixerRoot);

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
    hooks.onLoopChange?.(displayClipName(loopClip));
  }

  function pickRandomShellLoop({ preferDifferent = false } = {}) {
    const playable = shellLoopPool.filter((clip) => isPlayableClip(clip, mixerRoot));
    const pool = playable.length ? playable : shellLoopPool;
    if (!pool.length) return speakClip;
    if (preferDifferent && pool.length > 1 && loopClip) {
      const others = pool.filter((clip) => clip !== loopClip);
      if (others.length) {
        return others[Math.floor(Math.random() * others.length)];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startShellLoop({ fade = 0.15, preferDifferent = false } = {}) {
    const candidates = preferDifferent
      ? shellLoopPool.filter((clip) => clip !== loopClip)
      : shellLoopPool;
    const ordered = [...candidates, ...shellLoopPool, speakClip].filter(Boolean);
    let next = null;
    for (const clip of ordered) {
      if (preferDifferent && clip === loopClip) continue;
      if (isPlayableClip(clip, mixerRoot)) {
        next = clip;
        break;
      }
    }
    next = next ?? pickRandomShellLoop({ preferDifferent });
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
    console.info("[shell-muu] shell loop →", displayClipName(next), `(${next.name})`);
    notifyLoopChange();
  }

  const goodIdle =
    shellLoopPool.find((clip) => /good|layer0/i.test(displayClipName(clip)) && clip !== speakClip) ??
    shellLoopPool.find((clip) => clip !== speakClip) ??
    shellLoopPool[0];
  if (goodIdle && isPlayableClip(goodIdle, mixerRoot)) {
    loopClip = goodIdle;
    loopAction = mixer.clipAction(goodIdle);
    loopAction.reset();
    loopAction.setLoop(THREE.LoopRepeat);
    loopAction.play();
    notifyLoopChange();
  } else {
    startShellLoop({ fade: 0 });
  }

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
    lowTextures,
    texCount: Math.max(texCount, loadedTexCount),
    clipNames: clips.map((c) => c.name),
    hasAnimations: clips.length > 0,
    loopClip: loopClip ? displayClipName(loopClip) : null,
    get loopClipName() {
      return loopClip ? displayClipName(loopClip) : null;
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
