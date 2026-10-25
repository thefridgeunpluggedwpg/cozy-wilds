// Cozy Wilds — prototype v0.2 (Hammer & Pixel Games). Cozy wilderness survival; no hunger/thirst death, no rush.
import { loadMap, TILE } from './map.js';
import * as A from './art.js';
import * as SP from './sprites.js';
import { PREDATORS, RECIPES, HOMES, FOOT, BUFFS, TIERS, TUNE } from './data.js';
import { initAudio, sfx, ambience, buzz, snd, vols, applyVols, haptics } from './audio.js';
const $ = s => document.querySelector(s);
const cvs = $('#c'), ctx = cvs.getContext('2d'); const T = 16; // art px per tile
const SAVE_KEY = 'cozywilds.save.v1'; const SEED = 7;
let map, S, running = false, paused = false;
// ---------- sprite cache ----------
const cache = new Map(); const spr = (k, f) => { let c = cache.get(k); if (!c) { c = f(); cache.set(k, c); } return c; };
const IMG = window.__CW_IMG || {}; const DIRS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const pimg = {}; for (const d of DIRS) { pimg['idle_' + d] = img(`assets/player/idle_${d}.png`); for (let i = 0; i < 6; i++) pimg[`walk_${d}_${i}`] = img(`assets/player/walk_${d}_${i}.png`); }
function img(p) { const i = new Image(); i.src = IMG[p] || p; return i; }
// ---------- state ----------
function newState() { const p = map.places;
  return { v: 2, t: 7 * 60, day: 1, px: map.spawn.x, pz: map.spawn.z, dir: 2, inv: { wood: 3, scrap: 0, jug: 'empty', berries: 0 }, tools: {}, tier: 0, buffs: { rested: 240 },
    fires: [{ x: p.camp.x - 8.5, z: p.camp.z + 9, fuel: 40 }],
    shelters: [{ id: 'shack', type: 'shack', x: p.shack.x + 0.5, z: p.shack.z + 2.2, lvl: 0, ransacked: false }, { id: 'van', type: 'van', x: p.van.x + 0.5, z: p.van.z + 1.5, lvl: 0, ransacked: false }],
    used: {}, boil: 0, stats: { ransacks: 0, nights: 0 } };
}
const SET_KEY = 'cozywilds.settings.v1'; const settings = Object.assign({ shake: true, flash: true, vibrate: true, bigText: false, sound: true }, JSON.parse(localStorage.getItem(SET_KEY) || '{}'), {});
const saveSettings = () => localStorage.setItem(SET_KEY, JSON.stringify({ ...settings, vols }));
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } };
// ---------- time ----------
const hour = () => S.t / 60; const isNight = () => S.t >= TUNE.nightStart || S.t < TUNE.nightEnd;
function darkness() { const h = hour(); const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }; return h >= 12 ? sm(18.5, 21, h) : 1 - sm(5, 7.5, h); }
const clockStr = () => { const h = Math.floor(hour()), m = Math.floor(S.t % 60); return `Day ${S.day} · ${String(h).padStart(2, '0')}:${String(m - m % 10).padStart(2, '0')}`; };
// ---------- log/toast ----------
function say(msg, kind = '') { const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg; $('#toasts').prepend(d); while ($('#toasts').childElementCount > 3) $('#toasts').lastChild.remove(); setTimeout(() => d.classList.add('fade'), 3800); setTimeout(() => d.remove(), 4600); const l = document.createElement('div'); l.textContent = `${clockStr().split('· ')[1]} ${msg}`; $('#logList').prepend(l); while ($('#logList').childElementCount > 40) $('#logList').lastChild.remove(); }
// ---------- terrain chunks (smooth shorelines: water edges come from a bilinear water field + noise) ----------
const CH = 32, chunks = new Map();
const PAL = { [TILE.GRASS]: ['#3e7a2e', '#4a8a34', '#56993a', '#63a640', '#7ab84c'], [TILE.SAND]: ['#c8b078', '#d6be86', '#e2cc96', '#ecd9a6'], [TILE.STONE]: ['#5f6372', '#6f7586', '#7f8696', '#9097a6'], [TILE.DIRT]: ['#6e4c2e', '#7d5836', '#8c643e', '#9a7048'], [TILE.PATH]: ['#8a6c48', '#9a7a52', '#a8885e', '#b6966a'], [TILE.WATER]: ['#2a6a9a', '#2f78a8', '#3586b4', '#3a8cbc'], [TILE.DEEP]: ['#1a4a7a', '#1e5486', '#225e90', '#2a6698'] };
const tl = (x, z) => (x < 0 || z < 0 || x >= map.W || z >= map.D) ? TILE.DEEP : map.T[z * map.W + x]; const ht = (x, z) => (x < 0 || z < 0 || x >= map.W || z >= map.D) ? 0 : map.H[z * map.W + x];
const wet = t => t === TILE.WATER || t === TILE.DEEP;
function waterField(fx, fz) { const x0 = Math.floor(fx), z0 = Math.floor(fz), ax = fx - x0, az = fz - z0; const w = (x, z) => tl(x, z) === TILE.DEEP ? 1.15 : wet(tl(x, z)) ? 1 : 0;
  return (w(x0, z0) * (1 - ax) + w(x0 + 1, z0) * ax) * (1 - az) + (w(x0, z0 + 1) * (1 - ax) + w(x0 + 1, z0 + 1) * ax) * az; }
function chunk(cx, cz) { const key = cx + ',' + cz; let c = chunks.get(key); if (c) return c; c = A.cv(CH * T, CH * T); const g = c.getContext('2d'), id = g.createImageData(CH * T, CH * T), d = id.data;
  for (let tz = 0; tz < CH; tz++) for (let tx = 0; tx < CH; tx++) { const X = cx * CH + tx, Z = cz * CH + tz, t = tl(X, Z), h = ht(X, Z);
    const shade = wet(t) ? 0 : (ht(X, Z - 1) < h ? 14 : 0) + (ht(X, Z + 1) > h ? -18 : 0) + (h - 16) * 1.6;
    let landT = t; if (wet(t)) { landT = TILE.SAND; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const n = tl(X + a, Z + b); if (!wet(n)) { landT = n === TILE.PATH ? TILE.SAND : n; break; } } }
    const nearW = wet(t) || [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].some(([a, b]) => wet(tl(X + a, Z + b)));
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) { const wx = X * T + px, wz = Z * T + py; const n = A.vnoise(wx * 0.18, wz * 0.18, 3) * 0.6 + A.hash(wx, wz, 1) * 0.4;
      let wv = wet(t) ? 1 : 0; if (nearW) wv = waterField(X + (px + 0.5) / T - 0.5, Z + (py + 0.5) / T - 0.5) + (A.vnoise(wx * 0.09, wz * 0.09, 12) - 0.5) * 0.35;
      let col;
      if (wv > 0.5) { const deep = wv > 1.02 ? PAL[TILE.DEEP] : PAL[TILE.WATER]; col = A.hex(deep[Math.min(3, (n * 4) | 0)]); if (wv < 0.6) col = [200, 230, 238]; else if (wv < 0.68) col = [96, 170, 206]; else if (wv < 0.8) col = col.map(v => v + 14);
        if (A.vnoise(wx * 0.07, wz * 0.25, 9) > 0.78) col = col.map(v => v + 18); }
      else { let tt = wv > 0.32 ? TILE.SAND : (wet(t) ? landT : t), p = PAL[tt];
        const ex = px < 3 ? -1 : px > 12 ? 1 : 0, ez = py < 3 ? -1 : py > 12 ? 1 : 0; if ((ex || ez) && A.hash(wx, wz, 7) < 0.45 && wv <= 0.32) { const nt = tl(X + ex, Z + ez); if (!wet(nt) && nt !== tt) { tt = nt; p = PAL[nt]; } }
        col = A.hex(p[Math.min(p.length - 1, (n * p.length) | 0)]); if (wv > 0.42) col = col.map(v => v - 22); // wet sand band
        if (tt === TILE.GRASS && A.hash(wx, wz, 4) < 0.05) col = [122, 190, 80]; if (tt === TILE.GRASS && A.hash(wx, wz, 5) < 0.004) col = [240, 220, 120]; if (tt === TILE.STONE && A.hash(wx, wz, 6) < 0.06) col = [60, 62, 74]; if ((tt === TILE.PATH || tt === TILE.DIRT) && A.hash(wx, wz, 8) < 0.03) col = [70, 50, 34];
        const sh = wet(t) ? 0 : shade + (py < 2 && ht(X, Z - 1) < h ? 10 : 0) + (py > 13 && ht(X, Z + 1) < h - 1 ? -24 : 0); col = col.map(v => v + sh); }
      const o = ((tz * T + py) * CH * T + tx * T + px) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; } }
  g.putImageData(id, 0, 0); chunks.set(key, c); return c; }
// ---------- camera & input ----------
const cam = { x: 0, z: 0, zoom: 3, panX: 0, panZ: 0, trauma: 0 }; let VW = 0, VH = 0, DPR = 1;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cvs.width = VW * DPR; cvs.height = VH * DPR; cvs.style.width = VW + 'px'; cvs.style.height = VH + 'px'; cam.zoom = Math.max(cam.zoom, minZoom()); }
const minZoom = () => Math.max(1.5, VH / 420); const maxZoom = () => Math.max(6, VH / 110);
addEventListener('resize', resize);
const shake = t => { if (settings.shake) cam.trauma = Math.min(1, cam.trauma + t); };
// screen stack: title -> game -> pause/how. Escape pops.
const screens = ['title']; const top = () => screens[screens.length - 1];
function focusFirst(sel) { const b = document.querySelector(sel + ' button'); if (b) b.focus(); }
const keys = new Set(); addEventListener('keydown', e => { const k = e.key.toLowerCase();
  if (top() !== 'game') { if (k === 'arrowdown' || k === 'arrowup') { const bs = [...document.querySelectorAll(top() === 'title' ? '#title button' : '#pause button')].filter(b => b.offsetParent); const i = bs.indexOf(document.activeElement); (bs[(i + (k === 'arrowdown' ? 1 : -1) + bs.length) % bs.length] || bs[0])?.focus(); e.preventDefault(); } if ((k === 'escape' || k === 'p') && top() === 'pause') togglePause(false); return; }
  if (k === 'escape' || k === 'p') { togglePause(true); return; } keys.add(k);
  if (k === 'e' || k === ' ') { e.preventDefault(); doAction(); } if (k === 'b') toggleBuild(); if (k === 'f') feedNearest(); if (k === 'z') trySleep(); if (k === 'h') $('#ui').classList.toggle('hideall'); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }; const ptrs = new Map(); let gest = null, target = null;
cvs.addEventListener('pointerdown', e => { initAudio(); cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), type: e.pointerType });
  if (ptrs.size === 2) { if (joy.id != null) { joy.id = null; joy.dx = joy.dy = 0; showJoy(false); } gest = twoInfo(); return; }
  if (e.pointerType !== 'mouse' && e.clientX < VW * 0.5 && joy.id == null) { joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0; showJoy(true); } });
cvs.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && gest) { const g = twoInfo(); setZoom(cam.zoom * g.d / Math.max(10, gest.d)); const s = T * cam.zoom; cam.panX -= (g.cx - gest.cx) / s; cam.panZ -= (g.cy - gest.cy) / s; gest = g; return; }
  if (e.pointerId === joy.id) { let dx = p.x - joy.ox, dy = p.y - joy.oy; const L = Math.hypot(dx, dy), M = 55; if (L > M) { dx *= M / L; dy *= M / L; } joy.dx = dx / M; joy.dy = dy / M; showJoy(true); } });
const endP = e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) gest = null; if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; showJoy(false); }
  else if (p && p.type === 'mouse' && e.type === 'pointerup' && Math.hypot(p.x - p.sx, p.y - p.sy) < 6 && top() === 'game') { const s = T * cam.zoom; target = { x: cam.x + (p.x - VW / 2) / s, z: cam.z + (p.y - VH / 2) / s }; } };
cvs.addEventListener('pointerup', endP); cvs.addEventListener('pointercancel', endP); cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(cam.zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
function twoInfo() { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
function setZoom(z) { cam.zoom = Math.max(minZoom(), Math.min(maxZoom(), z)); }
function showJoy(on) { const j = $('#joy'); j.classList.toggle('on', on); if (on) { j.style.left = joy.ox + 'px'; j.style.top = joy.oy + 'px'; $('#knob').style.transform = `translate(${joy.dx * 40}px,${joy.dy * 40}px)`; } }
// ---------- world queries ----------
const dist = (a, b, x, z) => Math.hypot(a - x, b - z);
const baseZ = s => s.z - 0.8; // sprite base line for shack/van
function footHit(s, x, z) { const F = FOOT[s.type]; if (!F) return false; const dx = x - s.x, dz = z - baseZ(s); if (!(Math.abs(dx) < F.hw && dz < 0.05 && dz > -F.d)) return false; const room = Math.abs(dx) < F.hw - 0.35 && dz < -0.25 && dz > -F.d + 0.3, door = Math.abs(dx - F.door) < F.dw && dz > -0.3; return !room && !door; } // hollow footprint: walls all round, one door gap in front
const insideOf = s => { const F = FOOT[s.type]; if (!F) return false; const dx = S.px - s.x, dz = S.pz - baseZ(s); return Math.abs(dx) < F.hw && dz < -0.05 && dz > -F.d; };
const blocked = (x, z) => map.solid(x, z) || S.shelters.some(s => footHit(s, x, z));
function nearProp(types, R = 1.6) { let best = null, bd = R; for (let i = 0; i < map.props.length; i++) { const p = map.props[i]; if (!types.includes(p.t)) continue; if (Math.abs(p.z - S.pz) > R + 1) continue; const d = dist(p.x, p.z, S.px, S.pz); if (d < bd && amtOf(i) > 0) { bd = d; best = i; } } return best; }
const amtOf = i => { const u = S.used[i]; const p = map.props[i]; return u ? (p.amt ?? 1) - u.n : (p.amt ?? 1); };
function nearWater() { if (dist(map.places.well.x + 0.5, map.places.well.z + 0.5, S.px, S.pz) < 2) return 'well'; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dz) <= 2 && map.isWater(Math.floor(S.px + dx), Math.floor(S.pz + dz))) return 'water'; return null; }
const nearFire = (R = 2.2) => S.fires.find(f => dist(f.x, f.z, S.px, S.pz) < R);
const nearShelter = (R = 2.6) => S.shelters.find(s => insideOf(s) || dist(s.x, s.z, S.px, S.pz) < R);
const tierOf = s => HOMES[s.type].tier ?? (s.lvl >= 2 ? 4 : s.lvl >= 1 ? 3 : 0);
const usable = s => !s.ransacked && tierOf(s) > 0;
const has = c => Object.entries(c).every(([k, v]) => (S.inv[k] || 0) >= v); const pay = c => { for (const [k, v] of Object.entries(c)) S.inv[k] -= v; };
const costStr = c => Object.entries(c).map(([k, v]) => `${v} ${k}`).join(' + ');
const nameOf = s => HOMES[s.type].name;
const buff = k => (S.buffs[k] || 0) > 0; const giveBuff = (k, mins) => { const had = buff(k); S.buffs[k] = Math.max(S.buffs[k] || 0, mins ?? BUFFS[k].mins); if (!had) pop(`${BUFFS[k].icon} ${BUFFS[k].name}`, S.px, S.pz - 2.6, '#bfe8ff'); };
function raiseTier(t) { if (t > S.tier) { S.tier = t; say(`Shelter tier ${t}: ${TIERS[t]}. ${nextGoal()}`, 'good'); pop('★ Tier ' + t, S.px, S.pz - 3, '#ffd890'); } }
function nextGoal() { const t = S.tier; return t === 0 ? 'Next: build a lean-to (4 wood).' : t === 1 ? 'Next: craft a hatchet and a tarp camp (scrap from old junk piles).' : t === 2 ? 'Next: repair the trapper shack or fix the camper van.' : t === 3 ? 'Next: fortify the shack or upgrade the van.' : 'Your homestead is complete. Enjoy the wilds!'; }
// ---------- timed hands-on tasks (repairs etc.) ----------
let task = null;
function startTask(label, dur, fn) { task = { label, t: 0, dur, fn, tick: 0 }; }
function updTask(dt) { if (!task) return; if (moving) { task = null; say('You set the tools down. Pick it up any time.'); return; } task.t += dt; task.tick -= dt; if (task.tick < 0) { task.tick = 0.4; sfx.tap(); shake(0.08); } if (task.t >= task.dur) { const f = task.fn; task = null; f(); } }
// ---------- actions ----------
function homeAction(s) { const H = HOMES[s.type];
  if (s.ransacked) return { label: `Repair ${nameOf(s)} (${costStr(H.repair)})`, cost: H.repair, fn: () => startTask('Repairing', TUNE.repairSecs, () => { s.ransacked = false; sfx.hammer(); shake(0.25); buzz([30, 60, 30]); bounce(s); say(`You patch up the ${nameOf(s)}. Good as new.`, 'good'); save(); }) };
  const st = H.steps && H.steps[s.lvl]; if (!st) return null;
  if (S.tier < st.req) return { label: `${st.label} (unlocks at tier ${st.req}: ${TIERS[st.req]})`, locked: true, fn: () => say(nextGoal()) };
  return { label: `${st.label} (${costStr(st.cost)})`, cost: st.cost, fn: () => startTask('Building', TUNE.repairSecs * 1.5, () => { s.lvl++; sfx.hammer(); shake(0.35); buzz([30, 60, 30]); bounce(s); say(st.msg, 'good'); raiseTier(st.tier); save(); }) }; }
function contextActions() { const out = []; const s = nearShelter();
  if (task) return [{ label: `${task.label}… ${Math.round(task.t / task.dur * 100)}%`, fn: () => {} }];
  if (s) { if (usable(s) && (isNight() || hour() >= 18)) out.push({ label: `Sleep in the ${nameOf(s)}`, fn: () => sleep(s) }); const a = homeAction(s); if (a) out.push(a); }
  if (S.inv.jug === 'clean') out.push({ label: 'Drink boiled water', fn: () => { S.inv.jug = 'empty'; giveBuff('refreshed'); sfx.pour(); say('Ahh. Warm, clean water.', 'good'); } });
  const f = nearFire(); if (f) { if (S.inv.jug === 'raw' && f.fuel > 0) out.push({ label: S.boil > 0 ? `Boiling… ${Math.round(S.boil / TUNE.boilSecs * 100)}%` : 'Boil the jug on the fire', fn: () => { if (!S.boil) { S.boil = 0.01; sfx.bubble(); say('You hang the jug over the flames.'); } } });
    if (S.inv.berries > 0 && f.fuel > 0) out.push({ label: `Toast berries on a stick (${S.inv.berries})`, fn: () => { S.inv.berries--; giveBuff('fed'); sfx.pickup(); say('Warm, jammy, perfect.', 'good'); } });
    out.push({ label: f.fuel > 0 ? `Feed the fire (1 wood)` : 'Light the fire (1 wood)', cost: { wood: 1 }, fn: () => feed(f) }); }
  const w = nearWater(); if (w && S.inv.jug !== 'raw') out.push({ label: w === 'well' ? 'Pump water into the jug' : 'Fill the jug', fn: () => { S.inv.jug = 'raw'; sfx.pour(); buzz(40); pop('🫙 filled', S.px, S.pz - 2.6, '#9fd8ff'); say(w === 'well' ? 'Cold well water. Best boil it.' : 'You fill the jug. Boil it at the fire before drinking.'); } });
  const tr = nearProp(['tree', 'dead'], 1.7); if (tr != null) out.push({ label: S.tools.hatchet ? 'Chop wood' : 'Gather wood', fn: () => take(tr, 'wood') });
  const sc = nearProp(['scrap'], 1.5); if (sc != null) out.push({ label: 'Salvage scrap', fn: () => take(sc, 'scrap') });
  const be = nearProp(['berry'], 1.5); if (be != null) out.push({ label: 'Pick berries', fn: () => take(be, 'berries') });
  if (S.inv.berries > 0 && !out.length) out.push({ label: `Snack on berries (${S.inv.berries})`, fn: () => { S.inv.berries--; giveBuff('fed', 90); sfx.pickup(); say('Sweet and tart.'); } });
  return out; }
function take(i, what) { const p = map.props[i]; S.used[i] = S.used[i] || { n: 0, day: S.day }; S.used[i].n++; S.used[i].day = S.day; let n = 1; if (what === 'wood') { if (S.tools.hatchet) n++; if (buff('fed') && Math.random() < 0.35) n++; sfx.chop(); buzz(20); shake(0.12); } else sfx.pickup();
  S.inv[what] += n; pop(`+${n} ${({ wood: '🪵', scrap: '🔩', berries: '🫐' })[what]}`, p.x, p.z - 2, '#fff2c0'); if (amtOf(i) <= 0 && p.t === 'tree') say('The tree is bare for now. It will fill out by tomorrow.'); }
function feed(f) { if (!has({ wood: 1 })) { say('You need wood. Gather some from trees.'); return; } pay({ wood: 1 }); const was = f.fuel; f.fuel = Math.min(100, f.fuel + TUNE.fireFeed); f.flare = 1; sfx.whoosh(); buzz(30); shake(0.15); burst(f, 30); say(was > 0 ? 'The fire roars happily.' : 'You coax the fire back to life.', 'good'); }
function feedNearest() { const f = nearFire(); if (f) feed(f); }
function doAction() { initAudio(); if (task) return; const a = contextActions().find(a => !a.locked) || contextActions()[0]; if (!a) { say('Nothing to do here. Explore, gather wood, or build (B).'); return; } if (a.cost && !has(a.cost)) { say(`Need ${costStr(a.cost)}.`); sfx.ui(); return; } if (a.cost) pay(a.cost); a.fn(); save(); }
function build(id) { closeBuild(); const r = RECIPES.find(q => q.id === id); if (!r) return; if (S.tier < r.req) { say(`Unlocks at tier ${r.req}. ${nextGoal()}`); return; } if (!has(r.cost)) { say(`Need ${costStr(r.cost)}.`); sfx.ui(); return; }
  if (r.kind === 'tool') { if (S.tools[id]) { say('You already have one.'); return; } pay(r.cost); S.tools[id] = 1; sfx.hammer(); shake(0.2); buzz([30, 50, 30]); pop('🪓 Hatchet!', S.px, S.pz - 2.6, '#ffd890'); say('A sturdy hatchet: 2 wood per chop.', 'good'); save(); return; }
  const a = S.dir * Math.PI / 4, x = S.px + Math.cos(a) * 2.2, z = S.pz + Math.sin(a) * 2.2;
  if (blocked(x, z) || blocked(x + 1, z) || blocked(x - 1, z) || S.fires.some(f => dist(f.x, f.z, x, z) < 2.5) || S.shelters.some(q => dist(q.x, q.z, x, z) < 3.2)) { say('Not enough room there. Try another spot.'); return; } pay(r.cost); // atomic: placement checked before spending
  if (r.kind === 'fire') { S.fires.push({ x, z, fuel: 35, flare: 1 }); say('You stack a ring of stones and kindle a fire.', 'good'); sfx.whoosh(); }
  else { const s = { id: 'b' + Date.now(), type: id, x, z, lvl: 1, ransacked: false }; S.shelters.push(s); bounce(s); sfx.hammer(); say(`A snug ${nameOf(s)}. You can sleep here safely.`, 'good'); raiseTier(r.tier); }
  shake(0.3); buzz([30, 50, 30]); save(); }
function trySleep() { const s = nearShelter(); if (s && usable(s)) sleep(s); else say(s ? 'Fix it up before sleeping here.' : 'Find or build a shelter to sleep in.'); }
let fade = 0, fadeCb = null;
function sleep(s) { if (fade) return; sfx.sleep(); buzz([60, 100, 60]); fade = 0.01; fadeCb = () => { if (S.t >= 18 * 60) S.day++; S.t = 7 * 60; const tr = tierOf(s); giveBuff('rested', 300 + tr * 90); S.restTier = tr; S.stats.nights++; for (const f of S.fires) f.fuel = Math.max(0, f.fuel - 40);
  nightRansack(s); preds.length = 0; for (const k in S.used) if (S.used[k].day < S.day) delete S.used[k]; save(); say(`You sleep soundly in the ${nameOf(s)}. Safe and sound. Game saved. Good morning!`, 'good'); }; }
function nightRansack(except) { for (const s of S.shelters) { if (s === except || !usable(s)) continue; if (dist(s.x, s.z, S.px, S.pz) < TUNE.awayDist) continue; if (Math.random() < TUNE.ransackChance) ransack(s); } }
function ransack(s, pk) { pk = pk || pickPredator(map.regionAt(s.x, s.z)); s.ransacked = true; s.by = pk.id; S.stats.ransacks++; s.unseen = true; }
function pickPredator(reg) { const ws = PREDATORS.map(p => p.weight[reg] ?? p.weight.default); let r = Math.random() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) <= 0) return PREDATORS[i]; return PREDATORS[0]; }
// ---------- juice: pops, bounces ----------
const pops = []; function pop(text, x, z, col = '#fff') { pops.push({ text, x, z, t: 0, col }); }
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }; const easeOut = t => 1 - Math.pow(1 - t, 3);
function bounce(s) { s.born = performance.now(); }
// ---------- build menu / pause ----------
function renderBuild() { $('#buildList').innerHTML = RECIPES.map(r => { const lock = S.tier < r.req, own = r.kind === 'tool' && S.tools[r.id]; return `<button data-build="${r.id}" ${lock || own ? 'class="locked"' : ''}>${r.icon} ${r.name} · ${costStr(r.cost)}${lock ? ` <i>🔒 tier ${r.req}</i>` : own ? ' <i>✓ owned</i>' : ''}</button>`; }).join('');
  document.querySelectorAll('[data-build]').forEach(b => b.onclick = () => build(b.dataset.build)); }
function toggleBuild() { const m = $('#buildMenu'); if (m.classList.contains('hidden')) { renderBuild(); m.classList.remove('hidden'); focusFirst('#buildList'); } else m.classList.add('hidden'); sfx.ui(); } function closeBuild() { $('#buildMenu').classList.add('hidden'); cvs.focus?.(); }
function togglePause(on) { if (on && top() === 'game') { screens.push('pause'); save(); } else if (!on && top() === 'pause') screens.pop(); else return; $('#pause').classList.toggle('hidden', top() !== 'pause'); keys.clear(); if (top() === 'pause') focusFirst('#pause'); sfx.ui(); }
// ---------- predators (night only, never lethal) ----------
const preds = []; let howlT = 0;
function updPreds(dt) { const night = isNight();
  if (night && preds.length < TUNE.maxPredators && Math.random() < dt * 0.25) { const a = Math.random() * 6.283, d = 18 + Math.random() * 10, x = S.px + Math.cos(a) * d, z = S.pz + Math.sin(a) * d; if (!blocked(x, z)) { const k = pickPredator(map.regionAt(x, z)); preds.push({ k, x, z, a: Math.random() * 6.28, f: 0, leave: false, alpha: 0 }); } }
  if (night && (howlT -= dt) < 0) { howlT = 25 + Math.random() * 30; const p = preds[0]; if (p) sfx[p.k.sound](); }
  for (let i = preds.length - 1; i >= 0; i--) { const p = preds[i]; p.f += dt * 8; if (!night) p.leave = true; p.alpha = Math.min(1, p.alpha + dt * (p.leave ? -0.6 : 0.8)); if (p.leave && p.alpha <= 0) { preds.splice(i, 1); continue; }
    const dP = dist(p.x, p.z, S.px, S.pz), lit = S.fires.some(f => f.fuel > 0 && dist(f.x, f.z, p.x, p.z) < 7 + f.fuel / 25), safe = S.fires.some(f => f.fuel > 0 && dist(f.x, f.z, S.px, S.pz) < 6) || S.shelters.some(s => usable(s) && (insideOf(s) || dist(s.x, s.z, S.px, S.pz) < 3)), keep = buff('toasty') ? 6 : 3.5;
    let tx = Math.cos(p.a), tz = Math.sin(p.a); p.a += (Math.random() - 0.5) * dt * 2;
    if (lit || p.leave) { const f = S.fires.reduce((b, f) => !b || dist(f.x, f.z, p.x, p.z) < dist(b.x, b.z, p.x, p.z) ? f : b, null) || { x: S.px, z: S.pz }; tx = p.x - f.x; tz = p.z - f.z; }
    else if (!safe && dP < 14 && dP > keep) { tx = S.px - p.x; tz = S.pz - p.z; } else if (dP <= keep && !safe) { tx = p.x - S.px; tz = p.z - S.pz; if (!p.warned) { p.warned = true; sfx.growl(); buzz([80, 40, 80]); shake(0.2); say(`A ${p.k.name} sniffs at you, then backs off. Best get to a fire or shelter.`, 'warn'); } }
    const L = Math.hypot(tx, tz) || 1, sp = p.k.speed * (lit || p.leave ? 1.3 : 0.6) * dt; const nx = p.x + tx / L * sp, nz = p.z + tz / L * sp; if (!blocked(nx, nz)) { p.x = nx; p.z = nz; } else p.a += 2; p.fx = tx < 0; if (dP > 45) preds.splice(i, 1); } }
// ---------- campfire (hero asset): pixel-grid layered flame + ember/smoke particles ----------
const parts = [];
function burst(f, n) { for (let i = 0; i < n; i++) parts.push({ k: 'ember', x: f.x + (Math.random() - 0.5) * 0.4, z: f.z, y: 0.3, vx: (Math.random() - 0.5) * 1.2, vy: 1.5 + Math.random() * 2.5, life: 1 + Math.random() * 1.2, age: 0, ph: Math.random() * 6 }); }
function updFire(dt) { for (const f of S.fires) { f.flare = Math.max(0, (f.flare || 0) - dt * 0.8); if (f.fuel <= 0) continue; f.fuel = Math.max(0, f.fuel - TUNE.fireBurnPerMin * TUNE.minPerSec * dt); const inten = 0.5 + f.fuel / 200 + f.flare * 0.4; if (Math.abs(f.x - cam.x) > 40 || Math.abs(f.z - cam.z) > 30) continue;
    if (Math.random() < dt * 7 * inten) parts.push({ k: 'ember', x: f.x + (Math.random() - 0.5) * 0.5, z: f.z, y: 0.6, vx: (Math.random() - 0.5) * 0.6, vy: 1 + Math.random() * 1.5, life: 1.5 + Math.random() * 1.5, age: 0, ph: Math.random() * 6 });
    if (Math.random() < dt * 4) parts.push({ k: 'smoke', x: f.x + (Math.random() - 0.5) * 0.3, z: f.z, y: 1.5 + inten * 0.4, vx: 0.15 + Math.random() * 0.2, vy: 0.5 + Math.random() * 0.3, life: 3 + Math.random() * 2, age: 0, s: 2 }); }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'ember') p.vx += Math.sin(p.age * 5 + p.ph) * dt * 1.2; if (p.k === 'smoke') p.s += dt * 3; } }
const FL = A.cv(24, 34), flg = FL.getContext('2d'); const FLPAL = [[122, 30, 16], [200, 58, 22], [246, 122, 30], [255, 196, 70], [255, 244, 196]];
function flameFrame(f, now) { // 3 layered bands (outer red, mid orange, core yellow-white), animated at 12 fps on the pixel grid
  const step = Math.floor(now / 83), key = step + ':' + Math.round(f.fuel / 10) + ':' + (f.flare > 0.1); if (f._fk === key && f._fc) return f._fc; f._fk = key;
  const inten = Math.min(1.25, 0.55 + f.fuel / 160 + (f.flare || 0) * 0.35), H = 34, id = flg.createImageData(24, H), d = id.data, t = step * 0.083, seed = (f.x * 7 + f.z * 3) | 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < 24; x++) { const up = (H - 1 - y) / (H * 0.78 * inten), cx = (x + 0.5 - 12) / 12; if (up > 1.15) continue;
    const width = (1 - up) * 0.95 + 0.08, n1 = A.vnoise(x * 0.42, y * 0.24 + t * 7.5, seed), n2 = A.vnoise(x * 0.9 + 9, y * 0.5 + t * 12, seed + 3);
    let v = (1 - Math.abs(cx + Math.sin(up * 4 + t * 5) * 0.12 * up) / width) * (1 - up * 0.55) + (n1 - 0.5) * 0.7 + (n2 - 0.5) * 0.25 - up * 0.25; if (v <= 0.08) continue;
    const b = v > 0.78 ? 4 : v > 0.56 ? 3 : v > 0.34 ? 2 : v > 0.18 ? 1 : 0; const o = (y * 24 + x) * 4, c = FLPAL[b]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = b === 0 ? 170 : 255; }
  if (!f._fc) f._fc = A.cv(24, H); const fc = f._fc.getContext('2d'); fc.putImageData(id, 0, 0); return f._fc; }
// ---------- update ----------
let stepT = 0, lastT = performance.now(), dirName = 'south', moving = false, animF = 0, wasInside = null;
function update(dt) {
  const prevNight = isNight(); const dmin = TUNE.minPerSec * dt; S.t += dmin; if (S.t >= 1440) { S.t -= 1440; S.day++; }
  if (!prevNight && isNight()) { say('The sun sets. Predators roam at night: stay by a fire or sleep in a shelter.', 'warn'); for (const s of S.shelters) if (usable(s) && dist(s.x, s.z, S.px, S.pz) > TUNE.awayDist && Math.random() < TUNE.ransackChance * 0.5) ransack(s); }
  if (prevNight && !isNight()) say('Dawn breaks over the island.');
  for (const k in S.buffs) { if (S.buffs[k] > 0) { S.buffs[k] -= dmin; if (S.buffs[k] <= 0) { S.buffs[k] = 0; say(`${BUFFS[k].icon} ${BUFFS[k].name} has worn off. No worries.`); } } }
  // movement
  let mx = 0, mz = 0; if (keys.has('w') || keys.has('arrowup')) mz--; if (keys.has('s') || keys.has('arrowdown')) mz++; if (keys.has('a') || keys.has('arrowleft')) mx--; if (keys.has('d') || keys.has('arrowright')) mx++;
  if (joy.id != null && Math.hypot(joy.dx, joy.dy) > 0.2) { mx = joy.dx; mz = joy.dy; }
  if (mx || mz) target = null; if (target) { mx = target.x - S.px; mz = target.z - S.pz; if (Math.hypot(mx, mz) < 0.3) { target = null; mx = mz = 0; } }
  const L = Math.hypot(mx, mz); moving = L > 0.01 && !fade;
  if (moving) { const bonus = 1 + (buff('refreshed') ? 0.1 : 0) + (buff('rested') ? 0.05 + 0.025 * (S.restTier || 1) : 0), sp = 4.2 * bonus * dt * Math.min(1, L) / L; const nx = S.px + mx * sp, nz = S.pz + mz * sp;
    if (!blocked(nx, S.pz)) S.px = nx; if (!blocked(S.px, nz)) S.pz = nz; S.dir = ((Math.round(Math.atan2(mz, mx) / (Math.PI / 4)) % 8) + 8) % 8; dirName = DIRS[S.dir]; animF += dt * 10;
    if ((stepT -= dt) < 0) { stepT = 0.32; const t = map.T[(S.pz | 0) * map.W + (S.px | 0)]; sfx.step(inside ? 'wood' : t === TILE.SAND ? 'sand' : t === TILE.PATH ? 'path' : 'grass'); } }
  const ins = S.shelters.find(insideOf) || null; if (ins !== wasInside) { if (ins) { sfx.door(); say(`You step inside the ${nameOf(ins)}.`); } wasInside = ins; } inside = !!ins;
  const fireN = nearFire(6); if (fireN && fireN.fuel > 0) giveBuff('toasty');
  updTask(dt);
  if (S.boil > 0) { const f = nearFire(3); if (f && f.fuel > 0 && S.inv.jug === 'raw') { S.boil += dt; if (Math.random() < dt * 2) sfx.bubble(); if (S.boil >= TUNE.boilSecs) { S.boil = 0; S.inv.jug = 'clean'; buzz([40, 40, 40]); pop('♨ boiled!', f.x, f.z - 2.4, '#bfe8ff'); say('The water is boiled and safe. Drink when you like.', 'good'); save(); } } else if (!f) { S.boil = 0; say('You take the jug off the fire.'); } }
  for (const s of S.shelters) if (s.unseen && dist(s.x, s.z, S.px, S.pz) < 10) { s.unseen = false; const pk = PREDATORS.find(p => p.id === s.by) || PREDATORS[0]; say(`Looks like ${pk.plural} poked around your ${nameOf(s)} while you were away. A quick repair will set it right.`, 'warn'); buzz([60, 40, 60]); }
  updPreds(dt); updFire(dt);
  for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.4) pops.splice(i, 1); }
  const fd = S.fires.filter(f => f.fuel > 0).reduce((m, f) => Math.min(m, dist(f.x, f.z, S.px, S.pz)), 99); ambience(Math.max(0, 1 - fd / 12), darkness());
  const k = Math.min(1, dt * 5); if (moving) { cam.panX *= 1 - k; cam.panZ *= 1 - k; } cam.x += (S.px + cam.panX - cam.x) * k * 1.5; cam.z += (S.pz - 0.6 + cam.panZ - cam.z) * k * 1.5;
  if (fade) { fade += dt * 0.7; if (fade > 1 && fadeCb) { fadeCb(); fadeCb = null; } if (fade > 2) fade = 0; }
  if ((autosave -= dt) < 0) { autosave = 10; save(); }
}
let autosave = 10, inside = false;
// ---------- render ----------
const light = A.cv(4, 4), lg = light.getContext('2d');
function draw(now) { const s = T * cam.zoom; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#1a4a7a'; ctx.fillRect(0, 0, VW, VH);
  // camera trauma shake: smooth sine-noise offset, decays; never moves the player body
  cam.trauma = Math.max(0, cam.trauma - 1 / 60 * 1.6); const tr = cam.trauma * cam.trauma, tt0 = now / 1000; const shX = tr * 8 * (Math.sin(tt0 * 37) + Math.sin(tt0 * 23 + 1)) * 0.5, shY = tr * 8 * (Math.sin(tt0 * 31 + 2) + Math.sin(tt0 * 19)) * 0.5;
  const cx0 = cam.x + shX / s, cz0 = cam.z + shY / s;
  const wx0 = cx0 - VW / 2 / s, wz0 = cz0 - VH / 2 / s, wx1 = cx0 + VW / 2 / s, wz1 = cz0 + VH / 2 / s; const SX = x => Math.round((x - cx0) * s + VW / 2), SY = z => Math.round((z - cz0) * s + VH / 2);
  for (let cz = Math.floor(wz0 / CH); cz <= Math.floor(wz1 / CH); cz++) for (let cx = Math.floor(wx0 / CH); cx <= Math.floor(wx1 / CH); cx++) { if (cx < 0 || cz < 0 || cx * CH >= map.W || cz * CH >= map.D) continue; ctx.drawImage(chunk(cx, cz), SX(cx * CH), SY(cz * CH), Math.ceil(CH * s) + 1, Math.ceil(CH * s) + 1); }
  const tt = now / 1000; ctx.fillStyle = 'rgba(220,240,255,.35)'; for (let z = Math.floor(wz0); z <= wz1; z += 1) for (let x = Math.floor(wx0); x <= wx1; x += 1) { if (!map.isWater(x, z)) continue; const h = A.hash(x, z, 11); if (h < 0.2) { const ph = (tt * 0.6 + h * 20) % 3; if (ph < 1) ctx.fillRect(SX(x + h * 4 % 1), SY(z + 0.5 + Math.sin(tt + h * 9) * 0.1), Math.max(2, s * 0.25 * ph), Math.max(1, cam.zoom)); } }
  const L = []; const zoom = cam.zoom; const put = (z, f) => L.push([z, f]);
  const blit = (c, x, z, ax = 0.5, ay = 1, flip, sc = 1) => { const w = c.width * zoom * sc, h = c.height * zoom * (sc === 1 ? 1 : 2 - sc), X = SX(x) - w * ax, Y = SY(z) - h * ay; if (flip) { ctx.save(); ctx.translate(X + w, Y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0, w, h); ctx.restore(); } else ctx.drawImage(c, X, Y, w, h); };
  for (let i = 0; i < map.props.length; i++) { const p = map.props[i]; if (p.x < wx0 - 4 || p.x > wx1 + 4 || p.z < wz0 - 1 || p.z > wz1 + 5) continue; const a = amtOf(i);
    const c = p.t === 'tree' ? (a > 0 ? spr('tree' + p.v + p.pine, () => A.tree(p.v, p.v % 4 === 0 ? 'nut' : 'oak')) : spr('stump', A.stump)) : p.t === 'dead' ? (a > 0 ? spr('dead' + p.v, () => A.deadTree(p.v)) : spr('stump', A.stump)) : p.t === 'berry' ? spr('bush' + (a > 0), () => A.bush(a > 0)) : p.t === 'reed' ? spr('reed' + p.v % 3, () => A.reeds(p.v % 3)) : p.t === 'stone' ? spr('rock' + p.v % 3, () => A.rocks(p.v % 3)) : p.t === 'grass' ? spr('grass' + p.v, () => SP.grass(p.v)) : p.t === 'flower' ? spr('fl' + (i % 3), () => SP.flower(i)) : p.t === 'scrap' ? (a > 0 ? spr('scrap', SP.scrap) : null) : p.t === 'table' ? spr('table', SP.table) : p.t === 'ring' ? spr('ring', SP.ring) : p.t === 'sign' ? spr('sign', SP.sign) : p.t === 'toilet' ? spr('toilet', SP.toilet) : p.t === 'well' ? spr('well', A.well) : null;
    if (c) put(p.z, () => blit(c, p.x, p.z + 0.3)); }
  for (const sh of S.shelters) { const fixed = !!FOOT[sh.type], st = !fixed ? (sh.ransacked ? 2 : 0) : sh.ransacked ? 3 : sh.lvl; const c = spr(sh.type + st, () => sh.type === 'shack' ? SP.shack(st) : sh.type === 'van' ? SP.van(st) : sh.type === 'tarp' ? SP.tarp(st) : SP.leanto(st));
    const age = sh.born ? (now - sh.born) / 450 : 2, sc = age < 1 ? 0.6 + 0.4 * easeOutBack(age) : 1;
    put(fixed ? baseZ(sh) : sh.z, () => { const inn = fixed && insideOf(sh); if (inn) ctx.globalAlpha = 0.5; blit(c, sh.x, fixed ? baseZ(sh) : sh.z + 0.4, 0.5, 1, false, sc); ctx.globalAlpha = 1; }); }
  for (const f of S.fires) put(f.z, () => drawFireBase(f, SX, SY, now));
  for (const p of preds) put(p.z, () => { ctx.globalAlpha = p.alpha; blit(spr(p.k.id + ((p.f | 0) % 4), () => SP.predator(p.k.id, (p.f | 0) % 4, true)), p.x, p.z + 0.3, 0.5, 1, p.fx); ctx.globalAlpha = 1; });
  put(S.pz, () => { const im = moving ? pimg[`walk_${dirName}_${(animF | 0) % 6}`] : pimg['idle_' + dirName]; const h = 2.6 * s; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(SX(S.px), SY(S.pz + 0.15), s * 0.45, s * 0.18, 0, 0, 6.3); ctx.fill(); if (im && im.complete && im.naturalWidth) ctx.drawImage(im, SX(S.px) - h / 2, SY(S.pz + 0.45) - h * 0.92, h, h);
    if (S.inv.jug !== 'empty' && S.boil <= 0) blit(spr('jug' + S.inv.jug, () => SP.jug(S.inv.jug)), S.px + 0.45, S.pz + 0.1, 0.5, 1); });
  L.sort((a, b) => a[0] - b[0]); for (const [, f] of L) f();
  // smoke + embers snapped to the art-pixel grid
  const g16 = v => Math.round(v * 16) / 16; const px1 = Math.max(1, Math.round(zoom));
  for (const p of parts) if (p.k === 'smoke') { const u = p.age / p.life; ctx.fillStyle = `rgba(120,115,110,${0.2 * (1 - u)})`; const r = Math.round(p.s) * zoom; ctx.fillRect(SX(g16(p.x)) - r / 2, SY(p.z) - Math.round(p.y * 16) * zoom - r / 2, r, r); }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) if (p.k === 'ember') { const u = p.age / p.life, fl = Math.sin(p.age * 25 + p.ph) > 0 ? 1 : 0.5; ctx.fillStyle = `rgba(255,${180 - u * 120 | 0},60,${(1 - u) * fl})`; ctx.fillRect(SX(g16(p.x)), SY(p.z) - Math.round(p.y * 16) * zoom, px1, px1); }
  ctx.globalCompositeOperation = 'source-over';
  drawLighting(SX, SY, s, now);
  // floating pops (eased)
  ctx.textAlign = 'center'; for (const p of pops) { const u = p.t / 1.4, rise = easeOut(Math.min(1, u * 1.5)) * 28, sc = u < 0.25 ? easeOutBack(u / 0.25) : 1; ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1; ctx.font = `600 ${Math.round(15 * sc)}px Pixelify, monospace`; ctx.fillStyle = '#1b1410'; ctx.fillText(p.text, SX(p.x) + 1, SY(p.z) - rise + 1); ctx.fillStyle = p.col; ctx.fillText(p.text, SX(p.x), SY(p.z) - rise); ctx.globalAlpha = 1; }
  if (task) { const X = SX(S.px), Y = SY(S.pz) - 2.9 * s; ctx.fillStyle = '#1b1410'; ctx.fillRect(X - 26, Y, 52, 8); ctx.fillStyle = '#ffd890'; ctx.fillRect(X - 25, Y + 1, 50 * easeOut(task.t / task.dur), 6); }
  if (fade) { ctx.fillStyle = `rgba(8,6,16,${fade < 1 ? fade : 2 - fade})`; ctx.fillRect(0, 0, VW, VH); if (fade > 0.6 && fade < 1.4) { ctx.fillStyle = '#ffe8b0'; ctx.font = '28px Pixelify, monospace'; ctx.textAlign = 'center'; ctx.fillText('z z z', VW / 2, VH / 2); } }
}
function drawFireBase(f, SX, SY, now) { const z = cam.zoom, X = SX(f.x), Y = SY(f.z); ctx.drawImage(spr('ring', SP.ring), X - 10 * z, Y - 7 * z, 20 * z, 14 * z);
  const lg2 = spr('logs', () => { const c = A.cv(16, 8), g = c.getContext('2d'); A.R(g, 1, 3, 14, 3, '#6b4224'); A.R(g, 1, 3, 14, 1, '#9a6236'); A.R(g, 4, 1, 3, 6, '#5a3a1e'); A.R(g, 9, 1, 3, 6, '#7a4a28'); A.R(g, 13, 3, 2, 3, '#d8a868'); return A.outline(c, '#20140c'); }); ctx.drawImage(lg2, X - 8 * z, Y - 5 * z, 16 * z, 8 * z);
  if (f.fuel > 0) { const g = (Math.sin(now / 90) + Math.sin(now / 37)) * 0.5; ctx.fillStyle = `rgba(255,${140 + g * 30 | 0},40,.95)`; ctx.fillRect(X - 5 * z, Y - 2 * z, 10 * z, 2 * z); ctx.fillStyle = '#fff0b0'; ctx.fillRect(X - 2 * z, Y - 2 * z, 4 * z, z);
    const fc = flameFrame(f, now); ctx.drawImage(fc, X - 12 * z, Y - 2 * z - fc.height * z, 24 * z, fc.height * z); }
  else { ctx.fillStyle = 'rgba(255,90,30,.5)'; ctx.fillRect(X - 2 * z, Y - 2 * z, 2 * z, z); }
  if (S.boil > 0 && dist(f.x, f.z, S.px, S.pz) < 3) { A.R(ctx, X - 9 * z, Y - 26 * z, z, 24 * z, '#3a2312'); A.R(ctx, X + 8 * z, Y - 26 * z, z, 24 * z, '#3a2312'); A.R(ctx, X - 9 * z, Y - 26 * z, 18 * z, z, '#5e3a1f'); ctx.drawImage(spr('jugraw', () => SP.jug('raw')), X - 6 * z, Y - 25 * z, 12 * z, 14 * z); } }
function drawLighting(SX, SY, s, now) { const d = darkness(); const dusk = Math.max(0, 1 - Math.abs(hour() - 19.2) / 1.6) + Math.max(0, 1 - Math.abs(hour() - 6.3) / 1.3);
  if (dusk > 0) { ctx.fillStyle = `rgba(255,120,60,${dusk * 0.18})`; ctx.fillRect(0, 0, VW, VH); }
  if (d <= 0.01) return; const q = 4, w = Math.ceil(VW / q), h = Math.ceil(VH / q); if (light.width !== w || light.height !== h) { light.width = w; light.height = h; }
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, w, h); lg.fillStyle = `rgba(10,14,40,${0.82 * d})`; lg.fillRect(0, 0, w, h); lg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const g = lg.createRadialGradient(x / q, y / q, 0, x / q, y / q, r / q); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.35, `rgba(0,0,0,${a * 0.8})`); g.addColorStop(0.7, `rgba(0,0,0,${a * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = g; lg.fillRect(0, 0, w, h); };
  const flick = settings.flash ? (Math.sin(now / 70) + Math.sin(now / 23) * 0.5) * 0.04 : 0; hole(SX(S.px), SY(S.pz) - s, s * 3.2, 0.55);
  for (const f of S.fires) if (f.fuel > 0) hole(SX(f.x), SY(f.z) - s * 0.4, s * (4.5 + f.fuel / 40 + (f.flare || 0) * 1.5) * (1 + flick), 0.92);
  for (const sh of S.shelters) if (usable(sh)) hole(SX(sh.x), SY(sh.z) - s, s * (FOOT[sh.type] ? 3.5 : 2.2), 0.6);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(light, 0, 0, VW, VH); ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter'; for (const f of S.fires) if (f.fuel > 0) { const X = SX(f.x), Y = SY(f.z) - s * 0.4, r = s * (3.5 + f.fuel / 40 + (f.flare || 0)) * (1 + flick * 2); const g = ctx.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(255,150,60,${0.35 * d + 0.08})`); g.addColorStop(0.4, `rgba(255,100,30,${0.15 * d})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = 'source-over';
  if (d > 0.5) { ctx.fillStyle = `rgba(255,255,230,${(d - 0.5) * 0.6})`; for (let i = 0; i < 40; i++) { const x = A.hash(i, 1, 3) * VW, y = A.hash(i, 2, 3) * VH * 0.25; if (!settings.flash || Math.sin(now / 400 + i) > -0.3) ctx.fillRect(x | 0, y | 0, 2, 2); } } }
// ---------- HUD (refreshed on a light 150 ms tick, only touching changed text) ----------
let hudT = 0; const setTxt = (el, v) => { if (el._v !== v) { el._v = v; el.innerHTML = v; } };
function hud() { setTxt($('#clock'), (isNight() ? '🌙 ' : '☀️ ') + clockStr()); setTxt($('#region'), '📍 ' + map.regionAt(S.px, S.pz) + (inside ? ' · indoors' : ''));
  setTxt($('#buffs'), Object.entries(BUFFS).filter(([k]) => buff(k)).map(([k, b]) => `<span class="chip" title="${b.desc}">${b.icon} ${b.name} <i>${Math.ceil(S.buffs[k] / 60)}h</i></span>`).join('') || '<span class="dim">No buffs right now, and that\'s fine.</span>');
  setTxt($('#tier'), `🏠 Tier ${S.tier}: ${TIERS[S.tier]}<br><span class="dim">${nextGoal()}</span>`);
  setTxt($('#inv'), `<span>🪵 ${S.inv.wood}</span><span>🔩 ${S.inv.scrap}</span><span>🫐 ${S.inv.berries}</span>${S.tools.hatchet ? '<span>🪓</span>' : ''}<span>🫙 ${({ empty: 'empty jug', raw: 'unboiled water', clean: 'clean water' })[S.inv.jug]}</span>`);
  const acts = contextActions(); const a = acts.find(q => !q.locked) || acts[0]; $('#prompt').classList.toggle('hidden', !a); if (a) setTxt($('#prompt'), `<b>${matchMedia('(pointer:coarse)').matches ? 'Ⓐ' : 'E'}</b> ${a.label}${a.cost && !has(a.cost) ? ' <i>(need materials)</i>' : ''}`);
  setTxt($('#btnA'), a ? a.label.split(/[ (…]/)[0] : 'Act');
  setTxt($('#fireInfo'), S.fires.map(f => Math.round(f.fuel)).join(' / '));
  setTxt($('#shelterList'), S.shelters.map(s => `<div>${s.ransacked ? '🔧' : usable(s) ? '🏠' : '🪚'} ${nameOf(s)} <i>${s.ransacked ? 'needs a repair' : usable(s) ? (tierOf(s) >= 4 ? 'upgraded' : 'safe') : 'needs work'}</i> · ${Math.round(dist(s.x, s.z, S.px, S.pz))}m</div>`).join(''));
  if (!$('#mini').classList.contains('collapsed')) drawMini(); }
let miniBase = null; function drawMini() { const c = $('#miniC'), g = c.getContext('2d'); if (!miniBase) { miniBase = A.cv(128, 128); const mg = miniBase.getContext('2d'), id = mg.createImageData(128, 128); for (let z = 0; z < 128; z++) for (let x = 0; x < 128; x++) { const t = map.T[(z * 4) * map.W + x * 4]; const col = A.hex(PAL[t][1]); const o = (z * 128 + x) * 4; id.data.set([...col, 255], o); } mg.putImageData(id, 0, 0); }
  g.drawImage(miniBase, 0, 0); const P = (x, z, col, r = 2) => { g.fillStyle = col; g.fillRect(x / 4 - r, z / 4 - r, r * 2, r * 2); };
  for (const s of S.shelters) P(s.x, s.z, s.ransacked ? '#f44' : '#fd6'); for (const f of S.fires) P(f.x, f.z, '#f80', 1.5); P(map.places.well.x, map.places.well.z, '#6cf', 1.5); P(map.places.camp.x, map.places.camp.z, '#9f9', 1.5); P(S.px, S.pz, '#fff', 2); }
// ---------- loop ----------
function frame(now) { const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; if (top() === 'game') update(dt); else if (top() === 'title' && S) updFire(dt); if (map) draw(now); if (screens.includes('game') && (hudT -= dt) < 0) { hudT = 0.15; hud(); } requestAnimationFrame(frame); }
// ---------- menus & settings ----------
function start(fresh) { initAudio(); const sv = !fresh && load(); S = sv && sv.v === 2 ? sv : newState(); if (fresh || !sv) save(); cam.x = S.px; cam.z = S.pz; screens.length = 0; screens.push('game'); $('#title').classList.add('hidden'); $('#ui').classList.remove('hidden'); dirName = DIRS[S.dir] || 'south'; document.activeElement?.blur();
  say(fresh || !sv ? 'Welcome to Pinecrest. No rush: gather wood, fetch water, make camp.' : 'Welcome back.', 'good'); say(nextGoal()); sfx.ui(); }
$('#btnPlay').onclick = () => start(false); $('#btnNew').onclick = () => { if (!load() || confirm('Start a new game? Your current camp will be replaced.')) start(true); };
$('#btnHow').onclick = () => $('#how').classList.toggle('hidden');
function syncSettings() { snd.on = settings.sound; haptics.on = settings.vibrate; document.documentElement.classList.toggle('bigtext', settings.bigText);
  document.querySelectorAll('[data-set]').forEach(b => { const k = b.dataset.set; b.classList.toggle('on', !!settings[k]); b.setAttribute('aria-pressed', !!settings[k]); });
  for (const k of ['master', 'sfx', 'amb']) { const el = $('#vol-' + k); if (el) el.value = vols[k]; } applyVols(); }
document.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { settings[b.dataset.set] = !settings[b.dataset.set]; syncSettings(); saveSettings(); sfx.ui(); });
for (const k of ['master', 'sfx', 'amb']) $('#vol-' + k).oninput = e => { vols[k] = +e.target.value; applyVols(); saveSettings(); };
$('#btnPause').onclick = () => togglePause(true); $('#btnResume').onclick = () => togglePause(false);
$('#btnQuit').onclick = () => { save(); screens.length = 0; screens.push('title'); $('#pause').classList.add('hidden'); $('#ui').classList.add('hidden'); $('#title').classList.remove('hidden'); $('#btnPlay').textContent = '▶ Continue'; focusFirst('#title .menu'); };
$('#btnA').onclick = doAction; $('#btnBuild').onclick = toggleBuild; $('#btnSleep').onclick = trySleep; $('#btnFeed').onclick = feedNearest; $('#btnCloseBuild').onclick = closeBuild;
$('#hideAll').onclick = () => $('#ui').classList.toggle('hideall');
document.querySelectorAll('.panel').forEach(p => p.querySelector('.hdr').onclick = () => { p.classList.toggle('collapsed'); sfx.ui(); });
$('#btnFull').onclick = async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape').catch(() => {}); } else await document.exitFullscreen(); } catch {} };
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
// ---------- boot ----------
{ const sv = JSON.parse(localStorage.getItem(SET_KEY) || '{}'); if (sv.vols) Object.assign(vols, sv.vols); }
resize(); map = loadMap(SEED); const sv0 = load(); S = sv0 && sv0.v === 2 ? sv0 : newState(); $('#btnPlay').textContent = sv0 && sv0.v === 2 ? '▶ Continue' : '▶ Play'; cam.x = map.places.camp.x + 1; cam.z = map.places.camp.z + 7; if (!(sv0 && sv0.v === 2)) S.t = 20.5 * 60;
syncSettings(); requestAnimationFrame(frame); $('#loading').remove(); if (matchMedia('(pointer:coarse)').matches) $('#bag').classList.add('collapsed'); focusFirst('#title .menu');
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__CW_SINGLE) navigator.serviceWorker.register('sw.js').catch(() => {});
window.CW = { get S() { return S; }, map, preds, parts, cam, pops, settings, darkness, isNight, contextActions, doAction, build, sleep, ransack: s => ransack(s), nearShelter, usable, insideOf, blocked, start, get task() { return task; }, setTime: m => { S.t = m; }, tp: (x, z) => { S.px = x; S.pz = z; cam.x = x; cam.z = z - 0.6; }, get dir() { return dirName; }, get moving() { return moving; }, get inside() { return inside; } };
