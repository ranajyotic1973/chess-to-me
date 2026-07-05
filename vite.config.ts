import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Read the version from package.json (kept in sync with the git tag by
// scripts/sync-version.js at build time) and inject it into index.html's
// %APP_VERSION% placeholder for the splash screen, in both dev and build.
function appVersionHtmlPlugin(): Plugin {
  const pkgPath = fileURLToPath(new URL("./package.json", import.meta.url));
  return {
    name: "app-version-html",
    transformIndexHtml(html) {
      const version = JSON.parse(readFileSync(pkgPath, "utf8")).version || "0.0.0-dev";
      return html.replace(/%APP_VERSION%/g, version);
    },
  };
}

export default defineConfig({
  plugins: [react(), appVersionHtmlPlugin()],
  base: "./",
});
