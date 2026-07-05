#!/usr/bin/env node
// Derives the app version from the git tag and writes it into package.json's
// `version` field so the title bar (electron/main.ts getAppVersion) and the
// splash screen (index.html via the Vite transform) share one source of truth.
//
// Resolution order:
//   1. Exact tag on the current commit   (git describe --tags --exact-match)
//   2. Nearest reachable tag             (git describe --tags --abbrev=0)
//   3. Existing package.json version, else "0.0.0-dev"
// The leading "v" (e.g. v1.7.0) is stripped. The script never hard-fails the
// build: any git error falls through to the package.json / dev fallback.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

function gitTag() {
  const tryGit = (args) => {
    try {
      return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "";
    }
  };
  return tryGit(["describe", "--tags", "--exact-match"]) || tryGit(["describe", "--tags", "--abbrev=0"]);
}

const fallback = pkg.version || "0.0.0-dev";
const raw = gitTag();
const version = (raw ? raw.replace(/^v/, "") : fallback) || "0.0.0-dev";

if (pkg.version !== version) {
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log(`[sync-version] package.json version set to ${version}${raw ? ` (from git tag ${raw})` : " (fallback — no git tag)"}`);
} else {
  console.log(`[sync-version] version already ${version}${raw ? "" : " (fallback — no git tag)"}`);
}
