import { pickMotifForRegion, drawEntityIcon } from "./entity-icons.js";

export const CHOICE = {
  KILL: "kill",
  EAT: "eat",
  IGNORE: "ignore",
  FRIEND: "friend",
};

export const ENTITY_DEFS = {
  anger: {
    name: "怒りの残火",
    kind: "negative",
    color: "#e50914",
    core: "#ff6b4a",
    lines: ["……燃えてる。", "誰かを焼きたい気持ち。", "熱い。触ると痛い。"],
  },
  joy: {
    name: "喜びの火花",
    kind: "positive",
    color: "#ffd24d",
    core: "#fff0a0",
    lines: ["きらきらしてる。", "嬉しさの欠片。", "笑いたくなる気配。"],
  },
  void: {
    name: "虚無の霧",
    kind: "negative",
    color: "#6a6a8a",
    core: "#9898b0",
    lines: ["……輪郭がない。", "何も感じない。", "名前のない空白。"],
  },
  anxiety: {
    name: "不安の震え",
    kind: "negative",
    color: "#8b5cf6",
    core: "#c4b5fd",
    lines: ["震えている。", "まだ来ない何か。", "足がすくむ。"],
  },
  love: {
    name: "愛情の糸",
    kind: "positive",
    color: "#f472b6",
    core: "#fbcfe8",
    lines: ["絡まり合ってる。", "離れたくない。", "温かい糸。"],
  },
  guilt: {
    name: "罪悪の重石",
    kind: "negative",
    color: "#5c4033",
    core: "#8b6914",
    lines: ["ずっしり重い。", "謝りたいのに、言葉が出ない。", "石のような後悔。"],
  },
  envy: {
    name: "嫉妬の棘",
    kind: "negative",
    color: "#16a34a",
    core: "#4ade80",
    lines: ["尖っている。", "あの人の方が……", "刺さる視線。"],
  },
  hope: {
    name: "希望の灯",
    kind: "positive",
    color: "#38bdf8",
    core: "#e0f2fe",
    lines: ["小さく、でも確かに光ってる。", "まだ、行ける気がする。", "遠い灯台。"],
  },
  loneliness: {
    name: "孤独の影",
    kind: "negative",
    color: "#475569",
    core: "#94a3b8",
    lines: ["誰もいない場所の気配。", "輪郭だけが残ってる。", "名前を呼ばれてない。"],
  },
  curiosity: {
    name: "好奇の目",
    kind: "neutral",
    color: "#f97316",
    core: "#fed7aa",
    lines: ["じっと見てる。", "なぜ？ どうして？", "知りたがっている。"],
  },
};

const REACTIONS = {
  kill: {
    anger: "……消えた。でも、灰は残る。",
    joy: "笑い声が、途切れた。",
    void: "何もなかったことにした。",
    anxiety: "震えが、止まった。",
    love: "糸を、切った。",
    guilt: "重石が、砕け散った。",
    envy: "棘が、地面に落ちた。",
    hope: "灯が、消えた。",
    loneliness: "影が、薄れた。",
    curiosity: "目が、閉じた。",
  },
  eat: {
    anger: "熱い……脳が、強くなる。",
    joy: "甘い。少し、軽い。",
    void: "空虚を、飲み込んだ。",
    anxiety: "震えが、腹の中で鳴る。",
    love: "愛は、溶けていく。",
    guilt: "苦い。喉に、引っかかる。",
    envy: "酸っぱい。比べたくなる。",
    hope: "温かい。少し、前に進める。",
    loneliness: "冷たい。でも、馴染む。",
    curiosity: "知識の味。頭が、ざわつく。",
  },
  ignore: {
    anger: "燃え続けている。",
    joy: "だんだん、遠ざかる。",
    void: "大きくなっていく……",
    anxiety: "震えが、増幅した。",
    love: "糸が、絡まりつく。",
    guilt: "重石が、さらに重くなる。",
    envy: "棘が、背中に向かって伸びる。",
    hope: "灯が、遠くへ消えていく。",
    loneliness: "影が、足元に広がる。",
    curiosity: "目が、増えていく……",
  },
  friend: {
    anger: "怒りも、仲間になれる。",
    joy: "一緒に、跳ねている。",
    void: "形が、少し見えた。",
    anxiety: "震えが、リズムになった。",
    love: "糸が、温かい。",
    guilt: "重さを、分け合った。",
    envy: "棘が、花になった。",
    hope: "灯が、近づいてきた。",
    loneliness: "影の横に、立てた。",
    curiosity: "一緒に、覗き込んでる。",
  },
};

function pickType(bias, allTypes) {
  if (bias?.length && Math.random() < 0.72) {
    return bias[Math.floor(Math.random() * bias.length)];
  }
  return allTypes[Math.floor(Math.random() * allTypes.length)];
}

export function spawnEntities(world, TILE, isWalkable) {
  const { tiles, regions } = world;
  const allTypes = Object.keys(ENTITY_DEFS);
  const entities = [];
  let id = 0;

  for (const region of regions) {
    const count = Math.max(5, Math.floor(region.r * 0.5));
    for (let i = 0; i < count; i++) {
      const type = pickType(region.bias, allTypes);
      for (let attempt = 0; attempt < 50; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * (region.r - 4);
        const tx = Math.round(region.cx + Math.cos(angle) * radius);
        const ty = Math.round(region.cy + Math.sin(angle) * radius);
        if (!isWalkable(tiles, tx, ty)) continue;
        if (Math.hypot(tx - region.cx, ty - region.cy) < 3) continue;

        entities.push({
          id: `e${id++}`,
          type,
          motif: pickMotifForRegion(region.id),
          regionId: region.id,
          region: region.name,
          x: tx * TILE + TILE / 2,
          y: ty * TILE + TILE / 2,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28,
          alive: true,
          pulse: Math.random() * Math.PI * 2,
          scale: 0.9 + Math.random() * 0.2,
        });
        break;
      }
    }
  }

  return entities;
}

export function updateEntities(entities, dt, tiles, TILE, canMoveFn) {
  for (const e of entities) {
    if (!e.alive) continue;
    e.pulse += dt * 2;
    e.timer = (e.timer ?? 0) + dt;
    if (e.timer > 1.5) {
      e.timer = 0;
      e.vx = (Math.random() - 0.5) * 40;
      e.vy = (Math.random() - 0.5) * 40;
    }
    const size = 24;
    const nx = e.x + e.vx * dt;
    const ny = e.y + e.vy * dt;
    if (canMoveFn(tiles, nx - size / 2, ny - size / 2, size, size)) {
      e.x = nx;
      e.y = ny;
    } else {
      e.vx *= -1;
      e.vy *= -1;
    }
  }
}

export function findNearby(entities, px, py, range = 52) {
  return entities.find((e) => e.alive && Math.hypot(e.x - px, e.y - py) < range);
}

export function drawEntity(ctx, e, camera, dither, icons) {
  drawEntityIcon(ctx, icons, e, camera, dither);
}

/** マイナス感情エリア（怒・哀）→ アクション / プラス（喜・楽）→ RPG */
const ACTION_REGION_IDS = new Set(["nu", "ai"]);
const RPG_REGION_IDS = new Set(["ki", "raku"]);

export function combatStyleForEntity(entity) {
  const regionId = entity?.regionId;
  if (ACTION_REGION_IDS.has(regionId)) return "action";
  if (RPG_REGION_IDS.has(regionId)) return "rpg";
  const kind = ENTITY_DEFS[entity?.type]?.kind;
  if (kind === "negative") return "action";
  if (kind === "positive") return "rpg";
  return "rpg";
}

export function getEntityLine(entity) {
  const def = ENTITY_DEFS[entity.type];
  const lines = def.lines;
  return lines[Math.floor(Math.random() * lines.length)];
}

export function resolveChoice(entity, choice) {
  const def = ENTITY_DEFS[entity.type];
  const message = REACTIONS[choice]?.[entity.type] ?? "……";

  let remove = choice !== CHOICE.IGNORE;
  let darkDelta = 0;
  let speedBoost = 0;
  let brainWarmth = 0;

  let hpDelta = 0;
  let humanSpark = 0;

  switch (choice) {
    case CHOICE.KILL:
      darkDelta = def.kind === "negative" ? 8 : def.kind === "neutral" ? 10 : 12;
      brainWarmth = -0.2;
      hpDelta = -14;
      break;
    case CHOICE.EAT:
      darkDelta = def.kind === "negative" ? 14 : def.kind === "neutral" ? 6 : 2;
      speedBoost = def.kind === "negative" ? 1.25 : def.kind === "neutral" ? 1.1 : 1.05;
      brainWarmth = def.kind === "negative" ? 0.3 : def.kind === "neutral" ? 0.15 : 0.1;
      hpDelta = def.kind === "negative" ? -20 : def.kind === "neutral" ? -12 : -10;
      entity.scale = 1.1;
      break;
    case CHOICE.IGNORE:
      remove = false;
      darkDelta = 16;
      hpDelta = -8;
      entity.scale = Math.min(1.8, entity.scale + 0.15);
      break;
    case CHOICE.FRIEND:
      darkDelta = -10;
      brainWarmth = 0.25;
      hpDelta = -24;
      humanSpark = 2;
      remove = true;
      break;
  }

  if (remove) entity.alive = false;

  return {
    message,
    def,
    darkDelta,
    speedBoost,
    brainWarmth,
    hpDelta,
    humanSpark,
    remove,
  };
}
