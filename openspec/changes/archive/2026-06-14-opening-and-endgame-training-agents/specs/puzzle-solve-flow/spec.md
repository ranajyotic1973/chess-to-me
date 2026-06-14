## ADDED Requirements

### Requirement: Training move arrays are stored in a unified trainingMoves state
When `responseType` is `"Opening"` or `"Endgame"`, the system SHALL store the response `moves` array in a `trainingMoves` state variable (`Array<{ uci: string; san: string; commentary: string }>`). A `trainingMoveIndex` integer state SHALL track the current position within the array, initialised to -1 (before the first move is applied). When a new training response is loaded, both `trainingMoves` and `trainingMoveIndex` SHALL be reset.

#### Scenario: Opening response populates trainingMoves
- **WHEN** an Opening response is received with a `moves` array
- **THEN** `trainingMoves` SHALL be set to that array and `trainingMoveIndex` SHALL be reset to -1

#### Scenario: Endgame response populates trainingMoves
- **WHEN** an Endgame response is received with a `moves` array
- **THEN** `trainingMoves` SHALL be set to that array and `trainingMoveIndex` SHALL be reset to -1

#### Scenario: Starting a new training session resets state
- **WHEN** a second Opening or Endgame response is received while a previous one is active
- **THEN** `trainingMoves` SHALL be replaced with the new array, `trainingMoveIndex` SHALL be reset to -1, and the board SHALL return to the training start FEN

### Requirement: Arrow-key handler routes to training navigation when a training mode is active
The keyboard handler in `App.tsx` SHALL extend its routing logic: when `responseType === "Opening"` or `responseType === "Endgame"` and `trainingMoves.length > 0`, arrow key events SHALL step through `trainingMoves` instead of the puzzle solution or analysis line navigators.

#### Scenario: Left arrow advances one training move
- **WHEN** `responseType` is `"Opening"` or `"Endgame"`, `trainingMoveIndex < trainingMoves.length - 1`, and left arrow is pressed outside the chat input
- **THEN** `trainingMoveIndex` SHALL increment by one, the board SHALL apply the UCI move at the new index from the training start FEN, and the chat area SHALL display `trainingMoves[trainingMoveIndex].commentary`

#### Scenario: Right arrow retreats one training move
- **WHEN** `trainingMoveIndex > 0` and right arrow is pressed outside the chat input
- **THEN** `trainingMoveIndex` SHALL decrement by one and the board SHALL revert to the position after applying moves 0 through the new index from the training start FEN

#### Scenario: Right arrow at index 0 returns to start position
- **WHEN** `trainingMoveIndex === 0` and right arrow is pressed
- **THEN** `trainingMoveIndex` SHALL become -1 and the board SHALL return to the training start FEN

#### Scenario: Training navigation does not interfere with puzzle navigation
- **WHEN** `responseType === "Puzzle"` and `puzzleSolution` is active
- **THEN** arrow keys SHALL continue routing to the puzzle navigator, not the training navigator

### Requirement: Training start FEN is persisted separately for board reversion
When a training response sets a new FEN on the board, the system SHALL store that FEN in a `trainingStartFen` state variable. Board reversion during training navigation SHALL always recompute the target position by replaying moves from `trainingStartFen`, not from the live `currentFen`.

#### Scenario: Board is correctly reverted after forward navigation
- **WHEN** the user has advanced 5 moves and presses right arrow twice
- **THEN** the board SHALL show the position after replaying moves 0–2 from `trainingStartFen`, not from any intermediate FEN cached at navigation time
