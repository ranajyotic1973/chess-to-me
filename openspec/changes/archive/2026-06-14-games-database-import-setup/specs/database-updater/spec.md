## MODIFIED Requirements

### Requirement: Settings UI exposes a Database section with download and update controls
The Settings panel SHALL include a dedicated "Databases" section showing the status of both the puzzle DB and games DB, with action buttons: "Download" (if not present) and "Check for Updates" (if present). Download and import progress SHALL be reported via a progress indicator and status message within the Settings panel.

The Games Database card within this section SHALL additionally contain:
- Instructional text explaining that the user must download all `*OTB*.7z` files from the Lumbrasgigabase download page (shown as a clickable link) into a single local folder before using the directory import.
- A directory path text input pre-populated from the saved `otbImportDir` setting, with a "Browse…" button to open a folder-select dialog.
- An "Import All OTB Files" button that scans the selected directory for `*OTB*.7z` files and imports any not yet tracked, with progress shown inline.
- The existing single-file "Import PGN / .7z…" button remains available for one-off imports.

#### Scenario: User initiates puzzle DB download from Settings
- **WHEN** the user clicks "Download Puzzle Database" while the puzzle DB is absent
- **THEN** a progress bar and status message SHALL appear, updating as the download and import proceed, and resolving to the final count and "Last updated" date on completion

#### Scenario: User checks for puzzle DB updates
- **WHEN** the user clicks "Check for Updates" for the puzzle DB
- **THEN** the system SHALL perform an HTTP HEAD request to the Lichess puzzle CSV URL, compare the `Last-Modified` header against the stored version, and display either "Up to date" or offer a "Download Update" button

#### Scenario: User checks for games DB updates
- **WHEN** the user clicks "Check for Updates" for the games DB
- **THEN** the system SHALL check the TWIC index for issues newer than the stored issue number and either report "Up to date" or offer a "Download N new issues" button

#### Scenario: Games Database card shows OTB import subsection
- **WHEN** the user scrolls to the Games Database card in Settings
- **THEN** the card SHALL show instructional text with the Lumbrasgigabase link, the directory path field with Browse button, and the "Import All OTB Files" button, in addition to the existing status line and single-file import button
