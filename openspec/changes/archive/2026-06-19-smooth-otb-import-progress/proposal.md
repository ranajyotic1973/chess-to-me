## Why

The OTB games import progress display is jumpy and disorienting: each archive goes 0 → 100% independently, then snaps back to 0% for the next file. Users have no sense of how much work remains overall, making it hard to know whether to wait or walk away.

## What Changes

- The import pipeline is restructured into two explicit phases: **Extract All** then **Import All**, with an overall percentage driven by whole-file completion rather than sub-file byte progress.
- Phase 1 extracts every pending `.7z` archive before any PGN importing begins, so the extraction and import progress bars don't interleave.
- Phase 2 imports the extracted PGN files and reports progress as `filesCompleted / totalFiles × 100` — a monotonically increasing number that never jumps backwards.
- Counting individual games before import is **not** done: a typical OTB archive contains millions of games and scanning for `[Event ` tokens across gigabytes of text would add minutes of wall-clock delay before any progress appears. File-count-based progress is nearly as informative and starts immediately.
- The `db:otb-dir-progress` event payload gains an `overallPercent` field so the status bar and any other subscribers can display a single smooth percentage without re-computing it.
- The status bar centre section shows phase-aware labels: "Extracting archives (N/M)" during phase 1 and "Importing games (N/M files done)" during phase 2.

## Capabilities

### New Capabilities

_(none — this is a behaviour change to an existing flow)_

### Modified Capabilities

- `otb-games-import`: Import flow restructured from interleaved extract+import per file to sequential two-phase pipeline (extract-all → import-all). Progress events now carry a monotonic `overallPercent`. Requirement on per-file sub-progress display is removed; overall file-count progress is the primary progress signal.

## Impact

- `electron/main.ts` — `db:import-otb-dir` handler rewritten to two-phase loop; `doImportGamesFile` opts extended with `phase` hint to skip extraction on demand.
- `db:otb-dir-progress` IPC event shape gains `overallPercent: number` and `phase: "extracting" | "importing"` fields (additive — existing fields retained for backwards compat).
- `src/components/AppStatusBar.tsx` — OTB progress slot labels updated to reflect new phases.
- `src/components/SettingsPanel.tsx` — progress display updated to show overall percentage.
- No schema migrations, no new dependencies, no breaking API changes for callers that only read existing fields.
