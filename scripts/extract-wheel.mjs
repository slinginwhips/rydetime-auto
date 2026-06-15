// Extract the wheel from updatedwheel.png by removing the BACKGROUND
// (checkerboard) rather than keying on white — so the wheel's white shine is
// preserved. Background = outer region (border flood-fill) + enclosed gap/bore
// blobs (large connected light regions). Interior shine is small + walled off
// by chrome, so it is never reached/removed.
//
// Usage: node scripts/extract-wheel.mjs [--apply]   (--apply writes the asset)
import sharp from "sharp";

const SRC = "./updatedwheel.png"; // scratch source (gitignored)
const OUT = "./public/chrome-wheel.png";
const TMP = "./wheel-v2-proof.png";
const OUT_SIZE = 256;
const APPLY = process.argv.includes("--apply");

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const N = W * H;

// background-like = light + low saturation (matches both checker tones 241/254)
const bg = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * C, r = data[i], g = data[i + 1], b = data[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  bg[p] = (mn >= 205 && mx - mn <= 14) ? 1 : 0;
}

// remove[] = pixels to make transparent
const remove = new Uint8Array(N);

// (1) outer background: flood from all borders through bg-like pixels
const st = [];
for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); }
for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
while (st.length) {
  const p = st.pop();
  if (remove[p] || !bg[p]) continue;
  remove[p] = 1;
  const x = p % W, y = (p / W) | 0;
  if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1);
  if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W);
}

// (2) enclosed gaps/bore: connected components of remaining bg-like pixels;
// remove LARGE ones (gaps/bore). Small bg-like blobs = shine -> kept.
const GAP_MIN = 1500;
const lab = new Int32Array(N).fill(-1);
for (let p = 0; p < N; p++) {
  if (lab[p] !== -1 || !bg[p] || remove[p]) continue;
  const comp = [];
  const s2 = [p]; lab[p] = p;
  while (s2.length) {
    const q = s2.pop(); comp.push(q);
    const x = q % W, y = (q / W) | 0;
    const nb = [];
    if (x > 0) nb.push(q - 1); if (x < W - 1) nb.push(q + 1);
    if (y > 0) nb.push(q - W); if (y < H - 1) nb.push(q + W);
    for (const r of nb) if (lab[r] === -1 && bg[r] && !remove[r]) { lab[r] = p; s2.push(r); }
  }
  if (comp.length >= GAP_MIN) for (const q of comp) remove[q] = 1;
}

// apply removal
let removed = 0;
for (let p = 0; p < N; p++) {
  if (remove[p]) { const i = p * C; data[i] = data[i + 1] = data[i + 2] = 0; data[i + 3] = 0; removed++; }
  else data[p * C + 3] = 255;
}

// (3) erode 1px to shave the light matte fringe at wheel/background boundaries
let alpha = new Uint8Array(N);
for (let p = 0; p < N; p++) alpha[p] = data[p * C + 3];
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
for (let p = 0; p < N; p++) data[p * C + 3] = er[p];

console.log(`removed ${removed} px (${(100 * removed / N).toFixed(1)}%) as background`);

const final = await sharp(data, { raw: { width: W, height: H, channels: C } })
  .resize(OUT_SIZE, OUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 }).toBuffer();

// proof sheet: green (holes show), black (halo), red, white — at button size
const sz = 120, PAD = 12;
const wheel = await sharp(final).resize(sz, sz).png().toBuffer();
const panel = (col) => sharp({ create: { width: sz + PAD * 2, height: sz + PAD * 2, channels: 4, background: col } })
  .composite([{ input: wheel, left: PAD, top: PAD }]).png().toBuffer();
const cols = [{ r: 0, g: 220, b: 0, alpha: 1 }, { r: 10, g: 10, b: 10, alpha: 1 }, { r: 204, g: 0, b: 0, alpha: 1 }, { r: 255, g: 255, b: 255, alpha: 1 }];
const cell = sz + PAD * 2;
const panels = await Promise.all(cols.map(panel));
await sharp({ create: { width: cell * 4, height: cell, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } } })
  .composite(panels.map((input, k) => ({ input, left: cell * k, top: 0 })))
  .png().toFile(TMP);
console.log("wrote proof", TMP, "(green | black | red | white)");

if (APPLY) { await sharp(final).toFile(OUT); console.log("wrote asset", OUT); }
else console.log("proof only — re-run with --apply to write the asset");
