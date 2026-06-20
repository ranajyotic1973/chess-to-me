## Context

The current OTB import loop in `electron/main.ts` (`db:import-otb-dir` handler) interleaves extraction and import per file: for archive N it extracts, imports, then moves to archive N+1. The `db:otb-dir-progress` events emitted during this loop show per-file sub-percentages (0 → 100 for each archive) so the overall progress indicator in the status bar and settings panel oscillates, appearing jumpy and uninformative.

The per-file sub-progress was designed when imports were sequential (one file at a time). The codebase already supports up to 4 parallel extraction workers via `doImportGamesFile` with per-slot extract directories, but the event shape doesn't carry a reliable overall progress signal.

## Goals / Non-Goals

**Goals:**
- Restructure the import into two clean sequential phases: extract-all, then import-all.
- Emit a monotonically increasing `overallPercent` on every `db:otb-dir-progress` event.
- Keep the status bar and settings panel progress display smooth with no backwards jumps.
- Retain the existing 4-parallel-worker extraction capability.
- No new npm dependencies.

**Non-Goals:**
- Counting individual games before import begins (prohibitively slow on gigabyte PGN files).
- Per-game granularity within a single file's import progress.
- Changing the `db:otb-dir-complete` event shape.
- Modifying single-file import (`db:import-games-7z`) — that is a separate flow.

## Decisions

### Decision 1 — Two-phase pipeline with 50/50 weight split

Extraction and import are each given 50% of the overall progress bar.

- `overallPercent` during extraction = `Math.round((archivesExtracted / totalFiles) * 50)`
- `overallPercent` during import = `50 + Math.round((archivesImported / totalFiles) * 50)`

**Why 50/50?** Extraction (decompression of `.7z`) and PGN import (SQLite writes) are roughly comparable in wall-clock time for Gigabase-class archives. A fixed split avoids needing to measure either phase's actual duration. If extraction turns out to be significantly faster, the bar will appear to stall in the import phase — acceptable given the simplicity.

**Alternative considered:** Weight by file size. Rejected because `.7z` file size does not correlate well with import time (compression ratio varies), and it adds complexity.

### Decision 2 — Extract all archives first, then import

Phase 1 runs all extractions (up to 4 in parallel) and collects the resulting PGN directories. Phase 2 then imports sequentially file-by-file using the shared SQLite connection (already established in the current code).

**Why extract-all first?**
- Eliminates the oscillating progress pattern entirely — the bar only ever moves forward.
- Disk I/O (extraction) and CPU/SQLite (import) are naturally pipelined: disk peaks in phase 1, SQLite peaks in phase 2.
- Simpler to reason about: if extraction fails for an archive, it is excluded from import without affecting the already-imported batch.

**Alternative considered:** Parallel extract+import pipeline (extract N while importing N-1). Rejected because SQLite with better-sqlite3 is synchronous and single-connection; overlapping import with extraction would not speed up the SQLite writes and would complicate progress calculation.

### Decision 3 — Extend `db:otb-dir-progress` payload additively

Add `overallPercent: number` and `phase: "extracting" | "importing"` fields to the existing event payload. All existing fields (`fileIndex`, `totalFiles`, `fileName`, `percent`, `message`) are retained unchanged.

**Why additive?** Avoids breaking `AppStatusBar` and `SettingsPanel` event handlers that already consume `fileIndex`, `totalFiles`, and `message`. Both consumers are updated in the same PR to use `overallPercent` as the primary display signal.

### Decision 4 — Store extraction results in memory, not on disk

Phase 1 populates an array `extractedSlots: Array<{ archivePath: string; extractDir: string; pgnFiles: string[] }>`. Phase 2 iterates this array. No intermediate manifest file is written to disk.

**Why?** The number of archives is at most a few dozen; the list fits easily in memory. Disk-based manifests add complexity and a failure mode if the manifest write fails.

### Decision 5 — Error isolation: extraction failure skips the archive, does not abort

If `extract7z` throws for a given archive, that slot is logged, counted in `errors`, and omitted from the phase 2 import list. The remaining archives are still imported.

This matches the existing behaviour of the per-file loop.

## Risks / Trade-offs

- **All-extract-first increases peak disk usage** — all archives are decompressed before any SQLite writes begin. A 13-archive Gigabase set can expand to ~50 GB of PGN on disk simultaneously. → Mitigation: document this in the UI ("Ensure sufficient free disk space before importing"). A future improvement could extract and import one batch at a time, but that is out of scope here.

- **Extraction stall hides import progress** — if extraction of a large archive takes a long time, the bar stalls at some value < 50% with no sub-file feedback. → Acceptable: the status bar still shows the active archive name and an animated progress indicator, preventing the impression of a freeze.

- **50/50 weight may feel unbalanced** — if extraction is fast (SSDs) and import is slow (spinning disk), the bar jumps to 50% quickly then crawls. → Mitigation: phase labels ("Extracting archives" vs "Importing games") give the user contextual information even if the bar moves unevenly.

## Migration Plan

All changes are in-process (Electron main process + renderer components). No database migrations, no installer changes, no external services. Rollback is reverting the commit.

## Open Questions

- Should extraction parallelism (currently 4) be tunable? Deferred — the current default is already in place and works well.
- Should the UI warn if free disk space is below a threshold before starting? Useful but out of scope for this change.
