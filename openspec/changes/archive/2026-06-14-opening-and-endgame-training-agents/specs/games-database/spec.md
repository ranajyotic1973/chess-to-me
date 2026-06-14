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
