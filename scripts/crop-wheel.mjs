// Crop the standalone chrome wheel (icon-only version, middle-right of the
// brand sheet) from public/logo.png for use as the round chat button.
// Usage: node scripts/crop-wheel.mjs
import sharp from "sharp";

const SRC = "./public/logo.png"; // 1448 x 1086, transparent bg
const OUT = "./public/chat-wheel.png";

// Generous box around the standalone wheel; trim() tightens to the artwork.
await sharp(SRC)
  .extract({ left: 900, top: 470, width: 270, height: 270 })
  .trim()
  .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(OUT);

const m = await sharp(OUT).metadata();
console.log("wrote", OUT, `${m.width}x${m.height}`);
