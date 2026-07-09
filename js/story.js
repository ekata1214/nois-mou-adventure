/** 章・進行 — システムと噛む短い節 */

export const CHAPTERS = [
  {
    id: 0,
    title: "殻の中",
    goal: "殻で100字の答えを1つ",
    hint: "タブで殻へ。正直に、長く書く。",
    check: (s) => (s.totalFeeds ?? 0) >= 1,
  },
  {
    id: 1,
    title: "NOUの入口",
    goal: "遭遇を3回",
    hint: "フィールドを歩く。気配に触れる。",
    check: (s) => (s.totalEncounters ?? 0) >= 3,
  },
  {
    id: 2,
    title: "素材の記憶",
    goal: "採集アイテムを5個",
    hint: "G — 採集モード。光る素材に近づく。",
    check: (s) => (s.totalGathered ?? 0) >= 5,
  },
  {
    id: 3,
    title: "殻を育てる",
    goal: "クラフトを1つ完成",
    hint: "殻のクラフト欄。素材を消費して作る。",
    check: (s) => (s.crafted?.length ?? 0) >= 1,
  },
  {
    id: 4,
    title: "使う意味",
    goal: "クラフト品を1回使う",
    hint: "殻で「使う」ボタン。灯り・壁・鉢。",
    check: (s) => (s.craftUses ?? 0) >= 1,
  },
  {
    id: 5,
    title: "人間の輪郭",
    goal: "人間ゲージ 60% 以上",
    hint: "答え・遭遇・世話・時間。",
    check: (s, ctx) => (ctx?.human ?? 0) >= 60,
  },
];

export function getChapter(soul) {
  return soul.chapter ?? 0;
}

export function syncChapter(soul, ctx = {}) {
  let ch = soul.chapter ?? 0;
  while (ch < CHAPTERS.length && CHAPTERS[ch].check(soul, ctx)) {
    ch += 1;
  }
  if (ch !== soul.chapter) {
    soul.chapter = ch;
    soul.storyFlags = soul.storyFlags ?? {};
    soul.storyFlags[`chapter_${ch}`] = Date.now();
    return { advanced: true, chapter: ch, title: CHAPTERS[ch - 1]?.title ?? "" };
  }
  return { advanced: false, chapter: ch };
}

export function getChapterProgress(soul, ctx = {}) {
  const ch = Math.min(soul.chapter ?? 0, CHAPTERS.length - 1);
  const def = CHAPTERS[ch];
  return {
    chapter: ch,
    title: def.title,
    goal: def.goal,
    hint: def.hint,
    done: def.check(soul, ctx),
    total: CHAPTERS.length,
  };
}

export function chapterMuuLine(soul) {
  const ch = soul.chapter ?? 0;
  const lines = [
    "……まず、殻で話そ。",
    "NOUは、外の世界。怖くない。",
    "光るものを、拾える。",
    "作ったものは、使わないと意味がない。",
    "壁に貼った言葉は、戻ってくる。",
    "もう少しで、人間に近い輪郭。",
  ];
  return lines[Math.min(ch, lines.length - 1)];
}
