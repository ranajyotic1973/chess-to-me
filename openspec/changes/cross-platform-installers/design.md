## Context

Chess To Me is an Electron 34 application. `electron-builder` v26 is already installed and produces a Windows x64 NSIS installer via `npm run dist:win`. The `build/` directory contains `icon.ico` and `icon.png`. Native dependencies (`better-sqlite3`, `7zip-bin`) require per-platform compiled binaries. No CI pipeline exists today.

## Goals / Non-Goals

**Goals:**
- Produce installable artifacts for Windows (x64, arm64), macOS (x64 + arm64 universal DMG), and Linux/Ubuntu (x64, arm64 — AppImage + deb)
- Use only open-source tooling (`electron-builder`, NSIS via electron-builder, GitHub Actions free tier)
- Keep local dev workflow unchanged (`npm run dist:win` still works)
- Add `dist:mac` and `dist:linux` npm scripts for local builds
- Automate multi-platform release via GitHub Actions on version tag push (`v*.*.*`)

**Non-Goals:**
- Code signing / notarization (can be layered on later with Apple Developer ID and EV certificate)
- Windows x86 (32-bit) — Electron 34 dropped 32-bit Windows support
- Auto-update (`electron-updater`) — separate initiative
- Portable/zip packages — installers only for now

## Decisions

### D1: Keep electron-builder (do not switch to electron-forge)
`electron-builder` is already installed and configured; switching to `electron-forge` would require migrating the existing build config with no material benefit. electron-builder v26 supports all required targets natively.

*Alternatives considered:* electron-forge (more opinionated, requires restructuring); plain `asar` + OS packaging scripts (too low-level, duplicates what electron-builder provides).

### D2: macOS — single universal DMG (not two separate builds)
`electron-builder --mac --universal` produces a fat binary containing both x64 and arm64 slices. This is the Apple-recommended approach and simplifies distribution to a single download link.

*Tradeoff:* Universal DMG is ~2× the size of a single-arch build. Acceptable given modern bandwidth.

### D3: Linux — AppImage (universal) as primary + deb for Ubuntu
AppImage runs on any Linux distro without installation and is self-contained. deb targets Ubuntu/Debian users who prefer system package managers. arm64 AppImage and deb are produced from the same Linux runner using electron-builder's cross-arch flag (`--arm64`) with QEMU.

### D4: Windows arm64 — cross-compiled from Windows x64 CI runner
electron-builder can produce a Windows arm64 NSIS installer from a Windows x64 machine (no separate runner needed). `better-sqlite3` requires a separate rebuild step targeting `arm64`; handled via `electron-rebuild --arch arm64` before the arm64 build step.

### D5: GitHub Actions matrix — one job per OS, not per arch
macOS and Windows produce multiple arches in a single CI job (universal / cross-compile). Linux runs two jobs: `linux-x64` and `linux-arm64` (arm64 uses QEMU `docker/setup-qemu-action`). This minimises billable minutes while keeping each job focused.

### D6: Native module strategy — asarUnpack + prebuilt detection
`better-sqlite3` and `7zip-bin` must be outside the asar archive. `asarUnpack` patterns in `package.json` already handle `7zip-bin`; extend to cover `better-sqlite3`. Each CI job runs `electron-rebuild` (already scripted as `npm run rebuild:native`) for the target arch before `electron-builder`. `fzstd` is pure WASM and needs no special handling.

### D7: Icon assets — derive from existing `build/icon.png`
`build/icon.png` already exists (512×512). The macOS `.icns` will be generated from it via `electron-builder`'s built-in icon conversion (requires macOS runner OR `png2icons` npm package on any runner). The `.icns` is committed to `build/` so Windows and Linux jobs can produce a complete build without a macOS runner dependency.

## Risks / Trade-offs

- **[Risk] macOS Gatekeeper warning** — Without notarization, users see "unidentified developer" on first launch. → Mitigation: document workaround (right-click → Open). Notarization can be added later.
- **[Risk] Linux arm64 QEMU build slow** — QEMU emulation on GitHub Actions is significantly slower than native arm64. → Mitigation: arm64 Linux build is a separate optional job; failures don't block the release.
- **[Risk] `better-sqlite3` rebuild failures on arm64** — The native addon may not compile cleanly via QEMU. → Mitigation: use `@electron/rebuild` (preferred over deprecated `electron-rebuild`) and pin to a tested Node/Electron ABI.
- **[Risk] macOS `.icns` generation without a macOS machine** — `png2icons` output quality is lower than Apple's `iconutil`. → Mitigation: commit a pre-generated `.icns` to the repo rather than generating at build time.

## Migration Plan

1. Generate and commit `build/icon.icns` from `build/icon.png` (one-time, done on any macOS machine or via `png2icons`)
2. Update `package.json` `build` section with new targets (non-breaking — existing `dist:win` path unchanged)
3. Add `dist:mac` and `dist:linux` npm scripts
4. Add `.github/workflows/release.yml`
5. Tag a test release (`v0.0.1-rc1`) to validate the CI matrix end-to-end

**Rollback:** Delete the GitHub Actions workflow file; local Windows build is unaffected.

## Open Questions

- Should the GitHub release be drafted (manual publish) or auto-published on tag? → Recommend draft first until pipeline is validated.
- Is an Apple Developer ID certificate available? → If yes, add notarization secrets to CI; if no, ship unsigned (document Gatekeeper workaround).
