## Purpose
Ensure the ChessboardJS view reliably renders once settings are complete and keep the controls visually aligned with the Blueprint UI through consistent rounded edges.

## Requirements

### Requirement: Chessboard renders whenever the analysis view is visible
The renderer SHALL mount and keep a ChessboardJS instance inside the analysis view so that a visible chessboard exists after the settings gate is cleared or whenever a FEN is applied.

#### Scenario: Rendering analysis view
- **WHEN** the user saves settings, clicks "Go to analysis", or pastes a valid FEN while the analysis view is active
- **THEN** the ChessboardJS instance is initialized on the board container, draggable pieces are enabled, and the board displays the expected position without leaving a blank container

### Requirement: Board-adjacent controls use rounded corners
The board wrapper and nearby control cards SHALL have a consistent rounded border radius so they visually match other Blueprint cards in the application.

#### Scenario: Displaying rounded controls
- **WHEN** the analysis view renders
- **THEN** the `.board-wrapper`, `.analysis-panel` card, and FEN/chat control blocks all have gently rounded corners (e.g., `border-radius: 0.5rem`) and no sharp edges that clash with the rest of the UI

## MODIFIED Requirements

### Requirement: Board position is set from LLM Puzzle response FEN after chess.js validation
When the application receives a `Puzzle` response from the LLM, the board SHALL update to the FEN contained in the response only after successful `chess.js` validation. This replaces the previous behavior where `setCurrentFen` was called immediately without validation. An invalid FEN SHALL result in an error message in the chat area and no board change.

#### Scenario: Valid puzzle FEN applied to board
- **WHEN** `responseType === "Puzzle"` and `parsedResponse.fen` passes `new Chess(fen)` without throwing
- **THEN** `setCurrentFen(parsedResponse.fen)` SHALL be called and the board SHALL render the new position

#### Scenario: Invalid puzzle FEN blocked
- **WHEN** `responseType === "Puzzle"` and `new Chess(parsedResponse.fen)` throws an error
- **THEN** `setCurrentFen` SHALL NOT be called, and the chat area SHALL show "Invalid puzzle FEN received — board not updated."

## ADDED Requirements

### Requirement: Board is reset to puzzle start FEN when solution navigation begins
After an incorrect puzzle attempt, or when the user requests to view the solution, the board SHALL reset to the original puzzle start FEN before solution move navigation commences.

#### Scenario: Board resets before solution replay
- **WHEN** a puzzle attempt is marked incorrect and solution navigation is initiated
- **THEN** the board SHALL display the puzzle start FEN and `currentMoveIndex` SHALL be set to `0` in preparation for step-by-step Up arrow navigation
