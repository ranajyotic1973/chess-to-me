## ADDED Requirements

### Requirement: Pressing Up arrow when a line is selected generates a per-move LLM explanation
When a line is selected and the user presses Up arrow, the system SHALL advance `currentMoveIndex` by one, apply that move to the board, and request an LLM explanation for the resulting position and move in context of the selected line. The explanation SHALL be displayed in the chat response area.

#### Scenario: User presses Up arrow to advance one move
- **WHEN** a line is selected at `currentMoveIndex = 0` and the user presses Up arrow
- **THEN** the board SHALL update to reflect move 1 of the line, an LLM call SHALL be made with the move and position context, and the explanation SHALL appear in the chat response section

#### Scenario: User presses Up arrow at the last move of the line
- **WHEN** `currentMoveIndex` equals the last move index of the selected line
- **THEN** the board SHALL remain at the final position, no LLM call is made, and a message "End of line" SHALL appear

### Requirement: The entire app is locked while a per-move explanation is being generated
While the LLM call for a per-move explanation is in flight, the system SHALL display a full-screen `<Backdrop>` overlay with a loading indicator. All user interactions (keyboard navigation, board drags, chat input, buttons) SHALL be disabled until the explanation is received.

#### Scenario: App is locked during forward navigation LLM call
- **WHEN** the user presses Up arrow and the LLM request is in flight
- **THEN** a backdrop overlay SHALL cover the entire app, the board SHALL not respond to drags, and the chat input SHALL be disabled

#### Scenario: App is unlocked when explanation arrives
- **WHEN** the LLM call completes (success or error)
- **THEN** the backdrop SHALL be removed and all interactions SHALL be re-enabled

### Requirement: Per-move explanations are cached in memory by FEN + line index + move index
After a per-move explanation is received, the system SHALL store it in an in-memory cache keyed by `"${baseFen}:${lineIndex}:${moveIndex}"`. The cache SHALL persist for the duration of the session and SHALL NOT be written to disk.

#### Scenario: Explanation is cached after generation
- **WHEN** the LLM returns an explanation for move 2 of line 1 at a given base FEN
- **THEN** the explanation SHALL be stored in the cache with key `"<fen>:1:2"`

### Requirement: Pressing Down arrow retrieves the cached explanation without LLM interaction
When a line is selected and the user presses Down arrow, the system SHALL decrement `currentMoveIndex` by one, revert the board to the previous position, and retrieve the cached explanation for that position. No LLM call, engine call, or network request SHALL be made.

#### Scenario: User presses Down arrow after navigating forward
- **WHEN** `currentMoveIndex = 2` and the user presses Down arrow
- **THEN** the board SHALL revert to the position at move 1, the cached explanation for that move SHALL appear instantly in the chat area, and no LLM call is triggered

#### Scenario: User presses Down arrow at the start of the line
- **WHEN** `currentMoveIndex = 0` and the user presses Down arrow
- **THEN** the board SHALL remain at the line start position and no action is taken
