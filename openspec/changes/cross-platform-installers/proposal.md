## Why

Chess To Me currently ships a Windows x64 installer only. To reach students and teachers on any machine — Windows, Mac, or Linux — the app must be packaged and installable on all major desktop platforms and CPU architectures (x86, x64, arm64) without requiring manual build setup.

## What Changes

- Extend `electron-builder` configuration in `package.json` to produce signed/unsigned installers for Windows (NSIS, x64 + arm64), macOS (DMG, x64 + arm64 universal), and Linux (AppImage + deb, x64 + arm64)
- Add a GitHub Actions CI workflow (`release.yml`) that builds all targets in parallel on native runners (Windows, macOS, Ubuntu) and publishes artifacts to GitHub Releases
- Provide a local build script (`scripts/build-all.sh` / `scripts/build-all.ps1`) that lets developers build for the current platform without CI
- Fix the macOS icon asset (`.icns`) and Linux icon (`.png` 512×512) which do not exist yet — only `build/icon.ico` is present
- Bundle native modules (`better-sqlite3`, `7zip-bin`) correctly per platform via `electron-builder`'s `asarUnpack` and `extraResources`

## Capabilities

### New Capabilities

- `build-distribution`: Defines build targets per OS/arch, CI release workflow, icon assets required, native module unpacking rules, and version tagging convention.

### Modified Capabilities

*(none — no existing spec-level behaviour changes)*

## Impact

- **`package.json` `build` section**: Add `mac`, `linux`, `win` multi-arch targets; update `asarUnpack` for native modules
- **`build/` directory**: Add `icon.icns` (macOS) and `icon.png` (Linux) icon assets
- **`.github/workflows/release.yml`**: New file — GitHub Actions matrix build and publish
- **`scripts/build-all.sh` / `build-all.ps1`**: New local build helpers
- **Dependencies**: No new runtime dependencies; `electron-builder` v26 already installed
- **Native modules**: `better-sqlite3` must be re-built per target platform via `electron-rebuild` in the CI workflow
