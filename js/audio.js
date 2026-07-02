const BASE = "assets/vo";

const CLIPS = {
  greet_morning: `${BASE}/greet_morning.mp3`,
  greet_evening: `${BASE}/greet_evening.mp3`,
  greet_hello: `${BASE}/greet_hello.mp3`,
  bye: `${BASE}/bye.mp3`,
  sigh: `${BASE}/sigh.mp3`,
  yes: `${BASE}/yes.mp3`,
  fade: `${BASE}/fade.mp3`,
  attack: `${BASE}/attack.mp3`,
  frustrated: `${BASE}/frustrated.mp3`,
  fear: `${BASE}/fear.mp3`,
  hmm: `${BASE}/hmm.mp3`,
  genki: `${BASE}/genki.mp3`,
};

const POOLS = {
  feed_neutral: ["hmm", "genki"],
  feed_positive: ["yes", "greet_morning", "greet_hello"],
  feed_negative: ["sigh", "frustrated"],
  feed_philosophical: ["hmm", "greet_hello", "genki"],
  shell_enter: ["genki", "greet_hello", "greet_morning", "greet_evening"],
  shell_idle: ["hmm", "genki"],
  nou_enter: ["bye"],
  gameover: ["fade", "sigh"],
  encounter_open: ["fear", "hmm"],
  choice_kill: ["attack"],
  choice_eat: ["yes"],
  choice_ignore: ["sigh", "frustrated"],
  choice_friend: ["yes", "greet_morning"],
  low_hp: ["sigh", "fade"],
};

const cache = new Map();
let unlocked = false;
let lastKey = "";
let lastAt = 0;

function pick(poolKey) {
  const pool = POOLS[poolKey];
  if (!pool?.length) return null;
  const options = pool.length > 1 ? pool.filter((k) => k !== lastKey) : pool;
  return options[Math.floor(Math.random() * options.length)] ?? pool[0];
}

function getAudio(key) {
  if (!CLIPS[key]) return null;
  if (!cache.has(key)) {
    const audio = new Audio(CLIPS[key]);
    audio.preload = "auto";
    cache.set(key, audio);
  }
  return cache.get(key);
}

export function unlockAudio() {
  unlocked = true;
}

export function preloadVoices() {
  Object.keys(CLIPS).forEach((key) => getAudio(key));
}

export function playVoice(poolKey, { volume = 0.85, force = false } = {}) {
  if (!unlocked) return;

  const now = Date.now();
  if (!force && poolKey === lastKey && now - lastAt < 900) return;

  const key = pick(poolKey);
  if (!key) return;

  const src = getAudio(key);
  if (!src) return;

  try {
    const voice = src.cloneNode();
    voice.volume = volume;
    voice.play().catch(() => {});
    lastKey = key;
    lastAt = now;
  } catch {
    /* ignore */
  }
}

export function playClip(key, volume = 0.85) {
  if (!unlocked || !CLIPS[key]) return;
  const src = getAudio(key);
  if (!src) return;
  const voice = src.cloneNode();
  voice.volume = volume;
  voice.play().catch(() => {});
}

export function voiceForFeedKind(kind) {
  return `feed_${kind}`;
}

export function voiceForChoice(choiceKey) {
  return `choice_${choiceKey}`;
}

export function voiceForTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "greet_morning";
  if (h >= 17 || h < 5) return "greet_evening";
  return "greet_hello";
}
