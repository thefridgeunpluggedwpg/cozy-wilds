// Cozy Wilds — WebAudio synth. Buses: master <- sfx, ambience, ui. Repeated sounds get pitch/volume variation.
let ac = null, master, sfxB, ambB, uiB, fireGain, nightGain, noiseBuf; export const snd = { on: true };
export const vols = { master: 0.7, sfx: 0.8, amb: 0.8 };
export function initAudio() { if (ac) { ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ac.createGain(); master.connect(ac.destination); sfxB = ac.createGain(); ambB = ac.createGain(); uiB = ac.createGain(); for (const b of [sfxB, ambB, uiB]) b.connect(master); applyVols();
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  fireGain = ac.createGain(); fireGain.gain.value = 0; fireGain.connect(ambB);
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; n.connect(lp).connect(fireGain); n.start();
  nightGain = ac.createGain(); nightGain.gain.value = 0; nightGain.connect(ambB);
  const o = ac.createOscillator(); o.frequency.value = 4400; const am = ac.createGain(); am.gain.value = 0; const lfo = ac.createOscillator(); lfo.frequency.value = 18; const lg = ac.createGain(); lg.gain.value = 0.02; lfo.connect(lg).connect(am.gain); o.connect(am).connect(nightGain); o.start(); lfo.start();
  const w = ac.createBufferSource(); w.buffer = noiseBuf; w.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.6; const wg = ac.createGain(); wg.gain.value = 0.05; w.connect(bp).connect(wg).connect(nightGain); w.start(); }
export function applyVols() { if (!ac) return; master.gain.value = vols.master; sfxB.gain.value = vols.sfx; ambB.gain.value = vols.amb; uiB.gain.value = vols.sfx * 0.8; }
const now = () => ac.currentTime; const vr = (v, k = 0.12) => v * (1 + (Math.random() - 0.5) * 2 * k);
function noise(dur, f, type = 'bandpass', g = 0.3, q = 1, at = 0, bus) { if (!ac || !snd.on) return; const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const e = ac.createGain(); const t = now() + at; e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl).connect(e).connect(bus || sfxB); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
function tone(f, dur, type = 'sine', g = 0.2, at = 0, f2, bus) { if (!ac || !snd.on) return; const o = ac.createOscillator(); o.type = type; const e = ac.createGain(); const t = now() + at; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e).connect(bus || sfxB); o.start(t); o.stop(t + dur + 0.05); }
export const sfx = {
  step(surf) { noise(0.07, vr(surf === 'sand' ? 900 : surf === 'path' ? 1400 : surf === 'wood' ? 500 : 600, 0.2), 'bandpass', vr(0.11, 0.3), 1.5); },
  crackle() { noise(0.03, 2500 + Math.random() * 2000, 'highpass', 0.15 + Math.random() * 0.15, 1, 0, ambB); },
  pour() { for (let i = 0; i < 10; i++) noise(0.12, vr(700 + i * 90), 'bandpass', 0.12, 6, i * 0.07); },
  bubble() { for (let i = 0; i < 5; i++) tone(300 + Math.random() * 400, 0.08, 'sine', 0.08, i * 0.09, 700); },
  hammer() { for (let i = 0; i < 3; i++) { tone(vr(180), 0.09, 'square', 0.12, i * 0.22, 90); noise(0.05, vr(3000), 'bandpass', 0.2, 2, i * 0.22); } },
  tap() { tone(vr(200, 0.15), 0.08, 'square', 0.1, 0, 100); noise(0.04, vr(3000), 'bandpass', 0.15, 2); },
  chop() { noise(0.1, vr(1200, 0.2), 'bandpass', vr(0.3, 0.2), 2); tone(vr(120, 0.15), 0.1, 'triangle', 0.15, 0, 60); },
  pickup() { const k = vr(1, 0.05); tone(660 * k, 0.08, 'triangle', 0.12); tone(990 * k, 0.12, 'triangle', 0.1, 0.07); },
  whoosh() { noise(0.5, 400, 'lowpass', 0.25, 0.5); },
  growl() { tone(vr(90), 0.6, 'sawtooth', 0.06, 0, 70); },
  howl() { tone(400, 1.4, 'sine', 0.05, 0, 620); tone(620, 1.2, 'sine', 0.04, 1.3, 380); },
  sleep() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, 'sine', 0.07, i * 0.18)); },
  door() { tone(300, 0.25, 'triangle', 0.06, 0, 180); },
  ui() { tone(880, 0.05, 'triangle', 0.06, 0, null, uiB); },
};
export function ambience(fireNear, night) { if (!ac) return; const t = now(); fireGain.gain.setTargetAtTime(snd.on ? fireNear * 0.05 : 0, t, 0.3); nightGain.gain.setTargetAtTime(snd.on ? night * 0.5 : 0, t, 1); if (snd.on && fireNear > 0.05 && Math.random() < fireNear * 0.25) sfx.crackle(); }
export const haptics = { on: true }; export const buzz = p => { if (!haptics.on) return; try { navigator.vibrate && navigator.vibrate(p); } catch {} };
