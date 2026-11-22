#!/usr/bin/env node
// Synthesises the short duel sound effects (spec D20) into front/assets/sounds/.
// Plain Node, no dependencies: each sound is a few soft tones with a gentle envelope,
// written as 44.1 kHz mono 16-bit PCM WAV. Run: node scripts/generate-sounds.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const PEAK = 0.4; // default peak (about -8 dBFS): quiet, never clipping
const LOUD = 0.88; // the wrong-answer buzz: must cut through a phone speaker, still never clips
const CELEBRATE = 0.8; // win, level-up, firework: bigger than the answer ticks
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** Note name (e.g. "C5", "F#4") to frequency in Hz. */
function freq(note) {
  const match = /^([A-G])(#?)(\d)$/.exec(note);
  if (!match) throw new Error(`Bad note ${note}`);
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[match[1]] + (match[2] ? 1 : 0);
  const octave = Number(match[3]);
  return 440 * 2 ** ((semis + (octave - 4) * 12) / 12);
}

/**
 * One tone: soft attack, exponential decay, short release so it never ends in a click.
 * `harmonics` is a list of [multiple, gain] pairs added to the fundamental.
 */
function tone({ start, duration, from, to = from, gain = 1, attack = 0.012, decay = 4, harmonics = [[2, 0.25], [3, 0.08]] }) {
  return { start, duration, from, to, gain, attack, decay, harmonics };
}

function render(tones, peak = PEAK) {
  const length = Math.ceil(Math.max(...tones.map((t) => t.start + t.duration)) * SAMPLE_RATE);
  const mix = new Float64Array(length);
  for (const t of tones) {
    const first = Math.round(t.start * SAMPLE_RATE);
    const count = Math.round(t.duration * SAMPLE_RATE);
    const release = Math.min(0.03, t.duration / 4);
    let phase = 0;
    for (let i = 0; i < count && first + i < length; i++) {
      const time = i / SAMPLE_RATE;
      const progress = i / count;
      // Exponential glide from `from` to `to`.
      const f = t.from * (t.to / t.from) ** progress;
      phase += (2 * Math.PI * f) / SAMPLE_RATE;
      let sample = Math.sin(phase);
      for (const [multiple, g] of t.harmonics) sample += g * Math.sin(phase * multiple);
      const attackEnv = Math.min(1, time / t.attack);
      const decayEnv = Math.exp(-t.decay * time);
      const releaseEnv = Math.min(1, (t.duration - time) / release);
      mix[first + i] += sample * t.gain * attackEnv * decayEnv * releaseEnv;
    }
  }
  return normalise(mix, peak);
}

/** Scales a buffer so its loudest sample sits exactly at `peak` (0..1), so no sound clips. */
function normalise(mix, peak) {
  let max = 0;
  for (const v of mix) max = Math.max(max, Math.abs(v));
  const scale = max > 0 ? peak / max : 0;
  return mix.map((v) => v * scale);
}

/** Deterministic noise so regenerating gives byte-identical files. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** A firework: a low thump, a bright noise pop and a crackle tail of tiny clicks. */
function firework() {
  const length = Math.ceil(0.95 * SAMPLE_RATE);
  const mix = new Float64Array(length);
  const rand = rng(7);
  let low = 0;
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const f = 50 + 150 * Math.exp(-t * 40);
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    const thump = Math.sin(phase) * Math.exp(-t * 14);
    const white = rand() * 2 - 1;
    low += 0.35 * (white - low); // one-pole low-pass: the pop is a warm "whump", not a hiss
    const pop = (white * 0.6 + low * 0.9) * Math.exp(-t * 22);
    mix[i] = thump * 0.9 + pop;
  }
  // Crackle: sparse short clicks with random size, thinning out over time.
  for (let n = 0; n < 34; n++) {
    const at = 0.09 + Math.pow(rand(), 1.6) * 0.72;
    const start = Math.round(at * SAMPLE_RATE);
    const size = (0.25 + rand() * 0.45) * (1 - at / 1.1);
    for (let j = 0; j < 220 && start + j < length; j++) {
      mix[start + j] += (rand() * 2 - 1) * size * Math.exp(-j / 40);
    }
  }
  return normalise(mix, CELEBRATE);
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Odd harmonics only: a square-ish buzz that stays audible on a phone speaker. */
const BUZZ = [[3, 0.33], [5, 0.2], [7, 0.14], [9, 0.11]];
const BRIGHT = [[2, 0.5], [3, 0.35], [4, 0.2]];

/** Each sound is a list of tones plus its peak level, or a ready sample buffer. */
const SOUNDS = {
  // Two quick rising notes: a light "ding-ding".
  correct: { tones: [
    tone({ start: 0, duration: 0.16, from: freq('E5'), decay: 10 }),
    tone({ start: 0.09, duration: 0.3, from: freq('A5'), decay: 8 }),
  ] },
  // A short descending "bwomp": E3 sliding to C3, square-ish and loud. Unmistakably "no".
  wrong: { peak: LOUD, tones: [
    tone({ start: 0, duration: 0.17, from: freq('E3'), to: freq('E3') * 0.97, decay: 3, attack: 0.004, harmonics: BUZZ }),
    tone({ start: 0.16, duration: 0.3, from: freq('C3') * 1.06, to: freq('C3') * 0.9, decay: 3.2, attack: 0.004, harmonics: BUZZ }),
    // A detuned copy beats against the first: the "buzz".
    tone({ start: 0.16, duration: 0.3, from: freq('C3') * 1.08, to: freq('C3') * 0.92, gain: 0.7, decay: 3.2, attack: 0.004, harmonics: BUZZ }),
  ] },
  // Big fanfare, about 1.3 s: a quick run up, a held chord with a second voice, then a glitter on top.
  win: { peak: CELEBRATE, tones: [
    tone({ start: 0, duration: 0.18, from: freq('C5'), decay: 7, harmonics: BRIGHT }),
    tone({ start: 0.1, duration: 0.18, from: freq('E5'), decay: 7, harmonics: BRIGHT }),
    tone({ start: 0.2, duration: 0.18, from: freq('G5'), decay: 7, harmonics: BRIGHT }),
    tone({ start: 0.3, duration: 0.22, from: freq('C6'), decay: 6, harmonics: BRIGHT }),
    tone({ start: 0.44, duration: 0.2, from: freq('G5'), decay: 6, harmonics: BRIGHT }),
    tone({ start: 0.54, duration: 0.2, from: freq('C6'), decay: 6, harmonics: BRIGHT }),
    tone({ start: 0.66, duration: 0.7, from: freq('E6'), decay: 2.6, harmonics: BRIGHT }),
    tone({ start: 0.66, duration: 0.7, from: freq('C6'), gain: 0.7, decay: 2.6, harmonics: BRIGHT }),
    tone({ start: 0.66, duration: 0.7, from: freq('G5'), gain: 0.6, decay: 2.6, harmonics: BRIGHT }),
    tone({ start: 0.66, duration: 0.7, from: freq('C4'), gain: 0.6, decay: 2.4, harmonics: [[2, 0.4]] }),
    tone({ start: 0.8, duration: 0.5, from: freq('C7'), gain: 0.18, decay: 5, harmonics: [] }),
    tone({ start: 0.92, duration: 0.4, from: freq('E7'), gain: 0.14, decay: 6, harmonics: [] }),
    tone({ start: 1.04, duration: 0.3, from: freq('G7'), gain: 0.12, decay: 8, harmonics: [] }),
  ] },
  // A rising five-note arpeggio into a held chord, with a shimmer of high bells.
  'level-up': { peak: CELEBRATE, tones: [
    tone({ start: 0, duration: 0.2, from: freq('C5'), decay: 8, harmonics: BRIGHT }),
    tone({ start: 0.1, duration: 0.2, from: freq('E5'), decay: 8, harmonics: BRIGHT }),
    tone({ start: 0.2, duration: 0.2, from: freq('G5'), decay: 8, harmonics: BRIGHT }),
    tone({ start: 0.3, duration: 0.2, from: freq('C6'), decay: 8, harmonics: BRIGHT }),
    tone({ start: 0.4, duration: 1.0, from: freq('E6'), decay: 2.4, harmonics: BRIGHT }),
    tone({ start: 0.4, duration: 1.0, from: freq('G5'), gain: 0.55, decay: 2.4, harmonics: BRIGHT }),
    tone({ start: 0.4, duration: 1.0, from: freq('C5'), gain: 0.5, decay: 2.4, harmonics: BRIGHT }),
    tone({ start: 0.5, duration: 0.5, from: freq('G7'), gain: 0.16, decay: 4, harmonics: [] }),
    tone({ start: 0.62, duration: 0.5, from: freq('C8'), gain: 0.13, decay: 4.5, harmonics: [] }),
    tone({ start: 0.76, duration: 0.5, from: freq('E7'), gain: 0.14, decay: 5, harmonics: [] }),
    tone({ start: 0.9, duration: 0.45, from: freq('G7'), gain: 0.12, decay: 6, harmonics: [] }),
  ] },
  // Short upward glide and a tick: "you moved up".
  'rank-up': { tones: [
    tone({ start: 0, duration: 0.22, from: freq('C5'), to: freq('G5'), decay: 3 }),
    tone({ start: 0.2, duration: 0.3, from: freq('C6'), decay: 9 }),
  ] },
  // Pop with a crackle tail, played once per firework burst.
  firework: { samples: firework() },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, def] of Object.entries(SOUNDS)) {
  const samples = def.samples ?? render(def.tones, def.peak);
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, wav(samples));
  console.log(`${name}.wav  ${(samples.length / SAMPLE_RATE).toFixed(2)} s`);
}
