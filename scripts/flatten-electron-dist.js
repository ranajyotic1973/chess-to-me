#!/usr/bin/env node
// Flattens electron/dist/electron/*.{js,js.map,d.ts,d.ts.map} → electron/dist/
// Works on Windows, macOS, and Linux.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "electron", "dist", "electron");
const dest = path.join(__dirname, "..", "electron", "dist");

if (!fs.existsSync(src)) {
  console.log("Nothing to flatten (electron/dist/electron/ does not exist).");
  process.exit(0);
}

for (const file of fs.readdirSync(src)) {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);

  // On Windows, renameSync fails if destination exists. Remove it first.
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (stat.isDirectory()) {
      // Remove directory recursively
      fs.rmSync(destPath, { recursive: true, force: true });
    } else {
      // Remove file
      fs.unlinkSync(destPath);
    }
  }

  fs.renameSync(srcPath, destPath);
}
fs.rmSync(src, { recursive: true, force: true });
console.log("Flattened electron/dist/electron/ → electron/dist/");
