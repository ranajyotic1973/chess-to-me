### Requirement: Build targets cover all supported platforms and architectures
The `electron-builder` configuration in `package.json` SHALL define targets for Windows (NSIS, x64 and arm64), macOS (DMG, universal fat binary), and Linux (AppImage and deb, x64 and arm64). Each target SHALL produce a standalone installable artifact in the `release/` output directory.

#### Scenario: Windows x64 build produces NSIS installer
- **WHEN** `npm run dist:win` is executed on a Windows machine
- **THEN** a `.exe` NSIS installer named `Chess To Me Setup <version>.exe` SHALL appear in `release/`

#### Scenario: Windows arm64 build produces NSIS installer
- **WHEN** the GitHub Actions release workflow runs the Windows job
- **THEN** a `.exe` NSIS installer for arm64 SHALL appear in `release/`

#### Scenario: macOS universal build produces DMG
- **WHEN** `npm run dist:mac` is executed on a macOS machine or the macOS CI job runs
- **THEN** a single `.dmg` file containing both x64 and arm64 slices SHALL appear in `release/`

#### Scenario: Linux x64 build produces AppImage and deb
- **WHEN** `npm run dist:linux` is executed on an x64 Linux machine
- **THEN** a `.AppImage` and a `.deb` file SHALL appear in `release/`

#### Scenario: Linux arm64 build produces AppImage and deb
- **WHEN** the GitHub Actions Linux arm64 job runs
- **THEN** a `.AppImage` and a `.deb` for arm64 SHALL appear in `release/`

---

### Requirement: Icon assets exist for all target platforms
The `build/` directory SHALL contain `icon.ico` (Windows), `icon.icns` (macOS), and `icon.png` at minimum 512×512px (Linux). electron-builder SHALL reference these via its `icon` field per platform target.

#### Scenario: macOS build uses .icns icon
- **WHEN** the macOS build runs
- **THEN** the resulting `.app` bundle SHALL contain the icon derived from `build/icon.icns` and SHALL NOT show a generic Electron icon

#### Scenario: Linux build uses .png icon
- **WHEN** the Linux build runs
- **THEN** the installed application SHALL display the icon from `build/icon.png` in the desktop environment launcher

---

### Requirement: Native modules are excluded from the asar archive
`better-sqlite3` and `7zip-bin` SHALL be listed in the `asarUnpack` field of the electron-builder configuration so their compiled `.node` binaries are placed outside the asar archive and are loadable at runtime on all target platforms.

#### Scenario: App launches on macOS after install
- **WHEN** the macOS DMG is installed and the app is launched
- **THEN** the app SHALL start without a "Cannot find module" or "invalid ELF header" error related to `better-sqlite3` or `7zip-bin`

#### Scenario: App launches on Linux after install
- **WHEN** the Linux AppImage or deb is installed and run
- **THEN** the app SHALL start without native module load errors

---

### Requirement: GitHub Actions release workflow builds and publishes all platforms
A workflow file at `.github/workflows/release.yml` SHALL trigger on push of a tag matching `v*.*.*` and run four parallel jobs: `build-windows`, `build-mac`, `build-linux-x64`, and `build-linux-arm64`. Each job SHALL build the respective platform artifacts, rebuild native modules for all target architectures, and upload the resulting installer files. A `create-release` job SHALL collect all artifacts and publish them to a GitHub Release.

#### Scenario: Version tag triggers multi-platform build
- **WHEN** a git tag `v1.2.3` is pushed to the repository
- **THEN** the release workflow SHALL start automatically and all platform jobs SHALL run in parallel

#### Scenario: All artifacts are attached to the GitHub Release
- **WHEN** all CI jobs complete successfully
- **THEN** the GitHub Release SHALL contain installer files for Windows (x64, arm64), macOS (universal), and Linux (x64 and arm64 AppImage + deb)

#### Scenario: Tag not on main branch blocks release
- **WHEN** a git tag is pushed that does not point to a commit reachable from `main`
- **THEN** the `check-branch` guard job SHALL fail and all build jobs SHALL be blocked

#### Scenario: CI failure blocks release publication
- **WHEN** any platform build job fails
- **THEN** the GitHub Release SHALL NOT be published

---

### Requirement: Local per-platform build scripts are available
`package.json` SHALL expose `dist:win`, `dist:mac`, and `dist:linux` npm scripts. Each script SHALL run `npm run build` followed by `electron-builder` with the appropriate platform flag, producing artifacts locally in `release/` without requiring CI.

#### Scenario: Developer builds for current platform
- **WHEN** a developer runs `npm run dist:mac` on macOS
- **THEN** the DMG SHALL be produced in `release/` without requiring GitHub Actions or any external service

---

### Requirement: Native modules are rebuilt per target architecture before packaging
Before each platform artifact is produced, `@electron/rebuild` SHALL be run for the target Electron version and CPU architecture. This applies to both local builds and the CI workflow.

#### Scenario: better-sqlite3 loads on arm64 macOS
- **WHEN** the macOS universal build includes the arm64 slice
- **THEN** `better-sqlite3` SHALL have been compiled for the arm64 Electron ABI and SHALL load without error on Apple Silicon hardware

#### Scenario: better-sqlite3 loads on arm64 Linux
- **WHEN** the Linux arm64 AppImage is run on an arm64 device
- **THEN** `better-sqlite3` SHALL load and database operations SHALL function correctly
