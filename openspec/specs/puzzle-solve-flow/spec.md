## ADDED Requirements

### Requirement: Puzzle FEN is validated with chess.js before being applied to the board
When the LLM returns a `Puzzle` response containing a `fen` field, the system SHALL validate that FEN using the `chess.js` `Chess` constructor before setting it as `currentFen`. If the FEN is invalid, the system SHALL display an error message in the chat response area and SHALL NOT update the board.

#### Scenario: LLM returns a valid puzzle FEN
- **WHEN** the LLM response has `response_type: "Puzzle"` and includes a syntactically and legally valid FEN string
- **THEN** the board SHALL update to that FEN, the position SHALL be shown to the user, and no error is displayed

#### Scenario: LLM returns an invalid puzzle FEN
- **WHEN** the LLM response has `response_type: "Puzzle"` and the `fen` field fails `new Chess(fen)` validation
- **THEN** the board SHALL remain at its current position, and the chat response area SHALL show the message "Invalid puzzle FEN received — board not updated."

### Requirement: Puzzle solution sequence is stored in application state
When a valid puzzle is loaded, the system SHALL parse the `solution` array from the LLM response and store it in application state. The solution SHALL be an ordered array of moves in UCI notation (e.g., `["e2e4", "d7d5"]`). If the solution field is absent or empty, the system SHALL fall back to displaying the solution as plain text only, and skip move-by-move validation.

#### Scenario: LLM returns a puzzle with a solution array
- **WHEN** the LLM response contains `solution: ["e2e4", "d7d5", "e4e5"]`
- **THEN** App state SHALL store that array as `puzzleSolution` and `puzzleAttemptMoves` SHALL be reset to empty

#### Scenario: LLM returns a puzzle without a solution array
- **WHEN** the LLM response is of type `Puzzle` but has no `solution` field or an empty array
- **THEN** the system SHALL display the solution text (if any) but SHALL NOT enable move-by-move attempt validation

### Requirement: User can attempt the puzzle by dragging pieces on the analysis board
When a puzzle is active (`responseType === "Puzzle"` and `puzzleSolution` is non-empty), each legal board drag move SHALL be appended to `puzzleAttemptMoves`. When the number of attempt moves equals the solution length, the system SHALL compare the attempt sequence against `puzzleSolution` and display an outcome alert.

#### Scenario: User drags correct moves matching the solution
- **WHEN** the user drags pieces in the exact sequence defined by `puzzleSolution`
- **THEN** after the final move the system SHALL display "Correct! Well done." in the chat area and unlock the board for free play

#### Scenario: User drags a move that deviates from the solution
- **WHEN** the user drags a move that does not match the next expected solution move
- **THEN** the system SHALL immediately display "Incorrect — try again or reveal the solution." and SHALL reset `puzzleAttemptMoves` to empty, restoring the board to the puzzle start FEN

### Requirement: User can attempt the puzzle by typing the move sequence in the chat input
When `responseType === "Puzzle"` and `puzzleSolution` is non-empty, if the user types a move sequence (space-separated UCI or SAN notation, e.g., `e2e4 d7d5`) in the chat input and submits, the system SHALL parse those moves with chess.js in the context of the puzzle FEN, compare against `puzzleSolution`, and display the outcome. The submission SHALL NOT be sent to the LLM.

#### Scenario: User types the correct solution in the chat box
- **WHEN** the user types the correct move sequence and presses Enter
- **THEN** the system SHALL validate the moves locally against `puzzleSolution`, display "Correct! Well done." and SHALL NOT make an LLM request

#### Scenario: User types an incorrect or partial solution in the chat box
- **WHEN** the user types moves that do not match `puzzleSolution`
- **THEN** the system SHALL display "Incorrect — try again or reveal the solution." without making an LLM request

### Requirement: After an incorrect attempt, the correct solution is loaded for navigation
After the user submits an incorrect attempt (drag or typed), the system SHALL load the puzzle start FEN back onto the board and prepare the solution sequence for step-by-step navigation via the Up/Down arrow keys.

#### Scenario: Solution navigation after incorrect attempt
- **WHEN** the user's attempt is marked incorrect
- **THEN** the board SHALL reset to the puzzle FEN, the chat area SHALL instruct "Use Up arrow to step through the solution, Down arrow to go back.", and the Up arrow SHALL begin applying solution moves one at a time

#### Scenario: Navigating to the end of the solution
- **WHEN** the user presses Up arrow past the last solution move
- **THEN** the board SHALL remain at the final solution position and no further moves are applied
