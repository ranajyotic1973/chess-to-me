## Why

The games database requires a large corpus of historical OTB games from Lumbrasgigabase (lumbrasgigabase.com), but the app currently provides no guidance on how to obtain them and no mechanism to import them — users are left with no path to build a meaningful games database. This change adds the missing onboarding flow so a user can go from zero to a fully-populated OTB database by following in-app instructions and selecting a download directory.

## What Changes

- **Settings panel** gains a new "OTB Games Database" subsection with:
  - Instructional text telling the user to download all `*OTB*.7z` files from lumbrasgigabase.com into a local directory.
  - A directory path field (text input + "Browse…" button that opens a folder-select dialog).
  - An "Import Games" button that triggers the import pipeline.
  - Live progress display (phase label, progress bar, game count) during import.
  - Status line showing the current imported game count and last import date once complete.
- **Main process** gains an IPC handler `games:import-otb-directory` that:
  1. Scans the user-supplied directory for files matching `*OTB*.7z`.
  2. Decompresses each `.7z` archive using the `node-7z` (or `7zip-bin` + `node-7z`) package.
  3. Parses the extracted PGN(s) and bulk-inserts into the existing `games.db` schema via existing import helpers.
  4. Emits progress events (`db:import-progress`) for each phase: scanning, decompressing, importing.
  5. Returns a summary `{ ok, imported, skipped, errors }` on completion.
- **Settings persistence**: the chosen directory path is saved to user settings so the field re-populates on next open.

## Capabilities

### New Capabilities

- `otb-games-import`: Directory-based import of `*OTB*.7z` archives from Lumbrasgigabase into the local games database — covering the Settings UI entry point, folder browse dialog, 7z decompression, PGN parsing, bulk DB insert, and progress streaming.

### Modified Capabilities

- `games-database`: Extends the existing requirement set with OTB bulk-import requirements (directory path setting, `*OTB*.7z` file pattern, decompression step, and import progress IPC events). The existing TWIC download and search requirements are unchanged.
- `database-updater`: The Settings panel "Databases" section is extended to include the new OTB import subsection alongside the existing puzzle/TWIC controls.

## Impact

- **`electron/main.ts`**: new `games:import-otb-directory` IPC handler; new `db:import-progress` IPC event emission.
- **`src/components/SettingsPanel.tsx`**: new OTB import subsection with directory field, browse button, import button, and progress display.
- **`electron/preload.ts`**: expose `importOtbDirectory(dirPath)` and subscribe to `db:import-progress` events.
- **`src/types/index.ts`**: `ElectronAPI` extended with new method signatures.
- **New dependency**: `node-7z` + `7zip-bin` (or equivalent cross-platform 7z extraction library).
- **Settings storage**: one new key (`otbImportDir`) added to the existing user settings JSON.
