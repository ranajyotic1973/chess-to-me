## ADDED Requirements

### Requirement: Store annotated games with move quality symbols
The system SHALL store games in PGN format with move annotations (!, !!, *, !?, ??) applied by the LLM, persisted in Electron Store.

#### Scenario: LLM annotates game with quality symbols
- **WHEN** user asks "Annotate this game"
- **THEN** LLM returns `response_type: "Game"` with PGN and annotations mapping move numbers to symbols

#### Scenario: Annotation symbols are preserved in storage
- **WHEN** system stores annotated game
- **THEN** symbols (!! for brilliant, ! for excellent, * for best, !? for dubious, ?? for blunder) are saved with the PGN

#### Scenario: User can retrieve previously annotated games
- **WHEN** user requests to view stored games
- **THEN** system displays list of annotated PGNs from storage

#### Scenario: User can export annotated PGN
- **WHEN** user exports a game
- **THEN** exported file contains PGN with all move annotations

### Requirement: LLM provides move annotations in response
The system SHALL require LLM to include `annotations` field mapping move numbers to quality symbols when `response_type: "Game"`.

#### Scenario: LLM returns structured annotations
- **WHEN** user asks LLM to analyze a game
- **THEN** response includes `annotations: {1: "!", 3: "!!", 5: "!?"}` format

#### Scenario: Annotations are applied to each move
- **WHEN** annotations are parsed from LLM response
- **THEN** each move number has at most one symbol (no duplicate annotations)

### Requirement: User can add games to memory
The system SHALL allow users to save analyzed games to game memory for future reference.

#### Scenario: Save game after analysis
- **WHEN** user clicks "Save Game" after LLM analysis
- **THEN** game PGN with annotations is stored in game memory
