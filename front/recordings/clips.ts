/// <reference types="node" />
import { spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

import type { Page } from '@playwright/test';

/**
 * Records a page as separate clips, one per step of a demo.
 *
 * Playwright's own video is captured in CSS pixels at about 1 Mbit/s. Here the browser renders at 3× (see
 * playwright.record.config.ts) and every screencast frame is kept as a JPEG while the step runs. A finished clip is
 * encoded in the background while the next one is filmed, at the lowest CPU priority and on a few threads, so the
 * encoder does not slow down the app on camera and only the last clip is left to encode when the take ends.
 *
 * Output: MP4 (H.264) when an ffmpeg with libx264 is on PATH or in $FFMPEG, else WebM (VP9) through the ffmpeg
 * Playwright downloads with its browsers.
 */

const FPS = 30;
/** JPEG quality of each captured frame (Chromium's screencast). */
const JPEG_QUALITY = 95;
/** Encoder threads per clip: leaves the other cores to the browser, Metro and the backend while filming. */
const ENCODER_THREADS = 4;
/** `nice` runs the encoder at the lowest priority; Windows has no such command. */
const NICE = process.platform === 'win32' ? [] : ['nice', '-n', '19'];

type Frame = { file: string; at: number };
type Clip = { name: string; dir: string; frames: Frame[]; startedAt: number; endedAt: number };

export class ClipRecorder {
  /** By clip name, in the order the names were first filmed: the file the clip is being encoded into. */
  private readonly encoding = new Map<string, Promise<string>>();
  private encoder?: Encoder;
  private current?: Clip;
  /** Numbers the frame folders, so a clip filmed again never shares one with a take still being encoded. */
  private filmed = 0;

  constructor(
    private readonly page: Page,
    private readonly outDir: string,
    private readonly size: { width: number; height: number },
  ) {
    // A take replaces the previous one, so no clip of an older, differently cut take is left behind.
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  }

  /** Starts a clip; `name` becomes the file name, e.g. "01-bank" → 01-bank.mp4. A name filmed again replaces it. */
  async start(name: string) {
    if (this.current) await this.stop();
    const dir = path.join(this.outDir, '.frames', `${String(++this.filmed).padStart(2, '0')}-${name}`);
    const clip: Clip = { name, dir, frames: [], startedAt: Date.now(), endedAt: 0 };
    mkdirSync(clip.dir, { recursive: true });
    this.current = clip;
    await this.page.screencast.start({
      size: this.size,
      quality: JPEG_QUALITY,
      onFrame: ({ data }) => {
        const file = path.join(clip.dir, `${String(clip.frames.length).padStart(6, '0')}.jpg`);
        writeFileSync(file, data);
        clip.frames.push({ file, at: Date.now() });
      },
    });
  }

  async stop() {
    const clip = this.current;
    if (!clip) return;
    this.current = undefined;
    await this.page.screencast.stop();
    clip.endedAt = Date.now();
    if (clip.frames.length) this.encoding.set(clip.name, this.encodeInBackground(clip, this.encoding.get(clip.name)));
  }

  /** `earlier`: an older take of the same clip, still encoding into the same file; this one writes after it. */
  private encodeInBackground(clip: Clip, earlier?: Promise<string>): Promise<string> {
    const encoder = (this.encoder ??= findEncoder());
    const out = path.join(this.outDir, `${clip.name}.${encoder.ext}`);
    console.log(`Encoding ${out} (${Math.round((clip.endedAt - clip.startedAt) / 1000)} s)…`);
    const after = earlier ? earlier.then(() => undefined, () => undefined) : Promise.resolve();
    const job = after.then(() => encodeClip(clip, encoder, out)).then(() => {
      rmSync(clip.dir, { recursive: true, force: true });
      return out;
    });
    // A failure is reported by encode(); until then it must not count as an unhandled rejection.
    job.catch(() => {});
    return job;
  }

  /** Drops the clip being filmed, frames and all. */
  async discard() {
    const clip = this.current;
    if (!clip) return;
    this.current = undefined;
    await this.page.screencast.stop();
    rmSync(clip.dir, { recursive: true, force: true });
  }

  /** Stops the clip being filmed and waits until every clip is encoded; returns the written files. */
  async encode(): Promise<string[]> {
    await this.stop();
    const written = await Promise.all(this.encoding.values());
    rmSync(path.join(this.outDir, '.frames'), { recursive: true, force: true });
    return written;
  }
}

type Encoder = { bin: string; ext: 'mp4' | 'webm'; args: string[] };

function findEncoder(): Encoder {
  for (const bin of [process.env.FFMPEG, 'ffmpeg'].filter((b): b is string => !!b)) {
    const probe = spawnSync(bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.includes('libx264')) {
      return {
        bin,
        ext: 'mp4',
        args: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
      };
    }
  }
  const bundled = playwrightFfmpeg();
  if (!bundled) throw new Error('No ffmpeg found: install ffmpeg (sudo apt install ffmpeg) or run `npx playwright install ffmpeg`.');
  console.warn('No ffmpeg with libx264 on PATH: writing WebM. `sudo apt install ffmpeg` gives MP4 for PowerPoint.');
  return {
    bin: bundled,
    ext: 'webm',
    args: ['-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p'],
  };
}

/** The ffmpeg Playwright installs next to its browsers (VP9 only). */
function playwrightFfmpeg(): string | undefined {
  const home = os.homedir();
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(home, '.cache', 'ms-playwright'),
    path.join(home, 'Library', 'Caches', 'ms-playwright'),
    path.join(home, 'AppData', 'Local', 'ms-playwright'),
  ].filter((r): r is string => !!r && existsSync(r));
  for (const root of roots) {
    for (const dir of readdirSync(root).filter((d) => d.startsWith('ffmpeg-')).sort().reverse()) {
      for (const bin of ['ffmpeg-linux', 'ffmpeg-mac', 'ffmpeg-win64.exe']) {
        const file = path.join(root, dir, bin);
        if (existsSync(file)) return file;
      }
    }
  }
  return undefined;
}

/**
 * Chromium sends a frame only when the screen changes, so the frames are spread onto a steady 30 fps:
 * each output frame shows the last captured frame at that moment.
 */
function encodeClip(clip: Clip, encoder: Encoder, out: string): Promise<void> {
  const total = Math.max(1, Math.round(((clip.endedAt - clip.startedAt) / 1000) * FPS));
  const [bin, ...prefix] = [...NICE, encoder.bin];
  const ffmpeg = spawn(
    bin,
    [
      ...prefix,
      '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
      '-an', '-r', String(FPS),
      // Even sizes, which yuv420p needs.
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      ...encoder.args,
      '-threads', String(ENCODER_THREADS),
      out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise<void>((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code} for ${clip.name}`))));
  });

  const write = async () => {
    let next = 0;
    let last: Buffer | undefined;
    for (let i = 0; i < total; i++) {
      const t = clip.startedAt + (i * 1000) / FPS;
      while (next < clip.frames.length && clip.frames[next].at <= t) last = readFileSync(clip.frames[next++].file);
      // Before the first frame arrives, show the first one.
      last ??= readFileSync(clip.frames[0].file);
      if (!ffmpeg.stdin.write(last)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    }
    ffmpeg.stdin.end();
  };
  return Promise.all([write(), done]).then(() => undefined);
}
