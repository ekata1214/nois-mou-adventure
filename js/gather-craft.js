/** 採集アイテム・クラフト定義 */

export const GATHER_ITEMS = {
  sun_core: { id: "sun_core", name: "夏の芯", color: "#ffd24d", region: "ki" },
  anger_shard: { id: "anger_shard", name: "怒りの欠片", color: "#e50914", region: "nu" },
  rain_moss: { id: "rain_moss", name: "雨の苔", color: "#7eb8e8", region: "ai" },
  dusk_petal: { id: "dusk_petal", name: "夕の花弁", color: "#ff9a5c", region: "raku" },
};

export const REGION_GATHER_ITEM = {
  ki: "sun_core",
  nu: "anger_shard",
  ai: "rain_moss",
  raku: "dusk_petal",
};

export const CRAFT_RECIPES = [
  {
    id: "warm_lamp",
    name: "温かいランプ",
    desc: "殻に柔らかい灯りを置く",
    needs: { sun_core: 2, dusk_petal: 1 },
    humanSpark: 1.5,
  },
  {
    id: "memo_wall",
    name: "メモの壁",
    desc: "言葉が貼れる余白を増やす",
    needs: { rain_moss: 2, anger_shard: 1 },
    humanSpark: 1,
  },
  {
    id: "grow_pot",
    name: "育てる鉢",
    desc: "小さな庭のはじまり",
    needs: { sun_core: 1, rain_moss: 2, dusk_petal: 1 },
    humanSpark: 2,
  },
];

export function itemMeta(itemId) {
  return GATHER_ITEMS[itemId] ?? { id: itemId, name: itemId, color: "#aaa" };
}

export function inventoryCount(soul, itemId) {
  return soul.inventory?.[itemId] ?? 0;
}

export function canCraft(soul, recipe) {
  if (soul.crafted?.includes(recipe.id)) return false;
  for (const [itemId, qty] of Object.entries(recipe.needs)) {
    if (inventoryCount(soul, itemId) < qty) return false;
  }
  return true;
}

export function craftRecipe(soul, recipeId) {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraft(soul, recipe)) {
    return { ok: false, reason: "materials" };
  }

  soul.inventory = soul.inventory ?? {};
  for (const [itemId, qty] of Object.entries(recipe.needs)) {
    soul.inventory[itemId] = Math.max(0, (soul.inventory[itemId] ?? 0) - qty);
  }
  soul.crafted = soul.crafted ?? [];
  soul.crafted.push(recipe.id);
  soul.humanSpark = Math.min(40, (soul.humanSpark ?? 0) + (recipe.humanSpark ?? 1));
  soul.darkEntity = Math.max(0, soul.darkEntity - 5);

  return { ok: true, recipe };
}

export function formatNeeds(recipe) {
  return Object.entries(recipe.needs)
    .map(([id, qty]) => `${itemMeta(id).name}×${qty}`)
    .join(" · ");
}
