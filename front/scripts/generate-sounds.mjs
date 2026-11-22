#!/usr/bin/env node
// Synthesises the short duel sound effects (spec D20) into front/assets/sounds/.
// Plain Node, no dependencies: each sound is a few soft tones with a gentle envelope,
// written as 44.1 kHz mono 16-bit PCM WAV. Run: node scripts/generate-sounds.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const PEAK = 0.4; // final peak level (about -8 dBFS): quiet, never clipping
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

function render(tones) {
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
  // Normalise to PEAK so every sound has the same quiet level and none clips.
  let max = 0;
  for (const v of mix) max = Math.max(max, Math.abs(v));
  const scale = max > 0 ? PEAK / max : 0;
  return mix.map((v) => v * scale);
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

const SOUNDS = {
  // Two quick rising notes: a light "ding-ding".
  correct: [
    tone({ start: 0, duration: 0.16, from: freq('E5'), decay: 10 }),
    tone({ start: 0.09, duration: 0.3, from: freq('A5'), decay: 8 }),
  ],
  // Two soft low notes falling a minor third, rounder tone (fewer harmonics).
  wrong: [
    tone({ start: 0, duration: 0.18, from: freq('A3'), decay: 6, harmonics: [[2, 0.15]] }),
    tone({ start: 0.15, duration: 0.32, from: freq('F3'), to: freq('E3'), decay: 5, harmonics: [[2, 0.15]] }),
  ],
  // Major arpeggio C-E-G-C with a held final chord.
  win: [
    tone({ start: 0, duration: 0.2, from: freq('C5'), decay: 6 }),
    tone({ start: 0.11, duration: 0.2, from: freq('E5'), decay: 6 }),
    tone({ start: 0.22, duration: 0.2, from: freq('G5'), decay: 6 }),
    tone({ start: 0.33, duration: 0.85, from: freq('C6'), decay: 3 }),
    tone({ start: 0.33, duration: 0.85, from: freq('G5'), gain: 0.5, decay: 3 }),
    tone({ start: 0.33, duration: 0.85, from: freq('E5'), gain: 0.4, decay: 3 }),
  ],
  // Rising sweep into a bright two-note chime with a high sparkle.
  'level-up': [
    tone({ start: 0, duration: 0.32, from: freq('G4'), to: freq('G5'), decay: 2, gain: 0.6 }),
    tone({ start: 0.3, duration: 0.3, from: freq('D5'), decay: 5 }),
    tone({ start: 0.42, duration: 0.9, from: freq('G5'), decay: 2.5 }),
    tone({ start: 0.42, duration: 0.9, from: freq('B5'), gain: 0.5, decay: 2.5 }),
    tone({ start: 0.55, duration: 0.6, from: freq('D7'), gain: 0.12, decay: 5, harmonics: [] }),
  ],
  // Short upward glide and a tick: "you moved up".
  'rank-up': [
    tone({ start: 0, duration: 0.22, from: freq('C5'), to: freq('G5'), decay: 3 }),
    tone({ start: 0.2, duration: 0.3, from: freq('C6'), decay: 9 }),
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, tones] of Object.entries(SOUNDS)) {
  const samples = render(tones);
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, wav(samples));
  console.log(`${name}.wav  ${(samples.length / SAMPLE_RATE).toFixed(2)} s`);
}
