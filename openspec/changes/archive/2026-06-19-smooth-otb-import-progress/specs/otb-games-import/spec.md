## MODIFIED Requirements

### Requirement: Import All OTB Files button triggers a two-phase directory import
The Games Database section SHALL include an "Import All OTB Files" button. Clicking it SHALL invoke the `db:import-otb-dir` IPC handler with the current `otbImportDir` path. The handler SHALL execute the import in two sequential phases:

**Phase 1 — Extract all archives:**
1. Scan the specified directory for files whose names match the glob `*OTB*.7z` (case-insensitive on Windows).
2. Read `userData/chess-to-me/imported-otb-files.json`; exclude files whose basename is already tracked.
3. Extract every remaining archive into its own per-slot temporary directory (`gamesExtractDir-slot0` … `gamesExtractDir-slot3`) using up to 4 parallel extraction workers.
4. Emit `db:otb-dir-progress` events with `phase: "extracting"` and a monotonically increasing `overallPercent` based on archives extracted so far.

**Phase 2 — Import all extracted PGN files:**
5. Open one shared SQLite connection for the entire batch.
6. For each archive whose extraction succeeded, import all PGN files found in its temporary directory, skipping FTS rebuild per file.
7. After each complete archive is imported, append its basename to the tracking JSON and emit `db:otb-dir-progress` with `phase: "importing"` and an updated `overallPercent`.
8. After all archives are processed, run a single FTS rebuild.
9. Return `{ ok: true, imported: N, skipped: N, errors: N }` on completion, or `{ ok: false, error: string }` if the directory cannot be scanned.

The button SHALL be disabled while an import is in progress.

#### Scenario: Two-phase progress — extract then import
- **WHEN** the user starts an import of five archives
- **THEN** `db:otb-dir-progress` events SHALL first arrive with `phase: "extracting"` as archives are unzipped, then with `phase: "importing"` as PGN data is written to the database — never interleaving the two phases

#### Scenario: Overall percent is monotonically increasing
- **WHEN** importing seven archives
- **THEN** each successive `db:otb-dir-progress` event SHALL have an `overallPercent` value greater than or equal to the previous event's value — the percentage SHALL never decrease

#### Scenario: First-time import with five OTB archives
- **WHEN** the user clicks "Import All OTB Files" with a directory containing five `*OTB*.7z` files and no tracking file
- **THEN** all five files SHALL be extracted then imported; the tracking file SHALL contain all five basenames on completion; the completion summary SHALL show `imported: 5, skipped: 0`

#### Scenario: Monthly update — one new file added to directory
- **WHEN** the user adds a new monthly archive to the directory and clicks "Import All OTB Files" again
- **THEN** only the new file SHALL be extracted and imported; the previously imported files SHALL be skipped; the completion summary SHALL show `imported: 1, skipped: 4`

#### Scenario: One archive fails extraction
- **WHEN** one archive is corrupt and extraction fails
- **THEN** that file SHALL be counted in `errors`, SHALL NOT be added to the tracking file, the import phase SHALL proceed with the remaining successfully extracted archives, and the final summary SHALL reflect the partial success

#### Scenario: No matching files found in directory
- **WHEN** the user clicks "Import All OTB Files" and the selected directory contains no `*OTB*.7z` files
- **THEN** the handler SHALL return `{ ok: true, imported: 0, skipped: 0, errors: 0 }` immediately

### Requirement: OTB directory import progress events carry an overall percentage
During a directory import the main process SHALL emit `db:otb-dir-progress` events with the extended shape:

```
{
  fileIndex: number,      // 1-based index of archive being processed
  totalFiles: number,     // total number of archives to process
  fileName: string,       // basename of archive being processed
  phase: "extracting" | "importing",
  percent: number,        // per-file sub-phase progress (0–100)
  message: string,        // human-readable detail
  overallPercent: number  // monotonic overall batch progress (0–100)
}
```

`overallPercent` SHALL be computed as:
- During extraction: `Math.round((archivesExtracted / totalFiles) * 50)` — extraction accounts for the first 50%.
- During import: `50 + Math.round((archivesImported / totalFiles) * 50)` — import accounts for the second 50%.

#### Scenario: overallPercent during extraction phase
- **WHEN** 3 of 10 archives have been fully extracted
- **THEN** the next `db:otb-dir-progress` event SHALL have `overallPercent: 15` (i.e. 3/10 × 50 = 15)

#### Scenario: overallPercent during import phase
- **WHEN** all 10 archives are extracted and 7 of 10 have been imported
- **THEN** the next `db:otb-dir-progress` event SHALL have `overallPercent: 85` (i.e. 50 + 7/10 × 50 = 85)

#### Scenario: overallPercent reaches 100 only at completion
- **WHEN** the final archive has been imported and the FTS rebuild is complete
- **THEN** the `db:otb-dir-complete` event SHALL be emitted and no further `db:otb-dir-progress` events SHALL be sent

## REMOVED Requirements

### Requirement: OTB directory import progress is streamed via a dedicated IPC event
**Reason**: Replaced by the updated requirement above which carries the same fields plus `overallPercent` and an explicit `phase` discriminator. The event channel (`db:otb-dir-progress`) is unchanged; only the payload contract is extended.
**Migration**: Consumers that read `fileIndex`, `totalFiles`, `fileName`, `percent`, and `message` continue to work without changes. Consumers SHOULD additionally read `overallPercent` and `phase` to display smooth progress.
