#!/usr/bin/env node
// Generates build/icon.png, build/icon.ico, build/icon.icns
// from the white queen piece bundled with the chessboard library.
const sharp = require("sharp");
const png2icons = require("png2icons");
const fs = require("fs");
const path = require("path");

const QUEEN_SRC = path.join(
  __dirname, "..", "public", "chesspieces", "wikipedia", "wQ.png"
);
const ICO  = path.join(__dirname, "..", "build", "icon.ico");
const ICNS = path.join(__dirname, "..", "build", "icon.icns");
const PNG  = path.join(__dirname, "..", "build", "icon.png");

// Transparent background — the queen piece renders on whatever the OS puts behind it
const BG = { r: 0, g: 0, b: 0, alpha: 0 };
// Padding: 12% of icon size on each side keeps the queen from touching edges
const PADDING_RATIO = 0.12;

/** Build one square icon buffer at `size` pixels. */
async function makeIconBuffer(size) {
  const padding  = Math.round(size * PADDING_RATIO);
  const pieceSize = size - padding * 2;

  // Scale the queen piece to fit inside the padded area
  const pieceBuf = await sharp(QUEEN_SRC)
    .resize(pieceSize, pieceSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Composite the queen centred on the solid background
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: pieceBuf, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(QUEEN_SRC)) {
    console.error(`Source image not found: ${QUEEN_SRC}`);
    process.exit(1);
  }

  // ── build/icon.png — 512×512, used for Linux and as the reference image ──
  const src512 = await makeIconBuffer(512);
  fs.writeFileSync(PNG, src512);
  console.log("✓ build/icon.png  (512×512)");

  // ── build/icon.ico — Windows, multi-size PNG-in-ICO ──
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngs  = await Promise.all(icoSizes.map(s => makeIconBuffer(s)));

  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0);              // reserved
  hdr.writeUInt16LE(1, 2);             // type = ICO
  hdr.writeUInt16LE(icoSizes.length, 4);

  const dir = Buffer.alloc(icoSizes.length * 16);
  let offset = 6 + icoSizes.length * 16;
  icoPngs.forEach((buf, i) => {
    const s = icoSizes[i];
    dir.writeUInt8(s === 256 ? 0 : s, i * 16);      // width  (0 encodes 256)
    dir.writeUInt8(s === 256 ? 0 : s, i * 16 + 1);  // height
    dir.writeUInt8(0, i * 16 + 2);                  // colour count
    dir.writeUInt8(0, i * 16 + 3);                  // reserved
    dir.writeUInt16LE(1,  i * 16 + 4);              // planes
    dir.writeUInt16LE(32, i * 16 + 6);              // bits per pixel
    dir.writeUInt32LE(buf.length, i * 16 + 8);      // data size
    dir.writeUInt32LE(offset,     i * 16 + 12);     // data offset
    offset += buf.length;
  });

  fs.writeFileSync(ICO, Buffer.concat([hdr, dir, ...icoPngs]));
  console.log(`✓ build/icon.ico  (${icoSizes.join(", ")} px)`);

  // ── build/icon.icns — macOS ──
  const src1024 = await makeIconBuffer(1024);
  const icns = png2icons.createICNS(src1024, png2icons.BICUBIC, 0);
  if (icns) {
    fs.writeFileSync(ICNS, icns);
    console.log("✓ build/icon.icns");
  } else {
    console.warn("⚠ icon.icns generation failed — macOS builds may use a placeholder");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
