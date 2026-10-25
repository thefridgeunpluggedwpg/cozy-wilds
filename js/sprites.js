// Cozy Wilds — procedural 32-bit-style pixel sprites (palettes with highlights, shading and dark outlines)
import { cv, R, blob, outline, hash, LEAF, ROCK } from './art.js';
const WOOD = ['#3a2312', '#5e3a1f', '#7a4a28', '#9a6236', '#b8804a', '#d8a868'];
const plank = (g, x, y, w, h, v = 0, broken = 0) => { for (let i = 0; i < w; i++) { const s = hash(i, v, 9); if (broken && s < broken) continue; const c = WOOD[2 + ((s * 3) | 0)]; R(g, x + i, y, 1, h, c); if (i % 4 === 0) R(g, x + i, y, 1, h, WOOD[1]); } R(g, x, y, w, 1, WOOD[5]); };
const NEED = ['#173a1e', '#1f4d26', '#2b6430', '#3a7d3a', '#52984a', '#74b25a'];
export function leanto(st) { // st: 0 good, 2 ransacked. Spruce-bough lean-to on forked posts, bedroll, lantern.
  const c = cv(50, 40), g = c.getContext('2d'); R(g, 3, 35, 44, 4, 'rgba(0,0,0,.28)');
  // back ground litter + bedroll inside
  R(g, 8, 28, 34, 8, '#4a3626'); for (let i = 0; i < 30; i++) R(g, 8 + hash(i, 1) * 34 | 0, 28 + hash(i, 2) * 8 | 0, 1, 1, ['#6a4e32', '#3a2a1c', '#8a6a42'][i % 3]);
  if (st !== 2) { R(g, 13, 29, 22, 6, '#7a3a2e'); R(g, 13, 29, 22, 1, '#a85a44'); for (let x = 15; x < 35; x += 4) R(g, x, 30, 1, 5, '#5a2a22'); R(g, 13, 29, 6, 6, '#c8b898'); R(g, 13, 29, 6, 1, '#e8dcc0'); }
  else { R(g, 14, 31, 9, 3, '#7a3a2e'); R(g, 26, 33, 7, 2, '#a85a44'); R(g, 30, 29, 3, 2, '#c8b898'); }
  // forked posts + ridge pole
  for (const x of [5, 42]) { R(g, x, 9, 3, 27, '#5e3a1f'); R(g, x, 9, 1, 27, '#8a5a32'); R(g, x - 1, 7, 2, 3, '#5e3a1f'); R(g, x + 2, 7, 2, 3, '#5e3a1f'); }
  R(g, 3, 8, 44, 3, '#7a4a28'); R(g, 3, 8, 44, 1, '#b8804a'); R(g, 46, 8, 2, 3, '#d8a868');
  // slanted roof poles + layered boughs, front-facing slope (top at ridge, eaves low at back)
  const miss = i => st === 2 && hash(i, 7) < 0.45;
  for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) { if (miss(row * 9 + i)) continue; const x = 4 + i * 5 + (row % 2) * 2, y = 11 + row * 3; blob(g, x, y, 3.6, 2.4, NEED, row * 9 + i, 0.35); for (let k = 0; k < 4; k++) R(g, x - 3 + k * 2, y + 1 + (k % 2), 1, 1, NEED[(k + row) % 2]); }
  for (let i = 0; i < 14; i++) if (!miss(i + 50)) R(g, 5 + i * 3, 11, 1, 1, NEED[5]);
  // lantern on post
  R(g, 39, 14, 3, 4, st === 2 ? '#3a3a40' : '#ffd070'); R(g, 39, 13, 3, 1, '#2a2a30'); if (st !== 2) R(g, 40, 15, 1, 2, '#fff4c0');
  // stones & kindling
  blob(g, 4, 34, 2.5, 2, ROCK, 1, 0.1); blob(g, 46, 35, 2.2, 1.8, ROCK, 2, 0.1); R(g, 36, 33, 6, 1, '#8a5a32'); R(g, 37, 32, 5, 1, '#9a6236');
  if (st === 2) { for (const [x, y] of [[20, 37], [26, 36], [31, 38]]) { R(g, x, y, 2, 1, '#2a1a10'); R(g, x - 1, y - 1, 1, 1, '#2a1a10'); R(g, x + 2, y - 1, 1, 1, '#2a1a10'); } blob(g, 40, 30, 3, 2, NEED, 3, .4); blob(g, 10, 33, 3, 2, NEED, 4, .4); }
  return outline(c); }
export function tarp(st) { const c = cv(52, 40), g = c.getContext('2d'); R(g, 3, 35, 46, 4, 'rgba(0,0,0,.28)');
  R(g, 8, 26, 36, 10, '#4a3626'); if (st !== 2) { R(g, 12, 27, 12, 7, '#3a5a8a'); R(g, 12, 27, 12, 1, '#5a7aaa'); R(g, 27, 28, 12, 6, '#7a3a2e'); R(g, 27, 28, 12, 1, '#a85a44'); }
  for (const x of [4, 45]) { R(g, x, 6, 3, 30, '#5e3a1f'); R(g, x, 6, 1, 30, '#8a5a32'); }
  for (let y = 0; y < 20; y++) { const torn = st === 2 && y > 8 && y < 14; for (let x = 4; x < 48; x++) { if (torn && x > 20 && x < 30) continue; const sag = Math.round(Math.sin((x - 4) / 44 * Math.PI) * 2); R(g, x, 6 + y + sag, 1, 1, ['#2e6a8a', '#3a7aa0', '#4a8ab4', '#5aa0c8'][((x >> 3) + (y >> 2)) % 4]); } }
  for (let x = 4; x < 48; x += 6) R(g, x, 26, 2, 1, '#2a4a60'); R(g, 4, 6, 44, 1, '#8ac0e0');
  for (const [x, y] of [[2, 37], [49, 37]]) { R(g, x, y - 4, 1, 4, '#8a8a90'); } R(g, 3, 8, 1, 26, '#c8b898'); R(g, 47, 8, 1, 26, '#c8b898');
  return outline(c); }
export function shack(st) { // 0 derelict,1 repaired,2 fortified,3 ransacked
  const c = cv(64, 58), g = c.getContext('2d'); R(g, 4, 52, 58, 5, 'rgba(0,0,0,.28)');
  for (let y = 22; y < 54; y++) plank(g, 6, y, 52, 1, y >> 2, st === 0 || st === 3 ? 0.12 : 0);
  for (let y = 22; y < 54; y += 4) R(g, 6, y, 52, 1, WOOD[1]);
  // roof
  for (let y = 0; y < 22; y++) { const w = 30 + y * 1.6, x = 32 - w / 2; for (let i = 0; i < w; i++) { if ((st === 0 || st === 3) && hash(i, y, 5) < 0.08 + (y < 6 ? .2 : 0)) continue; R(g, x + i, y + 4, 1, 1, ['#4a3a36', '#5e4a44', '#74605a', '#8a766e'][((i >> 2) + y) % 4]); } }
  R(g, 4, 24, 56, 2, '#3a2a26'); R(g, 26, 34, 12, 20, st === 0 ? '#1a120c' : WOOD[1]); if (st) { plank(g, 27, 35, 10, 18, 3); R(g, 35, 44, 1, 2, '#e0c060'); }
  R(g, 10, 30, 10, 9, st === 1 || st === 2 ? '#f0c46a' : '#1a1820'); R(g, 14, 30, 2, 9, WOOD[1]); R(g, 10, 34, 10, 1, WOOD[1]); R(g, 44, 30, 10, 9, st ? '#2a3a44' : '#1a1820');
  if (st === 2) { for (const x of [8, 46]) { R(g, x, 29, 14, 2, WOOD[4]); R(g, x, 37, 14, 2, WOOD[4]); } R(g, 2, 46, 60, 3, WOOD[3]); for (let i = 0; i < 8; i++) R(g, 2 + i * 8, 40, 3, 12, WOOD[2]); }
  if (st === 0 || st === 3) { R(g, 44, 30, 10, 1, '#c0d0d8'); R(g, 48, 33, 3, 3, '#c0d0d8'); }
  if (st === 3) { R(g, 18, 53, 5, 2, '#d8d0c0'); R(g, 40, 54, 6, 2, WOOD[3]); R(g, 30, 52, 3, 3, '#c04030'); }
  R(g, 46, 0, 6, 12, '#6a5048'); R(g, 46, 0, 6, 2, '#8a706a'); return outline(c);
}
export function van(st) { // 0 broken,1 repaired,2 upgraded,3 ransacked
  const c = cv(72, 40), g = c.getContext('2d'); R(g, 4, 34, 66, 5, 'rgba(0,0,0,.3)');
  const body = st === 2 ? ['#2e6e6a', '#3e8e86', '#5ab0a2', '#8ed0c0'] : ['#8a7a5a', '#b0a070', '#d0c08a', '#ece0b0'];
  R(g, 4, 10, 64, 22, body[1]); R(g, 4, 10, 64, 3, body[3]); R(g, 4, 20, 64, 2, '#e8e4dc'); R(g, 4, 28, 64, 4, body[0]); R(g, 8, 4, 46, 7, body[2]); R(g, 8, 4, 46, 1, body[3]);
  R(g, 56, 12, 10, 8, '#3a5060'); R(g, 57, 13, 4, 3, '#8ab0c0'); R(g, 36, 12, 9, 17, body[0]); R(g, 37, 13, 7, 15, body[2]); R(g, 37, 13, 7, 5, st ? '#e8b860' : '#2a3038'); R(g, 42, 21, 2, 1, '#e8e4dc'); for (const x of [10, 23]) { R(g, x, 13, 10, 6, st ? '#f0c46a' : '#2a3038'); R(g, x, 13, 10, 1, '#1a1a20'); if (st) { R(g, x + 1, 14, 3, 2, '#fff0b0'); } }
  if (st === 0 || st === 3) { for (let i = 0; i < 40; i++) { const x = 4 + hash(i, 1) * 64 | 0, y = 10 + hash(i, 2) * 22 | 0; R(g, x, y, 2, 1, '#8a4a22'); } R(g, 23, 13, 10, 6, '#151518'); R(g, 26, 14, 4, 4, '#c0d0d8'); }
  for (const x of [14, 54]) { blob(g, x, 32, 5, 5, ['#101014', '#202228', '#383a42'], x, .02); R(g, x - 1, 31, 3, 3, '#8a8a90'); }
  if (st === 0) { R(g, 50, 33, 9, 4, '#40404a'); }
  if (st === 2) { R(g, 10, 2, 40, 2, '#5a5a60'); R(g, 14, 0, 14, 3, '#2a4a7a'); R(g, 15, 0, 12, 1, '#6a9ad0'); R(g, 0, 22, 4, 10, WOOD[3]); }
  if (st === 3) { R(g, 20, 33, 6, 2, '#d8d0c0'); R(g, 30, 34, 4, 2, '#c04030'); }
  return outline(c);
}
export function tent() { const c = cv(30, 22), g = c.getContext('2d'); R(g, 2, 19, 26, 3, 'rgba(0,0,0,.25)'); for (let y = 0; y < 18; y++) { const w = 4 + y * 1.4; R(g, 15 - w / 2, y + 2, w, 1, y % 4 ? '#c8783a' : '#a85a28'); R(g, 15 - w / 2, y + 2, 2, 1, '#e8a060'); } R(g, 13, 10, 4, 10, '#4a2a18'); return outline(c); }
export function predator(kind, f, moving) {
  const P = { wolf: [['#3a3a42', '#5a5a66', '#8a8a96', '#c0c0c8'], 1], coyote: [['#5a3e22', '#8a6236', '#b88a52', '#e0c08a'], 0.85], bear: [['#2a1a10', '#4a2e1a', '#6a4426', '#8a5e36'], 1.5], raccoon: [['#2a2a30', '#5a5a62', '#8a8a92', '#c8c8cc'], 0.6] }[kind] || [['#444', '#666', '#888', '#aaa'], 1];
  const s = P[1], pal = P[0], wd = Math.round(30 * s) + 4, ht = Math.round(20 * s) + 4, c = cv(wd, ht), g = c.getContext('2d');
  g.save(); g.translate(2, 2); g.scale(s, s); const b = moving ? [0, 1, 0, -1][f % 4] : 0;
  R(g, 2, 17, 24, 2, 'rgba(0,0,0,.25)');
  for (const [lx, ph] of [[6, 0], [9, 2], [18, 1], [21, 3]]) { const o = moving ? [0, 1, 2, 1][(f + ph) % 4] - 1 : 0; R(g, lx + o, 11, 2, 7, pal[0]); }
  blob(g, 14, 9, 9, 4.5, pal, 3, .08); R(g, 7, 10, 14, 2, pal[2]);
  if (kind === 'raccoon') for (let i = 0; i < 4; i++) R(g, 0 + i * 2, 6 + b, 2, 3, i % 2 ? pal[0] : pal[3]); else if (kind !== 'bear') { R(g, 0, 5 + b, 6, 2, pal[1]); R(g, 0, 5 + b, 2, 1, pal[3]); }
  blob(g, 23, 6 + b, 4.5, 3.8, pal, 5, .05); R(g, 26, 7 + b, 3, 2, pal[2]); R(g, 28, 7 + b, 1, 1, '#101010');
  R(g, 21, 1 + b, 2, 3, pal[1]); R(g, 24, 1 + b, 2, 3, pal[1]); if (kind === 'bear') { R(g, 21, 2 + b, 2, 2, pal[0]); R(g, 24, 2 + b, 2, 2, pal[0]); }
  if (kind === 'raccoon') { R(g, 21, 5 + b, 7, 2, '#18181c'); R(g, 23, 5 + b, 1, 1, '#ffe080'); R(g, 26, 5 + b, 1, 1, '#ffe080'); } else R(g, 24, 5 + b, 1, 1, '#ffd040');
  g.restore(); return outline(c);
}
export function table() { const c = cv(30, 20), g = c.getContext('2d'); R(g, 2, 17, 26, 3, 'rgba(0,0,0,.25)'); plank(g, 2, 4, 26, 6, 1); R(g, 2, 9, 26, 1, WOOD[1]); R(g, 0, 12, 30, 2, WOOD[3]); R(g, 5, 10, 2, 8, WOOD[1]); R(g, 23, 10, 2, 8, WOOD[1]); return outline(c); }
export function ring() { const c = cv(20, 14), g = c.getContext('2d'); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; blob(g, 10 + Math.cos(a) * 7, 7 + Math.sin(a) * 4, 2, 1.7, ROCK, i, .05); } R(g, 7, 6, 6, 2, '#2a2420'); return outline(c); }
export function sign() { const c = cv(30, 30), g = c.getContext('2d'); R(g, 6, 14, 2, 15, WOOD[1]); R(g, 22, 14, 2, 15, WOOD[1]); plank(g, 2, 3, 26, 12, 2); R(g, 2, 3, 26, 12, '#5a3a1f'); R(g, 3, 4, 24, 10, '#7a5a32'); for (let i = 0; i < 6; i++) R(g, 6 + i * 3, 7, 2, 4, '#e8d8a8'); blob(g, 26, 26, 4, 3, LEAF, 2, .3); return outline(c); }
export function toilet() { const c = cv(20, 32), g = c.getContext('2d'); plank(g, 2, 6, 16, 25, 4); R(g, 0, 3, 20, 4, '#5e4a44'); R(g, 8, 10, 4, 2, '#1a120c'); R(g, 9, 9, 2, 1, '#f0e080'); return outline(c); }
export function scrap() { const c = cv(18, 12), g = c.getContext('2d'); R(g, 2, 6, 10, 4, '#7a7a82'); R(g, 2, 6, 10, 1, '#b0b0b8'); R(g, 8, 3, 8, 5, '#8a4a22'); R(g, 9, 3, 6, 1, '#c07040'); R(g, 4, 2, 2, 5, '#5a5a62'); return outline(c); }
export function flower(v) { const c = cv(12, 12), g = c.getContext('2d'); const C = [['#e86a8a', '#ffa0b8'], ['#e8c040', '#fff080'], ['#8a7ae8', '#c0b0ff']][v % 3]; R(g, 5, 5, 1, 6, '#3f8a32'); R(g, 3, 8, 2, 1, '#5aa83a'); for (const [x, y] of [[4, 2], [6, 2], [5, 1], [5, 3]]) R(g, x, y, 1, 1, C[0]); R(g, 5, 2, 1, 1, C[1]); return outline(c); }
export function grass(v) { const c = cv(10, 8), g = c.getContext('2d'); const C = ['#2e6b2a', '#3f8a32', '#5aa83a', '#7cc44a']; for (let i = 0; i < 5; i++) { const x = 1 + i * 2, h = 3 + ((hash(i, v) * 4) | 0); R(g, x, 8 - h, 1, h, C[(i + v) % 4]); } return c; }
export function jug(state) { const c = cv(12, 14), g = c.getContext('2d'); const fill = { empty: null, raw: '#6a8a7a', clean: '#6ac0f0' }[state]; R(g, 2, 3, 8, 10, '#c8c0b0'); R(g, 3, 1, 4, 2, '#a8a090'); R(g, 9, 5, 2, 4, '#a8a090'); if (fill) R(g, 3, 6, 6, 6, fill); R(g, 3, 4, 1, 8, '#fff'); return outline(c); }
export function woodIcon() { const c = cv(14, 12), g = c.getContext('2d'); for (const [x, y] of [[1, 6], [5, 6], [3, 2]]) { R(g, x, y, 8, 4, WOOD[2]); R(g, x, y, 8, 1, WOOD[4]); R(g, x + 7, y, 2, 4, WOOD[5]); } return outline(c); }
