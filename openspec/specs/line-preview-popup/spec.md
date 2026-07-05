# line-preview-popup Specification

## Purpose
TBD - created by archiving change conversation-driven-modes-and-engine-tuning. Update Purpose after archive.

## Requirements
### Requirement: Each engine line has a play icon that opens a stateless preview popup
In Deep (Advanced) Analysis, Opening, Middlegame, and Endgame modes, every engine line row in the analysis list SHALL show a small play icon at the end of the row. Clicking the icon SHALL open a preview popup that shows the line on its own board without altering the main board or game state. The preview board SHALL be stateless — it exists only to display that line's moves and SHALL NOT affect `currentFen`, `playedMoves`, the selected line, or any other app state.

#### Scenario: Play icon appears on line rows in the supported modes
- **WHEN** engine lines are listed in Deep Analysis, Opening, Middlegame, or Endgame mode
- **THEN** each line row SHALL display a play icon at the end of the row

#### Scenario: Opening the preview does not change the main board
- **WHEN** the user clicks a line's play icon
- **THEN** a preview popup SHALL open showing that line, and the main board, played moves, and selected line SHALL remain unchanged

#### Scenario: Closing the preview leaves state untouched
- **WHEN** the user closes the preview popup
- **THEN** the app SHALL return to exactly the state it was in before the popup was opened

### Requirement: The preview popup shows a board, an active evaluation bar, and instruction text
The preview popup SHALL contain a chess board that starts at the line's initial position, an evaluation bar that reflects the evaluation at the currently displayed move, a short instruction line at the top telling the user to use the keyboard arrow keys to step through the moves, and a close (X) button in the top-right corner.

#### Scenario: Popup shows instruction text and controls
- **WHEN** the preview popup opens
- **THEN** it SHALL display the board at the line's start, an evaluation bar, an instruction line about arrow-key navigation, and an X button in the top-right corner

#### Scenario: Evaluation bar tracks the displayed move
- **WHEN** the user navigates to a different move within the previewed line
- **THEN** the evaluation bar SHALL update to reflect the evaluation at the displayed position

### Requirement: The previewed line is navigated only by keyboard arrow keys
Within the preview popup, the user SHALL step forward and backward through the line's moves using only the keyboard navigation (arrow) keys. Navigation SHALL stop at the first and last move of the line. The preview SHALL not allow moving pieces or otherwise editing the position.

#### Scenario: Arrow keys step through the line
- **WHEN** the preview popup is open and the user presses the forward/back arrow keys
- **THEN** the preview board SHALL advance or retreat one move within the line accordingly

#### Scenario: Navigation stops at line boundaries
- **WHEN** the user presses back at the first move or forward at the last move
- **THEN** the preview board SHALL remain at the current position

### Requirement: The popup is closable at any time with the X button
The preview popup SHALL be closable at any time via the X button in the top-right corner, returning focus to the analysis panel.

#### Scenario: X button closes the popup
- **WHEN** the user clicks the X button
- **THEN** the preview popup SHALL close

### Requirement: Opening the preview requests LLM critical-move insights for the line
When the user opens a line's preview, the entire line SHALL be sent to the LLM in UCI form together with its engine output (evaluations), and the LLM SHALL be asked to identify the critical moves that decide the outcome from that point on and provide a concise insight for each such move. Requests SHALL follow the same chess-only, age-4–18 guardrail as other chat requests.

#### Scenario: Line and engine output are sent for insight generation
- **WHEN** the preview popup opens for a line
- **THEN** the LLM request SHALL include the full line in UCI notation with its engine evaluations and ask for insights at the critical (game-deciding) moves

#### Scenario: Insights are keyed to specific moves
- **WHEN** the LLM returns insights
- **THEN** each insight SHALL be associated with a specific move index within the line

### Requirement: Critical-move insights appear as a balloon while that move is displayed
When the user navigates (forward or backward) to a move that has an insight, that insight SHALL appear as a balloon near the board. The balloon SHALL remain visible until the user navigates to the next or previous move, at which point it SHALL be replaced by that move's insight (if any) or dismissed (if none).

#### Scenario: Insight balloon shows on reaching a critical move
- **WHEN** the user navigates to a move that has an insight
- **THEN** a balloon with that insight SHALL be displayed near the board

#### Scenario: Balloon persists until the next navigation
- **WHEN** an insight balloon is shown and the user does not navigate
- **THEN** the balloon SHALL remain visible

#### Scenario: Balloon updates or clears on navigation
- **WHEN** the user navigates to an adjacent move
- **THEN** the current balloon SHALL be replaced by the new move's insight or dismissed if the new move has none
