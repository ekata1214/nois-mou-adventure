const BGM_TRACKS = [
  "assets/bgm/drone.mp3",
  "assets/bgm/drone2.mp3",
  "assets/bgm/drone_long1.mp3",
  "assets/bgm/drone_long2.mp3",
  "assets/bgm/dark_1.mp3",
  "assets/bgm/dark_2.mp3",
  "assets/bgm/dark_long1.mp3",
  "assets/bgm/dark_long2.mp3",
];

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

function pickTrack() {
  const pool = BGM_TRACKS.length > 1 ? BGM_TRACKS.filter((t) => t !== currentTrack) : BGM_TRACKS;
  return pool[Math.floor(Math.random() * pool.length)];
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
  BGM_TRACKS.forEach((src) => {
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

export function onMapRegionChange(regionKey, { force = false } = {}) {
  if (!unlocked || !enabled) return;
  if (!force && regionKey === currentRegion) return;

  currentRegion = regionKey;
  const nextTrack = pickTrack();
  currentTrack = nextTrack;

  const cur = players[active];
  const next = players[1 - active];
  next.src = nextTrack;
  next.currentTime = 0;
  next.volume = 0;

  const startNext = () => {
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
  };

  if (cur.paused || cur.volume < 0.01) {
    startNext();
  } else {
    startNext();
  }
}

export function stopBgm() {
  cancelFade();
  currentRegion = "";
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
