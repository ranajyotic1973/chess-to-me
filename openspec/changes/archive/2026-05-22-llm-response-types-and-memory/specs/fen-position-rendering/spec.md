## ADDED Requirements

### Requirement: Render chess positions from FEN strings
The system SHALL accept FEN strings from LLM responses and render them on the chessboard, updating piece positions accordingly.

#### Scenario: Render FEN for puzzle position
- **WHEN** LLM returns `response_type: "Puzzle"` with a FEN value
- **THEN** the chessboard displays pieces from the FEN string

#### Scenario: Render FEN for position evaluation
- **WHEN** LLM returns `response_type: "Position"` with a FEN value
- **THEN** the chessboard renders the position with pieces in correct squares

#### Scenario: Validate FEN before rendering
- **WHEN** LLM provides an invalid FEN string
- **THEN** system shows error message instead of crashing

#### Scenario: Update board after previous analysis
- **WHEN** user switches from Analysis response to a Puzzle response
- **THEN** the board clears previous analysis arrows and displays new FEN position

### Requirement: Disable move input for FEN-rendered positions
The system SHALL prevent users from moving pieces when viewing non-analysis response types (Puzzle, Position, Game).

#### Scenario: User cannot move pieces in puzzle mode
- **WHEN** response type is "Puzzle" and board is rendered from FEN
- **THEN** clicking and dragging pieces has no effect

#### Scenario: User can move pieces in analysis mode
- **WHEN** response type is "Analysis"
- **THEN** piece movement is enabled as normal
