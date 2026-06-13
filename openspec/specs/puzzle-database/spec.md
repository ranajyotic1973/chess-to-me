## ADDED Requirements

### Requirement: Lichess puzzle CSV is downloaded and imported into local SQLite database
The system SHALL provide a mechanism to download `https://database.lichess.org/lichess_db_puzzle.csv.zst`, decompress it using `fzstd`, and import all rows into a local SQLite database at `data/puzzles/puzzles.db`. The import SHALL stream-parse the CSV and batch-insert rows (1000 rows/batch) inside a single transaction to keep memory usage below 100 MB during import.

#### Scenario: First-time puzzle DB download and import
- **WHEN** the user triggers "Download Puzzle Database" in the Settings UI and no local puzzle DB exists
- **THEN** the system SHALL download the `.csv.zst` file, decompress it, create the `puzzles.db` schema, import all rows, and report the final row count and elapsed time

#### Scenario: Import is cancelled mid-way
- **WHEN** the user cancels an in-progress import
- **THEN** the partial import SHALL be rolled back and the DB SHALL remain in its previous valid state (empty if first-time)

### Requirement: Puzzle database schema supports efficient search by theme, rating, and opening
The `puzzles` table SHALL have the following columns: `puzzle_id TEXT PRIMARY KEY`, `fen TEXT NOT NULL`, `moves TEXT NOT NULL`, `rating INTEGER`, `rating_deviation INTEGER`, `popularity INTEGER`, `nb_plays INTEGER`, `themes TEXT`, `game_url TEXT`, `opening_tags TEXT`. The system SHALL create indexes on `rating`, and FTS5 virtual tables for `themes` and `opening_tags` to enable fast partial-match search.

#### Scenario: Query puzzles by theme
- **WHEN** the system queries `searchPuzzles({ theme: "fork", minRating: 1400, maxRating: 1800 })`
- **THEN** the result SHALL contain only puzzles whose `themes` field includes "fork" and whose `rating` is between 1400 and 1800, returned in under 50ms

#### Scenario: Query puzzles by opening tag
- **WHEN** the system queries `searchPuzzles({ opening: "Sicilian" })`
- **THEN** the result SHALL contain puzzles whose `opening_tags` field includes "Sicilian"

### Requirement: Puzzle DB version is tracked for update detection
The system SHALL store the `Last-Modified` HTTP response header value from the Lichess puzzle CSV download in `data/puzzles/.version`. On subsequent update checks, the system SHALL send a `HEAD` request and compare the `Last-Modified` header against the stored value to determine if a newer file is available.

#### Scenario: Update check finds no new version
- **WHEN** the stored `.version` matches the server's `Last-Modified` header
- **THEN** the system SHALL report "Puzzle database is up to date" and perform no download

#### Scenario: Update check finds a newer version
- **WHEN** the server's `Last-Modified` header is newer than the stored `.version`
- **THEN** the system SHALL prompt the user to download and reimport, replacing the existing `puzzles.db`

### Requirement: Puzzle DB status is exposed via IPC for display in Settings UI
The IPC handler `db:status` SHALL return `{ puzzles: { count: number, version: string, path: string, sizeBytes: number } | null }`. If no puzzle DB exists, `puzzles` SHALL be `null`.

#### Scenario: Settings UI shows puzzle DB status
- **WHEN** the Settings panel opens
- **THEN** it SHALL display the puzzle count, last-updated date, and DB file size if a puzzle DB is present, or "Not downloaded" if absent
