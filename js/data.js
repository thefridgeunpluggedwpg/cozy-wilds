// Cozy Wilds — tunable game data. Everything here is data-driven: predators, recipes, shelter tiers, buffs.
export const PREDATORS = [
  { id: 'wolf', name: 'wolf', plural: 'wolves', speed: 3.2, weight: { 'Deep Woods': 3, 'Rocky Highlands': 3, default: 1 }, sound: 'howl' },
  { id: 'coyote', name: 'coyote', plural: 'coyotes', speed: 3.6, weight: { Meadows: 3, 'Sandy Coast': 2, default: 1.5 }, sound: 'howl' },
  { id: 'bear', name: 'black bear', plural: 'bears', speed: 2.4, weight: { 'Deep Woods': 2, Lakelands: 2, default: 0.6 }, sound: 'growl' },
  { id: 'raccoon', name: 'raccoon', plural: 'raccoons', speed: 2.8, weight: { 'Pinecrest Campground': 4, default: 2 }, sound: 'growl' },
];
// Shelter ladder: each tier unlocks the next recipe. tier = best shelter you have ever made livable.
export const TIERS = ['No shelter yet', 'Lean-to', 'Tarp camp', 'Livable home (shack or van)', 'Fortified / upgraded home'];
// Build-menu recipes: inputs -> output, gated by shelter tier (crafting is atomic: checked before anything is spent).
export const RECIPES = [
  { id: 'leanto', icon: '⛺', name: 'Lean-to shelter', cost: { wood: 4 }, req: 0, kind: 'shelter', tier: 1 },
  { id: 'fire', icon: '🔥', name: 'Campfire', cost: { wood: 2 }, req: 0, kind: 'fire' },
  { id: 'hatchet', icon: '🪓', name: 'Hatchet (2 wood per chop)', cost: { scrap: 2, wood: 1 }, req: 1, kind: 'tool' },
  { id: 'tarp', icon: '🏕', name: 'Tarp camp', cost: { scrap: 3, wood: 3 }, req: 1, kind: 'shelter', tier: 2 },
];
// Fixed homes: repair/upgrade steps, also tier-gated.
export const HOMES = {
  shack: { name: 'trapper shack', steps: [{ label: 'Repair the shack', cost: { wood: 6 }, req: 2, tier: 3, msg: 'The shack is livable again. A real roof!' }, { label: 'Fortify the shack', cost: { wood: 6, scrap: 2 }, req: 3, tier: 4, msg: 'Shutters and a fence: the shack is fortified.' }], repair: { wood: 2 } },
  van: { name: 'camper van', steps: [{ label: 'Fix up the camper van', cost: { scrap: 4 }, req: 2, tier: 3, msg: 'The van is cozy and weather-tight.' }, { label: 'Upgrade the van (solar + awning)', cost: { scrap: 4, wood: 2 }, req: 3, tier: 4, msg: 'Solar panel and awning fitted. The van feels like home.' }], repair: { scrap: 1, wood: 1 } },
  leanto: { name: 'lean-to', tier: 1, repair: { wood: 2 } },
  tarp: { name: 'tarp camp', tier: 2, repair: { wood: 1, scrap: 1 } },
};
// Collision footprints (tiles, relative to sprite base line) with a door gap you walk through.
export const FOOT = { shack: { hw: 1.85, d: 1.6, door: 0, dw: 0.42 }, van: { hw: 2.15, d: 1.15, door: 0.3, dw: 0.4 } };
// Buffs: gentle bonuses that simply fade. Nothing ever drains or fails.
export const BUFFS = {
  refreshed: { icon: '💧', name: 'Refreshed', desc: '+10% stride', mins: 300 },
  fed: { icon: '🫐', name: 'Well-fed', desc: 'sometimes +1 wood', mins: 240 },
  toasty: { icon: '🔥', name: 'Toasty', desc: 'predators keep their distance', mins: 120 },
  rested: { icon: '💤', name: 'Rested', desc: '+stride, better with better shelter', mins: 480 },
};
export const TUNE = { minPerSec: 2, nightStart: 20 * 60, nightEnd: 6 * 60, fireBurnPerMin: 0.12, fireFeed: 30, boilSecs: 5, repairSecs: 2, maxPredators: 5, ransackChance: 0.55, awayDist: 30 };
