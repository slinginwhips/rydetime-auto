// One-off: build the dark-background header variant from logo-header.png —
// black artwork becomes white, the red script stays red.
// Usage: node scripts/process-logo-dark.mjs
import sharp from "sharp";

const SRC = "./public/logo-header.png";
const OUT = "./public/logo-header-dark.png";

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const isRed = r > 120 && r > g * 1.6 && r > b * 1.6;
  if (!isRed) {
    // Invert luminance for the black/gray artwork so it reads on #0A0A0A.
    data[i] = 255 - r;
    data[i + 1] = 255 - g;
    data[i + 2] = 255 - b;
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(OUT);

console.log("wrote", OUT);
