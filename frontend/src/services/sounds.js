/**
 * Service sons — effets audio synthétisés via Web Audio API.
 * Aucun fichier audio externe requis.
 *
 * Effets disponibles (appeler via play('nom')) :
 *   playCard, drawCard, uno, counterUno, myTurn, penalty, colorChosen, win, error
 *
 * Le son peut être activé/désactivé via toggleSound() — persisté en localStorage.
 */

let _ctx = null;

function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone({ freq = 440, type = 'sine', vol = 0.25, start = 0, dur = 0.15 }) {
  const c   = ac();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

// ─── Effets ───────────────────────────────────────────────────────────────────

const SFX = {
  playCard() {
    // Swish léger : deux fréquences descendantes rapides
    tone({ freq: 680, vol: 0.18, dur: 0.07 });
    tone({ freq: 420, vol: 0.12, start: 0.05, dur: 0.09 });
  },

  drawCard() {
    // Thump doux : basse fréquence courte
    tone({ freq: 120, type: 'triangle', vol: 0.22, dur: 0.13 });
  },

  uno() {
    // Fanfare ascendante : do-mi-sol
    tone({ freq: 523, vol: 0.28, dur: 0.13 });
    tone({ freq: 659, vol: 0.28, start: 0.11, dur: 0.13 });
    tone({ freq: 784, vol: 0.32, start: 0.22, dur: 0.22 });
  },

  counterUno() {
    // Descendant alarmant : sol-mi-do
    tone({ freq: 784, type: 'sawtooth', vol: 0.2, dur: 0.1 });
    tone({ freq: 523, type: 'sawtooth', vol: 0.2, start: 0.09, dur: 0.1 });
    tone({ freq: 392, type: 'sawtooth', vol: 0.18, start: 0.18, dur: 0.15 });
  },

  myTurn() {
    // Ping cristallin : deux notes claires
    tone({ freq: 880,  vol: 0.2, dur: 0.16 });
    tone({ freq: 1108, vol: 0.14, start: 0.13, dur: 0.13 });
  },

  penalty() {
    // Coup de tonnerre court : bruit sawtooth descendant
    tone({ freq: 280, type: 'sawtooth', vol: 0.18, dur: 0.11 });
    tone({ freq: 200, type: 'sawtooth', vol: 0.14, start: 0.09, dur: 0.15 });
  },

  colorChosen() {
    // Confirmation douce : tick montant
    tone({ freq: 660, vol: 0.16, dur: 0.09 });
    tone({ freq: 880, vol: 0.12, start: 0.07, dur: 0.1 });
  },

  win() {
    // Arpège victorieux : do-mi-sol-do
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, vol: 0.26, start: i * 0.12, dur: 0.28 })
    );
  },

  error() {
    // Buzz court
    tone({ freq: 220, type: 'square', vol: 0.12, dur: 0.1 });
  },
};

// ─── API publique avec gestion mute ──────────────────────────────────────────

const STORAGE_KEY = 'uno_sounds';

export function isSoundEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function toggleSound() {
  const next = isSoundEnabled() ? 'off' : 'on';
  localStorage.setItem(STORAGE_KEY, next);
  return next === 'on';
}

export function play(name) {
  if (!isSoundEnabled()) return;
  try { SFX[name]?.(); } catch { /* AudioContext non dispo */ }
}
