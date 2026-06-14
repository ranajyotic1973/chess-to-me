## Context

Lumbrasgigabase publishes the complete OTB master game collection as a set of large `.7z` archives (one per era or category, e.g. `OTB_2400_1900-2000.7z`, `OTB_2400_2001-2010.7z`, …) plus a rolling monthly update file. A user who wants a full games database must download **all** historical archives from the download page, not just the monthly update.

The app currently has a single-file "Import PGN / .7z…" button that opens a file picker for one archive at a time. There is a caption link to lumbrasgigabase.com but no guidance on the multi-file setup process, and no way to import a whole directory in one action.

The existing `doImportGamesFile(filePath, sendProgress)` function in `electron/main.ts` already handles 7z extraction, PGN parsing, and SQLite bulk-insert for a single file. The new feature must orchestrate that function across multiple files without duplicating any extraction or import logic.

## Goals / Non-Goals

**Goals:**
- Explain the download workflow to the user in Settings (what files, where to download from, where to put them).
- Let the user specify a **directory** (not individual files) as the source for OTB archives.
- Scan that directory for `*OTB*.7z` files, skip already-imported ones, and import the rest sequentially.
- Persist the chosen directory path in user settings so it pre-fills on next open.
- Reuse existing `doImportGamesFile`, progress events, and DB schema without modification.

**Non-Goals:**
- Automatic download of files from Lumbrasgigabase (direct download would bypass their download page).
- Support for `.pgn` or `.zip` files in the directory scan (only `*OTB*.7z` as specified).
- Parallel import of multiple archives (sequential avoids SQLite write contention and makes progress predictable).
- Replacing the existing single-file import button (it stays for users who want to import one-off files).

## Decisions

### Directory picker instead of file picker for bulk import
**Decision**: Add a separate "OTB Directory" subsection with a folder-select dialog (`dialog.showOpenDialog` with `openDirectory` property).
**Rationale**: The user's request is explicit — they want to point the app at a folder containing all downloaded archives. A folder dialog prevents selecting individual files by mistake.
**Alternative considered**: Multi-select file dialog. Rejected — tedious when all files are in one folder and doesn't scale to 10+ archives.

### Track already-imported archives to enable incremental monthly updates
**Decision**: Maintain a JSON tracking file `userData/chess-to-me/imported-otb-files.json` containing an array of archive filenames (basename only) that have been successfully imported.
**Rationale**: A user will add new monthly update files to the same directory each month and click "Import All" again. Without tracking, all historical archives would be re-imported every time (hours of processing). Tracking lets the handler skip already-done files and only process new ones.
**Alternative considered**: Track by file mtime or size checksum. Rejected — filename is the natural identity for Lumbrasgigabase archives (they include the date in the name) and is simpler to implement.

### New `db:import-otb-dir` IPC handler, not extending the existing single-file handler
**Decision**: Add a new `db:import-otb-dir` handler that loops over matched files and calls `doImportGamesFile` per file. Keep `db:import-games-7z` (single-file) unchanged.
**Rationale**: The two use cases have different state machines — single-file import has a simple start/complete cycle, while multi-file import needs per-file progress and an outer counter ("File 2 of 7"). Merging them would complicate both paths.

### Persist directory path via existing `electron-store` settings
**Decision**: Save the directory path under the key `otbImportDir` in the existing settings store (same store used for engine paths, LLM keys, etc.).
**Rationale**: Consistent with how other paths are persisted; no new storage mechanism needed. The SettingsPanel already has patterns for reading/writing settings fields via `onFieldChange` and `formState`.

### Progress reporting: per-file outer progress + per-file inner progress
**Decision**: Emit a new `db:otb-dir-progress` event with `{ fileIndex, totalFiles, fileName, phase, percent, message }` at each inner progress tick, plus a `db:otb-dir-complete` event with the aggregate result `{ ok, imported, skipped, errors }` at the end.
**Rationale**: The renderer needs to know both "File 3 of 10" (outer) and "Decompressing 45%" (inner) to show meaningful progress. Using a distinct event name (`db:otb-dir-progress` vs `db:progress`) prevents interference with the existing single-file import progress subscription.

## Risks / Trade-offs

**[Risk] Very long import time for large collections** → Mitigation: Progress display shows current file index and overall file count. Import runs in the background (non-blocking), same pattern as the existing single-file import. User can close Settings and continue using the app.

**[Risk] Duplicate games if user re-imports after the tracking file is deleted** → Mitigation: The existing database schema does not enforce unique game rows, so duplicates are technically possible. However, re-import would be an unusual manual action; we document this in the UI caption. Deduplication is a separate concern not in scope.

**[Risk] `node-7z` / `7zip-bin` native binaries may not work on all platforms after packaging** → Mitigation: The existing `doImportGamesFile` already uses these packages for single-file import. If they work for single-file import today, they work for the new directory scan too — no new packaging risk is introduced.

**[Risk] 7z filenames that match `*OTB*.7z` but are not Lumbrasgigabase archives** → Mitigation: The scan is non-destructive (read-only); an unexpected file simply fails to import and is counted in `errors`, reported in the completion summary. The tracking file is only updated for successfully imported files.

## Open Questions

- Should the "Import All" button also offer a "Force re-import all" checkbox that bypasses the tracking file? Deferred — can be added later if users request it.
- Should monthly update files follow a different naming pattern (e.g., `OTB_update_2026-05.7z`)? Lumbrasgigabase uses `*OTB*.7z` for all files, so the same pattern covers both historical and monthly files.
