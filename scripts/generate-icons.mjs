// Dependency-free PNG icon generator (uses Node built-in zlib).
// Renders a teal rounded-square with a simple white "chalet" house glyph.
// Outputs the PNG sizes referenced by the PWA manifest into /public.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

const BG = [15, 118, 110, 255]; // #0f766e teal
const HOUSE = [255, 255, 255, 255];
const ROOF = [153, 246, 228, 255]; // #99f6e4

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function renderPixel(x, y, size) {
  const r = size * 0.18; // corner radius
  // rounded-square mask
  const inCorner =
    (x < r && y < r && Math.hypot(r - x, r - y) > r) ||
    (x > size - r && y < r && Math.hypot(x - (size - r), r - y) > r) ||
    (x < r && y > size - r && Math.hypot(r - x, y - (size - r)) > r) ||
    (x > size - r && y > size - r && Math.hypot(x - (size - r), y - (size - r)) > r);
  if (inCorner) return [0, 0, 0, 0];

  const nx = x / size;
  const ny = y / size;

  // roof: triangle peaking at center-top
  const roofTop = 0.26;
  const roofBottom = 0.5;
  if (ny >= roofTop && ny <= roofBottom) {
    const t = (ny - roofTop) / (roofBottom - roofTop);
    const half = 0.04 + t * 0.34;
    if (Math.abs(nx - 0.5) <= half) return ROOF;
  }

  // body
  if (ny > roofBottom && ny < 0.82 && nx > 0.22 && nx < 0.78) {
    // door
    if (ny > 0.6 && nx > 0.44 && nx < 0.56) return ROOF;
    return HOUSE;
  }

  return BG;
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = renderPixel(x, y, size);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
      raw[p++] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32x32.png', 32],
];

for (const [name, size] of targets) {
  writeFileSync(join(publicDir, name), makePng(size));
  console.log('wrote', name);
}
