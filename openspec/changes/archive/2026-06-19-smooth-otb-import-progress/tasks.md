## 1. Restructure main-process import pipeline

- [x] 1.1 In `electron/main.ts` `db:import-otb-dir` handler, split the background async block into two sequential phases: extract-all, then import-all
- [x] 1.2 Phase 1: run up to 4 parallel `extract7z` calls (one per archive), each writing to its own slot directory (`gamesExtractDir-slot0` … `gamesExtractDir-slot3`); collect `extractedSlots[]` array of `{ archivePath, extractDir, pgnFiles }` in memory
- [x] 1.3 Emit `db:otb-dir-progress` with `phase: "extracting"` and `overallPercent = Math.round((archivesExtracted / totalFiles) * 50)` after each archive extraction completes
- [x] 1.4 Phase 2: iterate `extractedSlots[]` sequentially; for each slot call `doImportGamesFile` with `{ skipFts: true, db: sharedDb, extractDir: slot.extractDir }`; do not re-extract (PGN files already on disk)
- [x] 1.5 Emit `db:otb-dir-progress` with `phase: "importing"` and `overallPercent = 50 + Math.round((archivesImported / totalFiles) * 50)` after each archive import completes
- [x] 1.6 After phase 2, run the single FTS rebuild on `sharedDb` as before

## 2. Update `doImportGamesFile` to support pre-extracted input

- [x] 2.1 Add a `preExtracted?: boolean` field to the opts parameter of `doImportGamesFile`; when `true`, skip the `extract7z` call and use `opts.extractDir` directly (files already present)
- [x] 2.2 Ensure `doImportGamesFile` with `preExtracted: true` still cleans up `opts.extractDir` on completion and on error

## 3. Extend the `db:otb-dir-progress` event payload

- [x] 3.1 Add `overallPercent: number` and `phase: "extracting" | "importing"` to every `db:otb-dir-progress` emission in the handler
- [x] 3.2 Verify that all existing fields (`fileIndex`, `totalFiles`, `fileName`, `percent`, `message`) are still emitted unchanged so existing consumers are not broken

## 4. Update the status bar to use `overallPercent`

- [x] 4.1 In `AppStatusBar.tsx` `onOtbDirProgress` handler, use `data.overallPercent` (instead of the recomputed value) for the `percent` field of the `"otb-import"` slot
- [x] 4.2 Update the slot label to reflect the new phases: use `"Extracting archives (N/M)"` when `data.phase === "extracting"` and `"Importing games (N/M)"` when `data.phase === "importing"`

## 5. Update the settings panel progress display

- [x] 5.1 In `SettingsPanel.tsx`, update the OTB import progress display to read `overallPercent` from the progress event and show it as the primary progress percentage
- [x] 5.2 Show a phase-aware label alongside the percentage ("Extracting…" / "Importing…")

## 6. Tests

- [x] 6.1 Add or update unit tests in `electron/main.test.ts` (or equivalent) verifying that `overallPercent` is monotonically non-decreasing across a simulated sequence of progress events
- [x] 6.2 Verify that existing `downloader.test.ts` and other electron tests still pass after the pipeline refactor
