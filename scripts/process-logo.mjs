// Crop the header logo variants out of the brand sheet (public/logo.png).
// Bottom-right panel: chrome 3D wheel + white RYDETIME AUTO on a black pill → dark header.
// Bottom-left panel: same lockup on a white pill → light backgrounds.
// Usage: node scripts/process-logo.mjs
import sharp from "sharp";

const SRC = "./public/logo.png"; // 1448 x 1086 brand sheet, transparent bg

/**
 * Knock out the white/near-white backing that surrounds the pill, without
 * touching white pixels inside it (the RYDETIME text): BFS from the image
 * border across connected near-white/transparent pixels only.
 */
function knockoutEdgeWhite(data, width, height) {
  const nearWhite = (i) => {
    if (data[i + 3] === 0) return true;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return (r + g + b) / 3 > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 30;
  };
  const seen = new Uint8Array(width * height);
  const queue = [];
  for (let x = 0; x < width; x++) queue.push(x, x + (height - 1) * width);
  for (let y = 0; y < height; y++) queue.push(y * width, y * width + width - 1);
  while (queue.length) {
    const p = queue.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!nearWhite(i)) continue;
    data[i + 3] = 0;
    const x = p % width, y = (p / width) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < width - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - width);
    if (y < height - 1) queue.push(p + width);
  }
}

async function extractPanel(crop, out, { knockout = false } = {}) {
  const { data, info } = await sharp(SRC)
    .extract(crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Only the dark pill needs its white backing removed; the light panel's
  // pill is itself white, so the edge BFS would consume it.
  if (knockout) knockoutEdgeWhite(data, info.width, info.height);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .resize({ height: 192 }) // 4x of 48px display height for crisp retina rendering
    .png()
    .toFile(out);
  const m = await sharp(out).metadata();
  console.log("wrote", out, `${m.width}x${m.height}`);
}

// Panel regions measured off the sheet (bottom row starts ~y 800).
await extractPanel({ left: 740, top: 790, width: 700, height: 230 }, "./public/logo-header-dark.png", { knockout: true });
await extractPanel({ left: 20, top: 790, width: 700, height: 230 }, "./public/logo-header.png");
