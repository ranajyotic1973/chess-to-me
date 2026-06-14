## 1. Main Process — IPC Handlers

- [x] 1.1 Add `db:browse-otb-dir` IPC handler in `electron/main.ts`: open `dialog.showOpenDialog` with `openDirectory` property; return `{ dirPath: string | null }`
- [x] 1.2 Add helper `getOtbTrackingFilePath()` in `electron/main.ts` returning `path.join(app.getPath("userData"), "chess-to-me", "imported-otb-files.json")`
- [x] 1.3 Add helpers `readOtbTracking(): string[]` and `writeOtbTracking(names: string[]): void` that read/write the JSON tracking array; initialise to `[]` if file absent
- [x] 1.4 Add `db:import-otb-dir` IPC handler that accepts `{ dirPath: string }`, scans for `*OTB*.7z` files (case-insensitive), loads the tracking list, skips already-imported basenames, and iterates remaining files sequentially calling `doImportGamesFile`
- [x] 1.5 Emit `db:otb-dir-progress` events from the `db:import-otb-dir` handler on each inner progress tick with `{ fileIndex, totalFiles, fileName, phase, percent, message }`
- [x] 1.6 Emit `db:otb-dir-complete` event from the `db:import-otb-dir` handler with `{ ok, imported, skipped, errors }` on completion; update the tracking file with newly imported basenames
- [x] 1.7 After each successful per-file import, append that file's basename to the tracking JSON immediately (so partial progress survives a crash mid-batch)
- [x] 1.8 Handle the case where the directory cannot be read (non-existent path, permission error): return `{ ok: false, error: string }` without emitting progress events

## 2. Preload & Types

- [x] 2.1 Expose `browseOtbDir`, `importOtbDir`, `onOtbDirProgress`, and `onOtbDirComplete` in `electron/preload.ts` via `contextBridge.exposeInMainWorld`
- [x] 2.2 Add TypeScript signatures for all four methods to the `ElectronAPI` interface in `src/types/index.ts`

## 3. Settings UI — State & Handlers

- [x] 3.1 In `SettingsPanel.tsx`, add local state `otbDir` (string) initialised from `formState.otbImportDir` (or empty string)
- [x] 3.2 Add `handleBrowseOtbDir` async function: calls `electronAPI.browseOtbDir()`, on non-null result updates `otbDir` state and calls `onFieldChange("otbImportDir", dirPath)`
- [x] 3.3 Add `handleImportOtbDir` async function: validates `otbDir` is non-empty, sets `dbActionLoading("games")`, subscribes to `db:otb-dir-progress` and `db:otb-dir-complete` events, calls `electronAPI.importOtbDir(otbDir)`, updates `dbActionMessage` on completion, and tears down subscriptions
- [x] 3.4 Update progress subscription logic to handle `db:otb-dir-progress` events separately from the existing `db:progress` events, displaying "File N of M: <filename> — <message>" in `dbActionMessage`

## 4. Settings UI — Render

- [x] 4.1 In the Games Database card in `SettingsPanel.tsx`, add instructional text above the existing status line explaining the Lumbrasgigabase download process; include a clickable link to the download page
- [x] 4.2 Add a `TextField` for the OTB directory path (value = `otbDir`, onChange updates local state) with a "Browse…" `Button` beside it
- [x] 4.3 Add an "Import All OTB Files" `Button` that calls `handleImportOtbDir`; disable it when `otbDir` is empty or `dbActionLoading` is set
- [x] 4.4 Display per-file progress when `dbActionLoading === "games"` and a directory import is in progress (show file counter and current filename)
- [x] 4.5 After completion, display the summary ("Imported N files, skipped M, N errors") using the existing `dbActionMessage` state

## 5. Settings Persistence

- [x] 5.1 Ensure `otbImportDir` is read from the electron-store settings on SettingsPanel mount and written back via `onFieldChange` / `onSaveSettings` (no new settings infrastructure needed — follows the same pattern as other path fields)

## 6. Tests

- [x] 6.1 Add unit tests in `electron/main.test.ts` (or a new `electron/otbImport.test.ts`) covering: `readOtbTracking` returns `[]` when file absent; `writeOtbTracking` creates the file; `db:import-otb-dir` skips already-tracked filenames; failed file import does not update tracking
- [x] 6.2 Verify that the `db:browse-otb-dir` handler returns `{ dirPath: null }` when dialog is cancelled (mock `dialog.showOpenDialog`)
