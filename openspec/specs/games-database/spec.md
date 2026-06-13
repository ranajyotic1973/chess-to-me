## ADDED Requirements

### Requirement: TWIC weekly OTB game archives are downloaded and imported into local SQLite database
The system SHALL provide a mechanism to download TWIC (The Week in Chess) weekly PGN ZIP archives and import them into `data/games/games.db`. The system SHALL track the latest downloaded TWIC issue number in `data/games/.version` and download all issues newer than the stored number, up to a configurable maximum (default: last 6 months of issues).

#### Scenario: First-time TWIC download
- **WHEN** the user triggers "Download Games Database" in Settings and no games DB exists
- **THEN** the system SHALL fetch the TWIC index to determine the latest issue number, download the last 26 issues (approximately 6 months), extract each ZIP, parse the PGN, and import all games into `games.db`

#### Scenario: Incremental TWIC update
- **WHEN** the user checks for updates and the stored issue number is behind the latest
- **THEN** the system SHALL download only the new issues since the last stored issue, parse and import them, and update the `.version` file

### Requirement: Games database schema supports search by player, ECO code, and Elo range
The `games` table SHALL have columns: `game_id INTEGER PRIMARY KEY AUTOINCREMENT`, `white TEXT`, `black TEXT`, `result TEXT`, `white_elo INTEGER`, `black_elo INTEGER`, `eco TEXT`, `opening TEXT`, `date TEXT`, `event TEXT`, `pgn_moves TEXT NOT NULL`. Indexes SHALL be created on `white`, `black`, `eco`, `white_elo`, and `black_elo`.

#### Scenario: Query games by ECO code
- **WHEN** the system queries `searchGames({ eco: "B20" })`
- **THEN** the result SHALL contain only games with `eco = "B20"`, returned in under 50ms

#### Scenario: Query games by player name
- **WHEN** the system queries `searchGames({ player: "Carlsen" })`
- **THEN** the result SHALL contain games where `white = "Carlsen"` or `black = "Carlsen"`

#### Scenario: Query games by Elo range
- **WHEN** the system queries `searchGames({ minElo: 2500 })`
- **THEN** the result SHALL return games where both `white_elo >= 2500` and `black_elo >= 2500`

### Requirement: pgnmentor.com player collection scripts are repaired
The `scripts/fetch-reference-games.ps1` PowerShell script SHALL be updated to verify the correct pgnmentor.com URL pattern for each player before downloading and SHALL log which players were successfully fetched vs skipped. Successfully fetched PGN files SHALL be imported into `games.db` alongside TWIC games.

#### Scenario: pgnmentor fetch succeeds for a player
- **WHEN** the script runs and a valid PGN file is available for the player
- **THEN** the file SHALL be downloaded, its games parsed and imported into `games.db`

#### Scenario: pgnmentor URL is unavailable for a player
- **WHEN** the script runs and the player's PGN returns a 404 or empty response
- **THEN** the script SHALL log the failure, skip that player, and continue with remaining players

### Requirement: Games DB status is exposed via IPC
The `db:status` IPC handler SHALL include `{ games: { count: number, latestTwicIssue: number, path: string, sizeBytes: number } | null }` in its response. If no games DB exists, `games` SHALL be `null`.

#### Scenario: Settings UI shows games DB status
- **WHEN** the Settings panel opens
- **THEN** it SHALL display the game count, latest TWIC issue imported, and DB file size if a games DB is present, or "Not downloaded" if absent
