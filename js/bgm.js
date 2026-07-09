const TRACKS = {
  drone: "assets/bgm/drone.mp3",
  drone2: "assets/bgm/drone2.mp3",
  drone_long1: "assets/bgm/drone_long1.mp3",
  drone_long2: "assets/bgm/drone_long2.mp3",
  dark_1: "assets/bgm/dark_1.mp3",
  dark_2: "assets/bgm/dark_2.mp3",
  dark_long1: "assets/bgm/dark_long1.mp3",
  dark_long2: "assets/bgm/dark_long2.mp3",
  happy_1: "assets/bgm/happy_1.mp3",
  happy_2: "assets/bgm/happy_2.mp3",
  happy_long1: "assets/bgm/happy_long1.mp3",
  happy_long2: "assets/bgm/happy_long2.mp3",
  heal_long1: "assets/bgm/heal_long1.mp3",
  heal_long2: "assets/bgm/heal_long2.mp3",
};

/** 季節エリアごとに出やすい曲（喜怒哀楽 → 夏/秋/梅雨/夕方） */
const REGION_POOLS = {
  hub: Object.keys(TRACKS),
  ki: ["happy_1", "happy_2", "happy_long1", "happy_long2", "drone", "drone2"],
  nu: ["dark_1", "dark_2", "dark_long1", "dark_long2", "drone_long1"],
  ai: ["dark_1", "dark_2", "dark_long1", "dark_long2", "drone_long1", "drone_long2"],
  raku: ["happy_1", "happy_2", "drone", "drone2", "dark_1", "dark_2", "happy_long1"],
  /** 殻（イントロバート）— heal曲ランダム */
  shell: ["heal_long1", "heal_long2"],
};

const BGM_VOLUME = 0.38;
const FADE_MS = 1400;

const players = [new Audio(), new Audio()];
let active = 0;
let unlocked = false;
let enabled = false;
let currentRegion = "";
let currentTrack = "";
let fadeTimer = null;

players.forEach((p) => {
  p.loop = true;
  p.preload = "auto";
});

function pickTrack(regionKey) {
  const pool = REGION_POOLS[regionKey] ?? REGION_POOLS.hub;
  const keys = pool.filter((key) => TRACKS[key]);
  const options =
    keys.length > 1 ? keys.filter((key) => TRACKS[key] !== currentTrack) : keys;
  const key = options[Math.floor(Math.random() * options.length)] ?? keys[0];
  return TRACKS[key];
}

function cancelFade() {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function fadeVolume(audio, from, to, ms, onDone) {
  cancelFade();
  const steps = 24;
  const stepMs = ms / steps;
  let i = 0;
  audio.volume = from;
  fadeTimer = setInterval(() => {
    i += 1;
    const t = i / steps;
    audio.volume = from + (to - from) * t;
    if (i >= steps) {
      cancelFade();
      audio.volume = to;
      onDone?.();
    }
  }, stepMs);
}

export function unlockBgm() {
  unlocked = true;
}

export function preloadBgm() {
  Object.values(TRACKS).forEach((src) => {
    const a = new Audio();
    a.preload = "auto";
    a.src = src;
  });
}

export function setBgmEnabled(on) {
  enabled = on;
  if (!on) stopBgm();
}

export function getBgmRegionKey(region) {
  return region?.id ?? "hub";
}

export function onShellBgmStart() {
  onMapRegionChange("shell", { force: true });
}

/** 殻モードで BGM が止まっていたら再開（heal_long1 / heal_long2） */
export function ensureShellBgm() {
  if (!unlocked || !enabled) return;
  if (currentRegion !== "shell" || !currentTrack) {
    onMapRegionChange("shell", { force: true });
    return;
  }
  const cur = players[active];
  if (cur.paused || cur.volume < 0.04) {
    cur.play().catch(() => {});
    fadeVolume(cur, cur.volume, BGM_VOLUME, FADE_MS);
  }
}

export function onMapRegionChange(regionKey, { force = false } = {}) {
  if (!unlocked || !enabled) return;
  if (!force && regionKey === currentRegion) return;

  currentRegion = regionKey;
  const nextTrack = pickTrack(regionKey);
  currentTrack = nextTrack;

  const cur = players[active];
  const next = players[1 - active];
  next.src = nextTrack;
  next.currentTime = 0;
  next.volume = 0;

  next.play().catch(() => {});
  fadeVolume(next, 0, BGM_VOLUME, FADE_MS);
  if (!cur.paused && cur.volume > 0.01) {
    fadeVolume(cur, cur.volume, 0, FADE_MS, () => {
      cur.pause();
    });
  } else {
    cur.pause();
  }
  active = 1 - active;
}

export function stopBgm() {
  cancelFade();
  currentRegion = "";
  currentTrack = "";
  players.forEach((p) => {
    p.pause();
    p.volume = 0;
  });
}

export function resumeBgmForRegion(regionKey) {
  if (!unlocked) return;
  enabled = true;
  if (regionKey && regionKey !== currentRegion) {
    onMapRegionChange(regionKey, { force: true });
    return;
  }
  if (!currentTrack) {
    onMapRegionChange(regionKey || "hub", { force: true });
    return;
  }
  const cur = players[active];
  if (cur.paused) {
    cur.play().catch(() => {});
    fadeVolume(cur, cur.volume, BGM_VOLUME, FADE_MS);
  }
}
