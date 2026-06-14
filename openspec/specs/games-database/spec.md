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

## ADDED Requirements

### Requirement: ECO opening name is resolved when a game is loaded from the database
When a game is loaded from the games database, the main process SHALL walk through the game's PGN move sequence using `chess.js`, calling `lookupOpeningByFen` (from the shared ECO helper in `electron/main.ts`) after each move. The last non-null result SHALL be used as the authoritative opening name. The resolved ECO code and opening name SHALL be attached to the game payload delivered to the renderer.

#### Scenario: Game uses a well-known opening
- **WHEN** the user selects a game from the games database whose moves match a known ECO entry
- **THEN** the renderer SHALL receive `{ eco_code: "C60", opening_name: "Ruy Lopez" }` (or the deepest matched variation) in the game payload alongside the existing PGN and player fields

#### Scenario: ECO lookup returns null for an obscure game
- **WHEN** the game's first moves do not match any ECO entry (e.g., a custom or highly unusual opening)
- **THEN** the existing `opening` column value from the database row SHALL be forwarded to the renderer as the fallback; if that column is also empty, no opening label SHALL be shown

#### Scenario: eco.json package is unavailable
- **WHEN** `@chess-openings/eco.json` failed to load at startup
- **THEN** the game loading flow SHALL proceed without ECO lookup; the renderer SHALL display the database `opening` column value or no opening label

### Requirement: ECO opening name is displayed in the game header or PlayerBar
The renderer SHALL display the ECO code and opening name when a game is loaded. The display location SHALL be either the `PlayerBar` component or a dedicated game-header row immediately above or below the PlayerBar. The display SHALL update immediately when the game payload is received and SHALL be cleared when the board is reset to an empty or starting position.

#### Scenario: Opening name is shown after game load
- **WHEN** a game is loaded and the ECO name is resolved
- **THEN** the UI SHALL show text similar to "Ruy Lopez (C60)" adjacent to the player names or directly below the board header

#### Scenario: No opening name for starting position
- **WHEN** the board is reset to the standard starting position or an empty board
- **THEN** the opening label SHALL be hidden or cleared

### Requirement: ECO lookup does not block or slow down game loading
The `lookupOpeningByFen` walk over the game's moves SHALL complete synchronously in the main process before the game payload is sent to the renderer. Because the ECO library is pre-loaded at startup and chess.js move application is O(n) in the number of moves, the lookup SHALL add no async overhead to the game-loading IPC round-trip.

#### Scenario: Large PGN game loads without perceptible delay
- **WHEN** a game with 80 moves is loaded
- **THEN** the ECO lookup SHALL finish within the same synchronous IPC handler call with no separate async step required, and the game SHALL appear on the board without additional loading time visible to the user
