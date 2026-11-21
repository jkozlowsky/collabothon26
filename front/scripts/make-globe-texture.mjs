#!/usr/bin/env node
/**
 * Generates the globe images from Natural Earth land polygons (public domain, naturalearthdata.com):
 *   assets/globe/land-2048.png      equirectangular land mask, 2048 × 1024, land in brand colours, ocean transparent
 *   assets/globe/globe-fallback.png the globe as a flat picture (used when WebGL is unavailable)
 *
 * Run once from front/: `node scripts/make-globe-texture.mjs`. The app never fetches anything at runtime;
 * the outputs are committed. No dependencies: polygons are scan-filled by hand and PNGs written with zlib.
 * The fallback shading and orientation must match `GlobeScene` and `src/lib/geo.ts` (see FALLBACK_CENTER).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'globe');

const W = 2048;
const H = 1024;
/** Supersampling per axis for anti-aliased coastlines. */
const SS = 4;
/** Coastline thickness in texture pixels (the texture is shrunk ~2.5× on screen). */
const EDGE = 3;

// Figma Design Kit colours (theme.ts): globe/land, globe/land-edge, globe/ocean-light, globe/ocean-deep.
const LAND = [0xcf, 0xe5, 0xdd];
const LAND_EDGE = [0x9c, 0xc3, 0xb6];
const OCEAN_LIGHT = [0x1b, 0x6f, 0x82];
const OCEAN_DEEP = [0x00, 0x2e, 0x3c];

/** Fallback picture: diameter in px (2× the ~280 px globe) and the lat/lng at its centre. Keep in sync with geo.ts. */
const FALLBACK_SIZE = 560;
const FALLBACK_CENTER = { lat: 30, lng: 15 };

// --- PNG ---------------------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(kind, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(kind, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA pixels → PNG file bytes. */
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Land mask ---------------------------------------------------------------------------------

/** Every ring (outer and holes) of every land polygon, as [lng, lat] arrays. */
function rings(geojson) {
  const out = [];
  for (const f of geojson.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) out.push(...poly);
  }
  return out;
}

/** Land coverage 0..1 per texture pixel: even-odd scanline fill at SS× resolution, then box-averaged. */
function coverage(allRings) {
  const sw = W * SS;
  const sh = H * SS;
  // Edges in supersampled pixel space.
  const edges = [];
  for (const ring of allRings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng0, lat0] = ring[i];
      const [lng1, lat1] = ring[i + 1];
      edges.push([((lng0 + 180) / 360) * sw, ((90 - lat0) / 180) * sh, ((lng1 + 180) / 360) * sw, ((90 - lat1) / 180) * sh]);
    }
  }
  const cov = new Float32Array(W * H);
  const xs = [];
  for (let sy = 0; sy < sh; sy++) {
    const y = sy + 0.5;
    xs.length = 0;
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    const row = Math.floor(sy / SS) * W;
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.round(xs[i]));
      const to = Math.min(sw, Math.round(xs[i + 1]));
      for (let sx = from; sx < to; sx++) cov[row + Math.floor(sx / SS)] += 1 / (SS * SS);
    }
  }
  return cov;
}

/** Texture: land colour, a darker band along the coast, ocean fully transparent. */
function landTexture(cov) {
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (cov[i] <= 0) continue;
      let coast = false;
      for (let dy = -EDGE; dy <= EDGE && !coast; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -EDGE; dx <= EDGE; dx++) {
          const xx = (x + dx + W) % W; // wraps across the antimeridian
          if (cov[yy * W + xx] < 0.5) {
            coast = true;
            break;
          }
        }
      }
      const c = coast ? LAND_EDGE : LAND;
      rgba[i * 4] = c[0];
      rgba[i * 4 + 1] = c[1];
      rgba[i * 4 + 2] = c[2];
      rgba[i * 4 + 3] = Math.round(Math.min(1, cov[i]) * 255);
    }
  }
  return rgba;
}

// --- Fallback picture (same shading as the GlobeScene shader) -----------------------------------

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toRad = (d) => (d * Math.PI) / 180;

/** Ocean colour for a view-space normal; mirrors OCEAN_SHADE in GlobeScene. */
function oceanAt(nx, ny) {
  const t = clamp01(Math.hypot(nx + 0.35, ny - 0.4) / 1.5);
  return OCEAN_LIGHT.map((c, k) => mix(c, OCEAN_DEEP[k], t));
}

function fallbackPicture(tex) {
  const S = FALLBACK_SIZE;
  const r = S / 2;
  const rgba = Buffer.alloc(S * S * 4);
  const yaw = -toRad(FALLBACK_CENTER.lng);
  const pitch = toRad(FALLBACK_CENTER.lat);
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const vx = (px + 0.5 - r) / r;
      const vy = -(py + 0.5 - r) / r;
      const d2 = vx * vx + vy * vy;
      if (d2 > 1) continue;
      const vz = Math.sqrt(1 - d2);
      // View → world: undo Rx(pitch), then Ry(yaw) (geo.ts rotates world → view as Ry then Rx).
      const y1 = vy * Math.cos(pitch) + vz * Math.sin(pitch);
      const z1 = -vy * Math.sin(pitch) + vz * Math.cos(pitch);
      const wx = vx * Math.cos(yaw) - z1 * Math.sin(yaw);
      const wz = vx * Math.sin(yaw) + z1 * Math.cos(yaw);
      const lat = Math.asin(Math.max(-1, Math.min(1, y1)));
      const lng = Math.atan2(wx, wz);
      const tx = Math.min(W - 1, Math.floor(((lng + Math.PI) / (2 * Math.PI)) * W));
      const ty = Math.min(H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * H));
      const ti = (ty * W + tx) * 4;
      const a = tex[ti + 3] / 255;
      const ocean = oceanAt(vx, vy);
      const rim = mix(1, 0.72, (1 - vz) ** 2);
      const o = (py * S + px) * 4;
      for (let k = 0; k < 3; k++) rgba[o + k] = Math.round(mix(ocean[k], tex[ti + k], a) * rim);
      // Anti-aliased outline of the disc.
      rgba[o + 3] = Math.round(clamp01((1 - Math.sqrt(d2)) * r + 0.5) * 255);
    }
  }
  return rgba;
}

// --- Main --------------------------------------------------------------------------------------

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`);
const geojson = await res.json();

const tex = landTexture(coverage(rings(geojson)));
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'land-2048.png'), encodePng(W, H, tex));
writeFileSync(join(OUT, 'globe-fallback.png'), encodePng(FALLBACK_SIZE, FALLBACK_SIZE, fallbackPicture(tex)));
console.log(`Wrote land-2048.png and globe-fallback.png to ${OUT}`);
