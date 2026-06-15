// Clean the user-provided wheel PNG (wheel_transparent_extracted.png): its
// OUTER background is transparent, but the enclosed "windows" between the
// spokes and the center bore are still opaque white (an edge-flood-fill
// extraction can't reach regions topologically surrounded by the wheel).
//
// Strategy: flat white between the spokes forms a few LARGE connected blobs,
// while the chrome's specular highlights are SMALL scattered specks. So we
// connected-component-label the near-white pixels and only knock out (make
// transparent) the components above a size threshold — removing the gap/bore
// white while preserving the bright chrome.
//
// Usage: node scripts/clean-wheel.mjs [--apply]
import sharp from "sharp";

const SRC = "./wheel_transparent_extracted.png";
const OUT = "./public/wheel-button.png";
const OUT_SIZE = 256;
const APPLY = process.argv.includes("--apply");

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info; // C === 4

// whiteish = bright + low saturation + currently opaque
const idx = (x, y) => (y * W + x) * C;
// Tight: only flat, bright extraction-fill pixels — NOT dull/gradient chrome.
// Keeping this floor high stops flood-fill from bridging gaps to chrome
// highlights through the dim mid-tones of the rim lip.
const isWhiteish = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
  if (a < 10) return false;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mn >= 224 && mx - mn <= 16;
};

// iterative flood fill (4-connectivity) over whiteish pixels -> components
const label = new Int32Array(W * H).fill(-1);
const comps = []; // {size, pixels:[flatIdx...]}
const stack = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const flat = y * W + x;
    if (label[flat] !== -1 || !isWhiteish(idx(x, y))) continue;
    const id = comps.length;
    let size = 0;
    const pixels = [];
    stack.push(flat);
    label[flat] = id;
    while (stack.length) {
      const p = stack.pop();
      const px = p % W, py = (p / W) | 0;
      pixels.push(p);
      size++;
      const nb = [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nf = ny * W + nx;
        if (label[nf] === -1 && isWhiteish(idx(nx, ny))) {
          label[nf] = id;
          stack.push(nf);
        }
      }
    }
    comps.push({ id, size, pixels });
  }
}

comps.sort((a, b) => b.size - a.size);
console.log("total whiteish components:", comps.length);

const cx0 = W / 2, cy0 = H / 2, R = W / 2;
// centroid + normalized radius for each component (helps tell central gaps from rim spots)
for (const c of comps) {
  let sx = 0, sy = 0;
  for (const p of c.pixels) { sx += p % W; sy += (p / W) | 0; }
  c.cx = sx / c.size; c.cy = sy / c.size;
  c.rNorm = Math.hypot(c.cx - cx0, c.cy - cy0) / R;
}

// per-component whiteness purity: gaps are flat pure-white extraction fill;
// chrome reflections are bright but gradient (lower mean, more variance)
for (const c of comps) {
  let sum = 0, pure = 0;
  for (const p of c.pixels) {
    const i = p * C, mn = Math.min(data[i], data[i + 1], data[i + 2]);
    sum += mn; if (mn >= 248) pure++;
  }
  c.meanMin = sum / c.size;
  c.pureFrac = pure / c.size;
}

// Remove only LARGE + FLAT-BRIGHT blobs (the gap windows + center bore).
// meanMin/pureFrac gates exclude chrome reflections that survived as big blobs.
const THRESHOLD = 1200;
const big = comps.filter((c) =>
  c.size >= THRESHOLD && c.meanMin >= 232 && c.pureFrac >= 0.30);
console.log("big components (size  rNorm  meanMin  pureFrac):");
for (const c of big) {
  console.log(`  size=${String(c.size).padStart(6)}  rNorm=${c.rNorm.toFixed(2)}  meanMin=${c.meanMin.toFixed(0)}  pureFrac=${c.pureFrac.toFixed(2)}  at (${c.cx | 0},${c.cy | 0})`);
}

if (process.argv.includes("--debug")) {
  // paint every removed-candidate component magenta over the original for inspection
  const dbg = Buffer.from(data);
  for (const c of big) for (const p of c.pixels) {
    dbg[p * C] = 255; dbg[p * C + 1] = 0; dbg[p * C + 2] = 255; dbg[p * C + 3] = 255;
  }
  await sharp(dbg, { raw: { width: W, height: H, channels: C } })
    .resize(360, 360, { fit: "contain", background: { r: 20, g: 20, b: 20, alpha: 1 } })
    .png().toFile("./debug-clean.png");
  console.log("wrote ./debug-clean.png (removed regions in magenta)");
  process.exit(0);
}

if (!APPLY) {
  console.log("dry run — re-run with --apply to write", OUT);
  process.exit(0);
}

for (const c of big) {
  for (const p of c.pixels) data[p * C + 3] = 0; // alpha -> 0
}

// De-matte: the source was extracted over a ~light (white) background, so
// anti-aliased edge pixels are blended toward white and baked in -> they show
// as a gray/white halo on dark backgrounds. Recover the true foreground color
// by inverting the composite C = F*a + BG*(1-a)  ->  F = (C - BG*(1-a)) / a.
const BG = 237; // measured matte/background level of the source extraction
for (let i = 0; i < data.length; i += C) {
  const a = data[i + 3];
  if (a === 0 || a === 255) continue; // only soft edge pixels carry the matte
  const af = a / 255;
  for (let k = 0; k < 3; k++) {
    const f = (data[i + k] - BG * (1 - af)) / af;
    data[i + k] = f < 0 ? 0 : f > 255 ? 255 : f;
  }
}

// Hard alpha threshold: the source carries a faint baked semi-transparent
// shadow/glow ring (invisible on white, halos on dark). Soft de-matte can't
// fully kill it, so we make every pixel either fully opaque or fully gone.
// Zeroing the RGB of dropped pixels stops their (light) colour from bleeding
// back into the edge when the image is downscaled. The 1254 -> 256 (then
// next/image 256 -> ~96) downscale re-anti-aliases the hard edge cleanly, so
// the button still looks smooth — just with NO halo on any background.
const T = 140;
for (let i = 0; i < data.length; i += C) {
  if (data[i + 3] >= T) {
    data[i + 3] = 255;
  } else {
    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
  }
}

// Outer circular clip: the tire is a clean circle, but the source baked a soft
// gray shadow/glow just beyond its edge that halos on dark backgrounds. Clip
// everything past the tire's true radius to transparent — a crisp round edge
// (which downscaling re-smooths) and zero outer halo.
const CLIP = 0.86; // tire solid edge ≈ 0.82; glow lives in 0.84–0.92
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (Math.hypot(x - cx0, y - cy0) / R > CLIP) {
      const i = (y * W + x) * C;
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
    }
  }
}

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .resize(OUT_SIZE, OUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);
const m = await sharp(OUT).metadata();
console.log("wrote", OUT, `${m.width}x${m.height}`);
