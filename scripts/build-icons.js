#!/usr/bin/env node
// Generates build/icon.ico and build/icon.icns from public/queen-icon.svg
const sharp = require("sharp");
const png2icons = require("png2icons");
const fs = require("fs");
const path = require("path");

const SVG  = path.join(__dirname, "..", "public", "queen-icon.svg");
const ICO  = path.join(__dirname, "..", "build", "icon.ico");
const ICNS = path.join(__dirname, "..", "build", "icon.icns");
const PNG  = path.join(__dirname, "..", "build", "icon.png");

async function main() {
  const svgBuf = fs.readFileSync(SVG);

  // Render a crisp 1024×1024 source PNG for icon generation
  const src1024 = await sharp(svgBuf).resize(1024, 1024).png().toBuffer();

  // --- build/icon.png (512×512, used by Linux and as a reference) ---
  const src512 = await sharp(svgBuf).resize(512, 512).png().toBuffer();
  fs.writeFileSync(PNG, src512);
  console.log("✓ build/icon.png");

  // --- build/icon.ico (Windows — multi-size PNG-in-ICO) ---
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs  = await Promise.all(
    sizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer())
  );

  // ICO binary: 6-byte header + N×16-byte dir entries + raw PNG blobs
  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0); // reserved
  hdr.writeUInt16LE(1, 2); // type = ICO
  hdr.writeUInt16LE(sizes.length, 4);

  const dir = Buffer.alloc(sizes.length * 16);
  let offset = 6 + sizes.length * 16;
  pngs.forEach((buf, i) => {
    const s = sizes[i];
    dir.writeUInt8(s === 256 ? 0 : s, i * 16);      // width  (0 == 256)
    dir.writeUInt8(s === 256 ? 0 : s, i * 16 + 1);  // height (0 == 256)
    dir.writeUInt8(0, i * 16 + 2);                  // color count
    dir.writeUInt8(0, i * 16 + 3);                  // reserved
    dir.writeUInt16LE(1,  i * 16 + 4);              // planes
    dir.writeUInt16LE(32, i * 16 + 6);              // bpp
    dir.writeUInt32LE(buf.length, i * 16 + 8);      // size
    dir.writeUInt32LE(offset,     i * 16 + 12);     // offset
    offset += buf.length;
  });

  fs.writeFileSync(ICO, Buffer.concat([hdr, dir, ...pngs]));
  console.log(`✓ build/icon.ico  (${sizes.join(", ")} px)`);

  // --- build/icon.icns (macOS) ---
  const icns = png2icons.createICNS(src1024, png2icons.BICUBIC, 0);
  if (icns) {
    fs.writeFileSync(ICNS, icns);
    console.log("✓ build/icon.icns");
  } else {
    console.warn("⚠ icon.icns generation failed");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
