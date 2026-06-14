## ADDED Requirements

### Requirement: eco.json package is loaded once at main-process startup
The main process SHALL import `@chess-openings/eco.json` at startup and make its `findOpening` function available to all IPC handlers. If the package fails to load (e.g., missing from node_modules), the system SHALL log a warning and continue operating without ECO lookup rather than crashing.

#### Scenario: Package loads successfully
- **WHEN** the main process starts and `@chess-openings/eco.json` is installed
- **THEN** the `findOpening` function SHALL be available for use by opening and game-loading handlers without re-importing on each call

#### Scenario: Package is missing
- **WHEN** the main process starts and `@chess-openings/eco.json` is not found
- **THEN** the main process SHALL log `[ECO] eco.json not available — opening lookup disabled` and SHALL continue running; all callers SHALL receive `null` from ECO lookup calls

### Requirement: Opening name is resolved by FEN position lookup
The system SHALL expose an internal `lookupOpeningByFen(fen: string)` helper that calls `findOpening(fen)` from the eco.json package and returns `{ eco: string, name: string } | null`. The helper SHALL be callable from any main-process handler without repeating import logic.

#### Scenario: FEN matches a known opening
- **WHEN** `lookupOpeningByFen` is called with the FEN after `1.e4 c5`
- **THEN** it SHALL return `{ eco: "B20", name: "Sicilian Defense" }` (or the closest match from the library)

#### Scenario: FEN matches no known opening
- **WHEN** `lookupOpeningByFen` is called with an unusual or custom position FEN
- **THEN** it SHALL return `null` without throwing

### Requirement: Opening name is resolved by move sequence walk
The system SHALL expose an internal `lookupOpeningByMoves(moves: string[], startFen?: string)` helper that applies each move to a chess.js board and calls `lookupOpeningByFen` at each position, returning the last non-null match. This enables progressive ECO identification as moves are played.

#### Scenario: Multi-move sequence identifies the deepest known variation
- **WHEN** `lookupOpeningByMoves(["e2e4", "c7c5", "g1f3"])` is called
- **THEN** the function SHALL return the ECO entry matching the position after `1.e4 c5 2.Nf3`, which is deeper than `1.e4 c5`

#### Scenario: Empty move array returns null
- **WHEN** `lookupOpeningByMoves([])` is called
- **THEN** it SHALL return `null`

### Requirement: Games-database game loader annotates the opening name via ECO lookup
When a game is loaded from the games database, the main process SHALL call `lookupOpeningByMoves` with the game's PGN move sequence and attach the resolved `{ eco, name }` to the game payload sent to the renderer. If no ECO match is found, the existing `opening` column value from the database SHALL be used as the fallback.

#### Scenario: Game is loaded and ECO name is resolved
- **WHEN** the user selects a game from the games database
- **THEN** the renderer SHALL receive the ECO opening name alongside the game data and SHALL display it in the game header or PlayerBar

#### Scenario: ECO lookup returns null for an obscure game
- **WHEN** the game's opening is not in the ECO database
- **THEN** the `opening` field from the database row SHALL be displayed instead

### Requirement: ECO lookup result is injected into the opening training LLM prompt
When `handleOpeningRequest` builds its LLM prompt, it SHALL call `lookupOpeningByMoves` on the first few moves of the requested opening and inject the resolved ECO code and name into the prompt as authoritative context, so the LLM uses the correct canonical name rather than generating its own.

#### Scenario: ECO context is present in the opening prompt
- **WHEN** the user asks to learn the Ruy Lopez
- **THEN** the LLM system prompt SHALL contain text similar to "The opening being taught is the Ruy Lopez (ECO: C60)" sourced from the eco.json lookup

#### Scenario: Opening not found in eco.json
- **WHEN** the user requests an obscure or fictional opening not in the library
- **THEN** the LLM prompt SHALL omit the ECO section and the LLM SHALL name and describe the opening from its own training data
