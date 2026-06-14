## 1. Icon Assets

- [x] 1.1 Verify `build/icon.png` is at least 512×512px; resize or re-export from source if needed
- [x] 1.2 Generate `build/icon.icns` from `build/icon.png` (use `png2icons` npm package or Apple `iconutil` on macOS)
- [x] 1.3 Commit `build/icon.icns` to the repository

## 2. electron-builder Configuration

- [x] 2.1 Add `asarUnpack` to `package.json` build config covering `**/better-sqlite3/**/*.node` and `**/7zip-bin/**`
- [x] 2.2 Add `mac` target block: `{ "target": [{ "target": "dmg", "arch": ["universal"] }], "icon": "build/icon.icns" }`
- [x] 2.3 Add `linux` target block: `{ "target": [{ "target": "AppImage", "arch": ["x64","arm64"] }, { "target": "deb", "arch": ["x64","arm64"] }], "icon": "build/icon.png" }`
- [x] 2.4 Extend existing `win` target to include `arm64` arch alongside the existing `x64` entry
- [x] 2.5 Set `directories.output` to `release` (already present — verify it is correct)
- [x] 2.6 Add `productName`, `copyright`, and `artifactName` fields for consistent installer filenames

## 3. npm Scripts

- [x] 3.1 Add `"dist:mac": "npm run build && electron-builder --mac"` to `package.json` scripts
- [x] 3.2 Add `"dist:linux": "npm run build && electron-builder --linux"` to `package.json` scripts
- [x] 3.3 Verify existing `"dist:win"` still builds successfully after the config changes

## 4. Native Module Rebuild Helper

- [x] 4.1 Replace `electron-rebuild` with `@electron/rebuild` in `devDependencies` (electron-rebuild is deprecated)
- [x] 4.2 Update `"rebuild:native"` script in `package.json` to use `@electron/rebuild -f -w better-sqlite3`
- [x] 4.3 Verify local Windows build still works after the rebuild script change

## 5. GitHub Actions — Release Workflow

- [x] 5.1 Create `.github/workflows/release.yml` with trigger `on: push: tags: ['v*.*.*']`
- [x] 5.2 Add `build-windows` job using `windows-latest` runner: checkout → setup Node → install deps → `rebuild:native` (x64) → `electron-builder --win --x64` → `rebuild:native --arch arm64` → `electron-builder --win --arm64` → upload artifacts
- [x] 5.3 Add `build-mac` job using `macos-latest` runner: checkout → setup Node → install deps → `rebuild:native` → `electron-builder --mac --universal` → upload artifacts
- [x] 5.4 Add `build-linux-x64` job using `ubuntu-latest` runner: checkout → setup Node → install deps → `rebuild:native` → `electron-builder --linux --x64` → upload artifacts
- [x] 5.5 Add `build-linux-arm64` job using `ubuntu-latest` runner with `docker/setup-qemu-action` for arm64 emulation: checkout → setup QEMU → setup Node → install deps → `rebuild:native --arch arm64` → `electron-builder --linux --arm64` → upload artifacts
- [x] 5.6 Add `create-release` job that depends on all four build jobs, downloads all uploaded artifacts, and creates a GitHub Release draft using `softprops/action-gh-release`

## 6. Verification — Local Builds

- [x] 6.1 Run `npm run dist:win` on Windows and confirm x64 NSIS installer is produced in `release/`
- [ ] 6.2 Run `npm run dist:mac` on macOS and confirm universal DMG is produced in `release/`
- [ ] 6.3 Run `npm run dist:linux` on Linux and confirm x64 AppImage and deb are produced in `release/`
- [ ] 6.4 Install each local build and verify the app launches without native module errors

## 7. Verification — CI Pipeline

- [ ] 7.1 Push a test tag (`v0.0.1-rc1`) and confirm all four CI jobs start in parallel
- [ ] 7.2 Verify the GitHub Release draft is created with all expected artifact files attached
- [ ] 7.3 Download and install the macOS DMG on both Intel and Apple Silicon machines; verify app launches
- [ ] 7.4 Download and install the Linux arm64 AppImage on an arm64 device or VM; verify app launches
- [ ] 7.5 Delete the test release and tag after validation
