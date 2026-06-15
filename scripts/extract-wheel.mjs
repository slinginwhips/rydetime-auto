// Extract the wheel from trythisone.png via CHROMA KEY. The background is an
// orange/green checkerboard — colors that appear nowhere on the chrome, tire,
// or red accent. So every orange-or-green pixel is background and can be made
// transparent with zero risk to the wheel's white/gray shine. Edge pixels
// (wheel<->background blends) get a de-spill pass to remove colored fringe.
//
// Usage: node scripts/extract-wheel.mjs [--apply]
import sharp from "sharp";

const SRC = "./trythisone.png"; // scratch source (gitignored)
const OUT = "./public/wheel.png";
const TMP = "./wheel-proof.png";
const OUT_SIZE = 256;
const APPLY = process.argv.includes("--apply");

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const N = W * H;
const at = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
console.log("corner samples:", at(3, 3), at(W - 4, 3), at(3, H - 4));
console.log("red accent (top center):", at(W >> 1, H * 0.20 | 0));

// --- key classifiers --------------------------------------------------------
// green: green channel clearly dominant.
// orange: red high, green mid, blue low, with green high enough to NOT be the
//         red accent (the accent has a very low green channel).
function bgScore(r, g, b) {
  const green = g - Math.max(r, b);              // >0 when green-dominant
  const orange = (r > 110 && g > 60 && b < 110 && r - b > 55 && g - b > 25 && g < r + 10);
  if (green > 30) return 2;                       // strong green
  if (orange && g > 55) return 2;                 // strong orange (g>55 excludes red accent)
  if (green > 8 || (orange && g > 35)) return 1;  // weak/edge
  return 0;
}

// --- pass 1: hard key (strong bg -> transparent, wheel -> opaque) -----------
const alpha = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * C, s = bgScore(data[i], data[i + 1], data[i + 2]);
  alpha[p] = s === 2 ? 0 : 255; // edges (s==1) resolved in pass 2
}

// --- pass 2: edge pixels (s==1) -> alpha by distance, plus knock out any
// pixel that still reads as bg adjacent to transparent ----------------------
for (let p = 0; p < N; p++) {
  const i = p * C, s = bgScore(data[i], data[i + 1], data[i + 2]);
  if (s === 1) alpha[p] = 0; // treat weak-bg edge as background too (clean cut)
}

// --- de-spill: neutralize residual green/orange tint on kept edge pixels ----
// For opaque pixels touching transparency, clamp green spill toward gray.
for (let p = 0; p < N; p++) {
  if (alpha[p] === 0) continue;
  const x = p % W, y = (p / W) | 0;
  let edge = false;
  if (x > 0 && alpha[p - 1] === 0) edge = true;
  else if (x < W - 1 && alpha[p + 1] === 0) edge = true;
  else if (y > 0 && alpha[p - W] === 0) edge = true;
  else if (y < H - 1 && alpha[p + W] === 0) edge = true;
  if (!edge) continue;
  const i = p * C; let r = data[i], g = data[i + 1], b = data[i + 2];
  // green spill: g abnormally high vs r,b -> pull down to max(r,b)
  const rb = Math.max(r, b);
  if (g > rb + 12) data[i + 1] = rb + 12;
}

// --- erode 1px to shave any remaining colored fringe ------------------------
const er = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let m = alpha[y * W + x];
  for (let dy = -1; dy <= 1 && m; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    const a = (nx < 0 || ny < 0 || nx >= W || ny >= H) ? 0 : alpha[ny * W + nx];
    if (a < m) m = a;
  }
  er[y * W + x] = m;
}
for (let p = 0; p < N; p++) {
  const i = p * C;
  if (er[p] === 0) { data[i] = data[i + 1] = data[i + 2] = 0; data[i + 3] = 0; }
  else data[i + 3] = 255;
}

let removed = 0; for (let p = 0; p < N; p++) if (er[p] === 0) removed++;
console.log(`removed ${removed} px (${(100 * removed / N).toFixed(1)}%) as background`);

const final = await sharp(data, { raw: { width: W, height: H, channels: C } })
  .resize(OUT_SIZE, OUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 }).toBuffer();

// proof: magenta (fringe/holes show), black (halo), red, white @ button size
const sz = 120, PAD = 12, cell = sz + PAD * 2;
const wheel = await sharp(final).resize(sz, sz).png().toBuffer();
const cols = [{ r: 230, g: 0, b: 230, alpha: 1 }, { r: 10, g: 10, b: 10, alpha: 1 }, { r: 204, g: 0, b: 0, alpha: 1 }, { r: 255, g: 255, b: 255, alpha: 1 }];
const panels = await Promise.all(cols.map((col) =>
  sharp({ create: { width: cell, height: cell, channels: 4, background: col } })
    .composite([{ input: wheel, left: PAD, top: PAD }]).png().toBuffer()));
await sharp({ create: { width: cell * 4, height: cell, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } } })
  .composite(panels.map((input, k) => ({ input, left: cell * k, top: 0 }))).png().toFile(TMP);
console.log("wrote proof", TMP, "(magenta | black | red | white)");

if (APPLY) { await sharp(final).toFile(OUT); console.log("wrote asset", OUT); }
else console.log("proof only — re-run with --apply to write the asset");
