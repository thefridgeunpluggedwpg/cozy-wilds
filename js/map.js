// Cozy Wilds — MAP MODULE BOUNDARY.
// Everything the game knows about the map comes through loadMap(). To swap maps, write another module
// that returns the same shape: { W, D, T (Uint8 tile per cell), H (height), REG (region names per cell),
// regionAt(x,z), props[], places{}, waters[], spawn, solid(x,z), isWater(x,z) }.
// Source: Dark Forest island terrain (world.js) — only terrain/regions/resource nodes are used;
// buildings, mansion, story and creatures from Dark Forest are ignored.
import { World, W, D, B, RG, WATER, mulberry32 } from './world.js';
export const TILE = { WATER: 0, GRASS: 1, SAND: 2, STONE: 3, DIRT: 4, DEEP: 5, PATH: 6, FLOOR: 7 };
const REGION = { [RG.SEA]: 'Open Sea', [RG.COAST]: 'Sandy Coast', [RG.MEADOW]: 'Meadows', [RG.WOODS]: 'Deep Woods', [RG.MARSH]: 'Reedmarsh', [RG.HIGH]: 'Rocky Highlands', [RG.LAKE]: 'Lakelands', [RG.RUINS]: 'Old Clearing', [RG.HAUNT]: 'Pinecrest Campground' };
export function loadMap(seed = 7) {
  const w = new World(seed), r = mulberry32(seed * 31 + 5);
  const T = new Uint8Array(W * D), Hh = new Uint8Array(W * D), solid = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const k = z * W + x, g = w.ground[k]; Hh[k] = g;
    if (w.water[k]) T[k] = g < WATER - 2 ? TILE.DEEP : TILE.WATER;
    else { const b = w.data[w.idx(x, g - 1, z)]; T[k] = b === B.SAND ? TILE.SAND : b === B.STONE || b === B.COBBLE ? TILE.STONE : b === B.DIRT || b === B.FARM ? TILE.DIRT : TILE.GRASS; }
  }
  const MX = W >> 1, MZ = D >> 1, props = [], waters = [];
  const isW = (x, z) => x < 0 || z < 0 || x >= W || z >= D || T[z * W + x] === TILE.WATER || T[z * W + x] === TILE.DEEP;
  // stream: meander from the campground toward the nearest lake / sea
  const tgt = w.lakes[0] || { x: MX + 150, z: MZ };
  let sx = MX + 30, sz = MZ - 14; const ang0 = Math.atan2(tgt.z - sz, tgt.x - sx);
  for (let i = 0; i < 400; i++) { const a = ang0 + Math.sin(i * 0.07) * 0.6; sx += Math.cos(a); sz += Math.sin(a); const X = sx | 0, Z = sz | 0; if (X < 2 || Z < 2 || X > W - 3 || Z > D - 3) break;
    if (isW(X, Z) && i > 20) break; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 0; dx++) T[(Z + dz) * W + X + dx] = TILE.WATER; if (i % 40 === 20) waters.push({ kind: 'stream', x: X + 1.5, z: Z, label: 'Babbling stream' }); }
  for (const L of w.lakes) waters.push({ kind: 'lake', x: L.x + L.R, z: L.z, label: 'Lake shore', lake: L });
  // trees & resources from DF nodes (skip the central clearing)
  for (const n of w.nodes) { const d = Math.hypot(n.x - MX, n.z - MZ); if (d < 26 || isW(n.x, n.z)) continue;
    const t = n.type === 'wood' ? (n.deadTree ? 'dead' : 'tree') : n.type; props.push({ t, x: n.x + 0.5, z: n.z + 0.5, v: (n.x * 7 + n.z * 13) % 9, pine: w.region[n.z * W + n.x] === RG.HIGH || w.region[n.z * W + n.x] === RG.WOODS && (n.x + n.z) % 3 === 0, amt: 3 });
    if (t === 'tree' || t === 'dead' || t === 'stone') solid[n.z * W + n.x] = 1; }
  // places
  const findLand = (x, z, rad) => { for (let t = 0; t < 400; t++) { const X = Math.round(x + (r() - 0.5) * rad), Z = Math.round(z + (r() - 0.5) * rad); let ok = true; for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3; dx++) if (isW(X + dx, Z + dz)) { ok = false; break; } if (ok) return { x: X, z: Z }; } return { x, z }; };
  const clear = (p, R) => { for (let i = props.length - 1; i >= 0; i--) if (Math.hypot(props[i].x - p.x, props[i].z - p.z) < R) { solid[(props[i].z | 0) * W + (props[i].x | 0)] = 0; props.splice(i, 1); } };
  const pathTo = (a, b) => { const n = Math.hypot(b.x - a.x, b.z - a.z) | 0; for (let i = 0; i <= n; i++) { const x = Math.round(a.x + (b.x - a.x) * i / n + Math.sin(i * 0.15) * 2), z = Math.round(a.z + (b.z - a.z) * i / n); for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) { const k = (z + dz) * W + x + dx; if (!isW(x + dx, z + dz) && T[k] !== TILE.STONE) T[k] = TILE.PATH; } } };
  const camp = { x: MX, z: MZ, label: 'Pinecrest Campground (abandoned)' }; clear(camp, 26);
  const pick = reg => { const s = w.regionSeeds.find(q => q.k === reg) || w.regionSeeds[(r() * w.regionSeeds.length) | 0]; return findLand(s.x, s.z, 40); };
  const shack = pick(RG.WOODS); shack.label = 'Derelict trapper shack'; clear(shack, 6);
  const van = pick(RG.MEADOW); van.label = 'Broken-down camper van'; clear(van, 6);
  const wellP = findLand(MX - 16, MZ + 12, 4); wellP.label = 'Old hand-pump well'; clear(wellP, 2);
  waters.push({ kind: 'well', x: wellP.x, z: wellP.z, label: 'Old well' });
  pathTo(camp, shack); pathTo(camp, van); pathTo(camp, { x: tgt.x, z: tgt.z + (tgt.R || 0) + 2 });
  // campground: pads, picnic tables, sign, ranger box
  for (let z = -14; z <= 14; z++) for (let x = -14; x <= 14; x++) { const k = (MZ + z) * W + MX + x; if (Math.abs(x) + Math.abs(z) < 3 || (Math.abs(z) < 2) || (Math.abs(x) < 2)) T[k] = TILE.PATH; }
  const pads = [[-9, -8], [9, -8], [-9, 8], [9, 8]]; for (const [px, pz] of pads) { for (let z = -2; z <= 2; z++) for (let x = -3; x <= 3; x++) T[(MZ + pz + z) * W + MX + px + x] = TILE.DIRT; props.push({ t: 'table', x: MX + px + 2.5, z: MZ + pz - 1.5 }); props.push({ t: 'ring', x: MX + px - 1.5, z: MZ + pz + 1 }); }
  props.push({ t: 'sign', x: MX + 3.5, z: MZ + 3.5 }); props.push({ t: 'toilet', x: MX - 13, z: MZ - 13 });
  props.push({ t: 'shack', x: shack.x + 0.5, z: shack.z + 0.5 }); props.push({ t: 'van', x: van.x + 0.5, z: van.z + 0.5 }); props.push({ t: 'well', x: wellP.x + 0.5, z: wellP.z + 0.5 });
  for (let i = 0; i < 40; i++) { const p = findLand(MX + (r() - 0.5) * 400, MZ + (r() - 0.5) * 400, 6); if (Math.hypot(p.x - MX, p.z - MZ) > 30) props.push({ t: r() < 0.5 ? 'scrap' : 'flower', x: p.x + 0.5, z: p.z + 0.5, amt: 2 }); }
  for (let i = 0; i < 900; i++) { const x = (r() * W) | 0, z = (r() * D) | 0; if (T[z * W + x] === TILE.GRASS && !solid[z * W + x]) props.push({ t: 'grass', x: x + r(), z: z + r(), v: (r() * 4) | 0 }); }
  props.sort((a, b) => a.z - b.z);
  const regionAt = (x, z) => { x |= 0; z |= 0; if (x < 0 || z < 0 || x >= W || z >= D) return 'Open Sea'; if (Math.hypot(x - MX, z - MZ) < 22) return REGION[RG.HAUNT]; const g = w.region[z * W + x]; return REGION[g === RG.HAUNT ? RG.MEADOW : g]; };
  return { W, D, T, H: Hh, props, waters, regionAt, places: { camp, shack, van, well: wellP },
    spawn: { x: MX + 0.5, z: MZ + 4.5 }, isWater: isW, solid: (x, z) => isW(x | 0, z | 0) || solid[(z | 0) * W + (x | 0)] === 1 };
}
