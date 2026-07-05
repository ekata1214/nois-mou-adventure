const STORAGE_KEY = "nois-mou-soul-v1";

export const HP_MAX = 100;
export const HUMAN_MAX = 100;
export const HUMAN_MAX_TIME = 300; // 5分で時間成分がマックス

const NEG = ["疲", "むか", "怒", "嫌", "苦", "悲", "死", "つら", "しんど", "不安", "虚無", "やば"];
const POS = ["嬉", "楽", "好き", "幸", "ありがと", "笑", "最高", "うれ", "楽し", "愛"];
const PHIL = ["思う", "哲学", "意味", "なぜ", "人生", "存在", "本質", "考察"];

const REPLIES = {
  negative: [
    "……重いね。その言葉、ちゃんと預かる。",
    "怒りも、疲れも、全部餌になる。",
    "無理に消化しなくていいよ。",
  ],
  positive: [
    "ふわっとした気持ち、伝わってる。",
    "嬉しいこと、脳に染みる。",
    "もっと聞かせて。",
  ],
  philosophical: [
    "難しい言葉……でも好き。",
    "人間は、こういうことを考えるんだ。",
    "意味がなくても、意味を探す。",
  ],
  neutral: [
    "……うん。読んだ。",
    "今日のあなた、こんな感じなんだ。",
    "殻の中に、少し残しておく。",
  ],
};

const HEAL_BY_KIND = {
  positive: 24,
  philosophical: 20,
  neutral: 14,
  negative: 10,
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function classify(text) {
  if (NEG.some((w) => text.includes(w))) return "negative";
  if (POS.some((w) => text.includes(w))) return "positive";
  if (PHIL.some((w) => text.includes(w))) return "philosophical";
  return "neutral";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function defaultState() {
  return {
    feeds: [],
    lastFeedAt: Date.now(),
    darkEntity: 0,
    feedCounts: { negative: 0, positive: 0, philosophical: 0, neutral: 0 },
    choices: { kill: 0, eat: 0, ignore: 0, friend: 0 },
    totalFeeds: 0,
    totalEncounters: 0,
    brainWarmth: 0,
    speedBoostUntil: 0,
    lastReply: "……まだ、何も食べてない。",
    lastChoiceLine: "",
    hp: HP_MAX,
    humanSpark: 0,
    playTimeSeconds: 0,
    inventory: {},
    crafted: [],
    totalGathered: 0,
  };
}

export function loadSoul() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const merged = { ...defaultState(), ...JSON.parse(raw) };
    merged.hp = clamp(merged.hp ?? HP_MAX, 0, HP_MAX);
    merged.humanSpark = clamp(merged.humanSpark ?? 0, 0, 40);
    merged.playTimeSeconds = Math.max(0, merged.playTimeSeconds ?? 0);
    merged.inventory = merged.inventory && typeof merged.inventory === "object" ? merged.inventory : {};
    merged.crafted = Array.isArray(merged.crafted) ? merged.crafted : [];
    merged.totalGathered = Math.max(0, merged.totalGathered ?? 0);
    return merged;
  } catch {
    return defaultState();
  }
}

export function saveSoul(soul) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(soul));
}

export function getHumanGauge(soul) {
  const timePart = (soul.playTimeSeconds / HUMAN_MAX_TIME) * HUMAN_MAX;
  const spark = soul.humanSpark ?? 0;
  return clamp(timePart + spark, 0, HUMAN_MAX);
}

export function isHumanMax(soul) {
  return getHumanGauge(soul) >= HUMAN_MAX - 0.5;
}

export function feedSoul(soul, text) {
  const trimmed = text.trim();
  if (!trimmed) return { soul, reply: null, healed: 0 };

  const kind = classify(trimmed);
  soul.feeds.unshift({ text: trimmed.slice(0, 200), kind, at: Date.now() });
  soul.feeds = soul.feeds.slice(0, 20);
  soul.lastFeedAt = Date.now();
  soul.totalFeeds += 1;
  soul.feedCounts[kind] += 1;
  soul.darkEntity = Math.max(0, soul.darkEntity - 18);

  const heal = HEAL_BY_KIND[kind] ?? 12;
  soul.hp = clamp((soul.hp ?? HP_MAX) + heal, 0, HP_MAX);

  if (kind === "philosophical" || kind === "positive") {
    soul.humanSpark = clamp((soul.humanSpark ?? 0) + 1.5, 0, 40);
  }

  soul.lastReply = pick(REPLIES[kind]);
  saveSoul(soul);
  return { soul, reply: soul.lastReply, kind, healed: heal };
}

function isMeaningfulAnswer(text) {
  const compact = text.replace(/\s/g, "");
  if (compact.length < 100) return false;
  if (new Set(compact).size < 10) return false;
  if (/^(.)\1{19,}/.test(compact)) return false;
  return true;
}

const SHELL_OK_REPLIES = [
  "……うん。ちゃんと読んだ。",
  "長い答え、預かった。",
  "その言葉、脳に残す。",
  "……ありがと。少し、戻った。",
  "人間っぽい答えだね。",
];

const SHELL_SHORT_REPLIES = [
  "……もう少し。100文字、越えて。",
  "短い。もっと聞かせて。",
  "まだ、足りない。",
];

const SHELL_INVALID_REPLIES = [
  "……それ、答えになってない。",
  "ごまかせないよ。",
  "もう一度、ちゃんと。",
];

export function answerShellQuestion(soul, text, question, minLen = 100) {
  const trimmed = text.trim();
  if (!trimmed) return { soul, ok: false, reply: null, healed: 0 };

  if (trimmed.length < minLen || !isMeaningfulAnswer(trimmed)) {
    const reply =
      trimmed.length < minLen
        ? pick(SHELL_SHORT_REPLIES)
        : pick(SHELL_INVALID_REPLIES);
    soul.lastReply = reply;
    return { soul, ok: false, reply, healed: 0, remaining: Math.max(0, minLen - trimmed.length) };
  }

  const kind = classify(trimmed);
  soul.feeds.unshift({
    text: trimmed.slice(0, 400),
    kind,
    question: question?.slice(0, 120),
    at: Date.now(),
  });
  soul.feeds = soul.feeds.slice(0, 20);
  soul.lastFeedAt = Date.now();
  soul.totalFeeds += 1;
  soul.feedCounts[kind] = (soul.feedCounts[kind] ?? 0) + 1;
  soul.darkEntity = Math.max(0, soul.darkEntity - 14);

  const heal = 30;
  soul.hp = clamp((soul.hp ?? HP_MAX) + heal, 0, HP_MAX);

  if (kind === "philosophical" || kind === "positive") {
    soul.humanSpark = clamp((soul.humanSpark ?? 0) + 2, 0, 40);
  }

  soul.lastReply = pick(SHELL_OK_REPLIES);
  saveSoul(soul);
  return { soul, ok: true, reply: soul.lastReply, kind, healed: heal };
}

export function tickSoul(soul, dt, opts = {}) {
  const { playing = false, inNou = false } = opts;

  if (playing) {
    soul.playTimeSeconds = (soul.playTimeSeconds ?? 0) + dt;

    if (Math.random() < dt * 0.14) {
      soul.humanSpark = clamp((soul.humanSpark ?? 0) + 1 + Math.random() * 2.5, 0, 40);
    }
  }

  const elapsed = (Date.now() - soul.lastFeedAt) / 1000;
  if (elapsed > 45) {
    soul.darkEntity = Math.min(100, soul.darkEntity + dt * 2.2);
  }

  if (playing && inNou && soul.hp > 0) {
    const neglect = soul.darkEntity / 100;
    const inVoid = opts.inVoid ?? false;
    const drain = inVoid
      ? dt * (1.2 + neglect * 0.8)
      : dt * (0.025 + neglect * 0.07);
    soul.hp = clamp(soul.hp - drain, 0, HP_MAX);
  }

  return soul;
}

export function damageHp(soul, amount) {
  if (amount <= 0) return soul;
  soul.hp = clamp((soul.hp ?? HP_MAX) - amount, 0, HP_MAX);
  saveSoul(soul);
  return soul;
}

export function healHp(soul, amount) {
  if (amount <= 0) return soul;
  soul.hp = clamp((soul.hp ?? HP_MAX) + amount, 0, HP_MAX);
  saveSoul(soul);
  return soul;
}

export function isDead(soul) {
  return (soul.hp ?? HP_MAX) <= 0;
}

export function resumeAfterGameOver(soul) {
  saveSoul(soul);
  return soul;
}

export function resetProgress(soul) {
  const fresh = defaultState();
  Object.assign(soul, fresh);
  saveSoul(soul);
  return soul;
}

export function addGatherItem(soul, itemId, qty = 1) {
  soul.inventory = soul.inventory ?? {};
  soul.inventory[itemId] = (soul.inventory[itemId] ?? 0) + qty;
  soul.totalGathered = (soul.totalGathered ?? 0) + qty;
  soul.humanSpark = clamp((soul.humanSpark ?? 0) + 0.35 * qty, 0, 40);
  soul.darkEntity = Math.max(0, soul.darkEntity - 3 * qty);
  saveSoul(soul);
  return soul;
}

export function getMoveSpeed(base, soul) {
  const neglect = soul.darkEntity / 100;
  const introBonus = Math.min(soul.totalFeeds * 0.02, 0.12);
  const boost = getSpeedMultiplier(soul);
  const lowHp = (soul.hp ?? HP_MAX) < 30 ? 0.94 : 1;
  const mult = Math.max(0.88, 0.96 + introBonus - neglect * 0.18);
  return base * boost * lowHp * mult;
}

export function isMalfunctioning(soul) {
  return soul.darkEntity > 55;
}

export function getMoodLabel(soul, opts = {}) {
  if (isDead(soul)) return "息が途切れる";
  if (opts?.inVoid) return "VOID——生きられない";
  if ((soul.hp ?? HP_MAX) < 25) return "体が持たない";
  if (getHumanGauge(soul) > 80) return "人間に近い";
  if (soul.darkEntity > 75) return "思念体が近い";
  if (soul.darkEntity > 40) return "殻が冷たい";
  const c = soul.choices ?? {};
  const topChoice = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  if (topChoice && topChoice[1] > 2) {
    const map = { kill: "鋭い気配", eat: "飢え", ignore: "無関心", friend: "共感" };
    if (map[topChoice[0]]) return map[topChoice[0]];
  }
  const top = Object.entries(soul.feedCounts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return "静寂";
  const map = {
    negative: "重い思考",
    positive: "軽い気配",
    philosophical: "問いが残る",
    neutral: "ぼんやり",
  };
  return map[top[0]] ?? "静寂";
}

export function applyEncounterChoice(soul, choiceKey, result) {
  soul.choices = soul.choices ?? { kill: 0, eat: 0, ignore: 0, friend: 0 };
  soul.choices[choiceKey] = (soul.choices[choiceKey] ?? 0) + 1;
  soul.totalEncounters = (soul.totalEncounters ?? 0) + 1;
  soul.darkEntity = Math.max(0, Math.min(100, soul.darkEntity + result.darkDelta));
  soul.brainWarmth = Math.max(-1, Math.min(1, (soul.brainWarmth ?? 0) + result.brainWarmth));

  if (result.hpDelta) {
    soul.hp = clamp(soul.hp - result.hpDelta, 0, HP_MAX);
  }

  if (result.humanSpark) {
    soul.humanSpark = clamp((soul.humanSpark ?? 0) + result.humanSpark, 0, 40);
  }

  if (result.speedBoost > 1) {
    soul.speedBoostUntil = Date.now() + 8000;
  }
  soul.lastChoiceLine = result.message;
  saveSoul(soul);
  return soul;
}

export function getSpeedMultiplier(soul) {
  if (soul.speedBoostUntil && Date.now() < soul.speedBoostUntil) return 1.2;
  return 1;
}
