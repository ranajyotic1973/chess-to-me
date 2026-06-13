## ADDED Requirements

### Requirement: Settings UI exposes a Database section with download and update controls
The Settings panel SHALL include a dedicated "Databases" section showing the status of both the puzzle DB and games DB, with action buttons: "Download" (if not present) and "Check for Updates" (if present). Download and import progress SHALL be reported via a progress indicator and status message within the Settings panel.

#### Scenario: User initiates puzzle DB download from Settings
- **WHEN** the user clicks "Download Puzzle Database" while the puzzle DB is absent
- **THEN** a progress bar and status message SHALL appear, updating as the download and import proceed, and resolving to the final count and "Last updated" date on completion

#### Scenario: User checks for puzzle DB updates
- **WHEN** the user clicks "Check for Updates" for the puzzle DB
- **THEN** the system SHALL perform an HTTP HEAD request to the Lichess puzzle CSV URL, compare the `Last-Modified` header against the stored version, and display either "Up to date" or offer a "Download Update" button

#### Scenario: User checks for games DB updates
- **WHEN** the user clicks "Check for Updates" for the games DB
- **THEN** the system SHALL check the TWIC index for issues newer than the stored issue number and either report "Up to date" or offer a "Download N new issues" button

### Requirement: Download and import progress is streamed to the renderer via IPC events
During database download and import, the main process SHALL emit progress events via `ipcMain` that the renderer can subscribe to. Each event SHALL carry `{ phase: "downloading" | "decompressing" | "importing", percent: number, message: string }`.

#### Scenario: Progress events during puzzle import
- **WHEN** a puzzle DB import is running
- **THEN** the Settings panel SHALL receive and display progress events at least every 5% of completion, updating the progress bar in real time

#### Scenario: Error during download
- **WHEN** a network error or checksum mismatch occurs during download
- **THEN** the system SHALL emit an error event with a descriptive message, roll back any partial import, and display the error in the Settings panel without crashing the app

### Requirement: Individual databases can be deleted from the Settings UI
The Settings panel SHALL include a "Delete" action for each installed database. Deleting a DB SHALL remove the `.db` file and the `.version` file from the data directory.

#### Scenario: User deletes the puzzle DB
- **WHEN** the user clicks "Delete" for the puzzle DB and confirms
- **THEN** `data/puzzles/puzzles.db` and `data/puzzles/.version` SHALL be removed, and the Settings panel SHALL show the puzzle DB as "Not downloaded"
