## ADDED Requirements

### Requirement: Render a draggable start position via chessboardjs
The renderer SHALL initialize chessboardjs from npm, render the "start" position on first render, and configure the board so chess pieces are draggable.

#### Scenario: Initial load of chessboard
- **WHEN** the analysis view mounts for the first time
- **THEN** chessboardjs renders the start position, the orientation defaults to white on bottom, and pieces respond to drag events without console errors

### Requirement: Re-render board when FEN is provided
The system SHALL accept pasted FEN strings, validate them, and update the chessboardjs position accordingly.

#### Scenario: Paste valid FEN
- **WHEN** the user pastes a valid FEN string into the designated input and confirms
- **THEN** the chessboard updates to that position and the UI reflects the new FEN text

### Requirement: Stockfish + LLM analysis from FEN
The application SHALL send the active FEN (initial or pasted) to Stockfish, await its analysis, then forward Stockfish’s evaluation to the LLM along with context so the model explains risk for both sides and the next player’s attack plan; the LLM response MUST stay purely about chess.

#### Scenario: Analysis pipeline invocation
- **WHEN** Stockfish returns an evaluation for the current FEN
- **THEN** the LLM receives Stockfish data plus metadata, and the UI displays a chess-focused explanation covering risks for both sides and the next player’s plan

### Requirement: User questions remain tied to the current position
The chat input SHALL scope each question to the currently rendered position and include the latest Stockfish analysis when calling the LLM.

#### Scenario: Ask a position-specific question
- **WHEN** the user submits a question about the board state or plan
- **THEN** the LLM request includes the current FEN and last Stockfish report, and the response references only that position without deviating into unrelated AI commentary
