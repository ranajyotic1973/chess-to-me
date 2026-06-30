# user-move-matching Specification

## ADDED Requirements

### Requirement: User drag/drop move is matched against first moves of engine lines

The system SHALL compare each user drag/drop move against the first move (first UCI in PV) of each currently displayed engine analysis line. If a match is found, the system SHALL automatically select that line.

#### Scenario: User move matches an engine line's first move
- **WHEN** the user drags a piece and drops it to make a move, and that move (in UCI format) equals the first move of engine line N
- **THEN** the system SHALL auto-select line N and set `selectedEngineLineIndex` to N

#### Scenario: User move does not match any engine line
- **WHEN** the user drags a piece to make a move that does not match the first UCI move of any displayed line
- **THEN** the system SHALL NOT auto-select a line; instead, it triggers off-book analysis (see user-move-off-book-analysis)

#### Scenario: No engine lines available
- **WHEN** the user makes a drag/drop move and `analysisLines.length === 0`
- **THEN** the system SHALL NOT attempt matching and SHALL proceed directly to off-book analysis

### Requirement: Move matching is case-insensitive and handles promotion notation

The system SHALL match moves by comparing source square, destination square, and promotion piece (if present). Lowercase and uppercase UCI variations SHALL be treated as equivalent.

#### Scenario: Move with promotion matches
- **WHEN** a user drags a pawn to the promotion rank and promotes to queen (e.g., "a7a8q"), and an engine line has first move "a7a8q" or "a7a8Q"
- **THEN** the system SHALL match and auto-select that line

#### Scenario: Promotion variant normalization
- **WHEN** a user makes pawn move without explicit promotion (default to queen in chess.js) matching an engine first move
- **THEN** the system SHALL normalize both to the same promotion and match them

### Requirement: Matched line triggers immediate LLM explanation

When a move is matched to an engine line, the system SHALL invoke the LLM to explain that line's first move before showing navigation options to the user.

#### Scenario: LLM explanation is fetched for matched line
- **WHEN** a user move matches engine line N
- **THEN** the system SHALL call `fetchPerMoveExplanation` with `lineIndex=N`, `moveIndex=0` to generate explanation text and display it to the user
