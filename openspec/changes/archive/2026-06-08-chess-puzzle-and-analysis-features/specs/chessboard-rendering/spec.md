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
