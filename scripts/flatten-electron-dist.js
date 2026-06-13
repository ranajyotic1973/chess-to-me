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
  fs.renameSync(path.join(src, file), path.join(dest, file));
}
fs.rmdirSync(src);
console.log("Flattened electron/dist/electron/ → electron/dist/");
