# line-step-navigation Specification

## ADDED Requirements

### Requirement: Line selection plays first move without drilling down

When user selects an engine line from the list, the system SHALL play the line's first move on the board and display its explanation, but SHALL NOT automatically analyze the position after that move or drill into a sub-list of candidates.

#### Scenario: First move is applied to board
- **WHEN** user clicks or selects an engine line
- **THEN** the first move of that line SHALL be applied to the board (via `applyLineMove(0)`) and the position SHALL update to show the post-move state

#### Scenario: Explanation is fetched for first move
- **WHEN** user selects a line
- **THEN** the system SHALL fetch LLM explanation via `fetchPerMoveExplanation` for `moveIndex=0` (the first move)

#### Scenario: No automatic drill-down analysis
- **WHEN** user selects a line and the first move is displayed
- **THEN** the system SHALL NOT invoke `electronAPI.analyzePosition` to drill down to a new candidate list; instead, the user retains the same line and can navigate forward/backward

### Requirement: Arrow keys step through selected line moves one-by-one

When a line is selected, pressing the right arrow key advances to the next move in that line; pressing the left arrow key retreats to the previous move. Each step updates the board position and fetches explanation for that move.

#### Scenario: Right arrow advances within a line
- **WHEN** a line is selected, `currentMoveIndex < numberOfMovesInLine - 1`, and user presses the right arrow key
- **THEN** `currentMoveIndex` SHALL increment by 1 and the board SHALL update to the new position (via `applyLineMove`)

#### Scenario: Left arrow retreats within a line
- **WHEN** a line is selected, `currentMoveIndex > 0`, and user presses the left arrow key
- **THEN** `currentMoveIndex` SHALL decrement by 1 and the board SHALL update to the previous position

#### Scenario: End of line behavior
- **WHEN** user presses right arrow at the end of the selected line (after the last move)
- **THEN** no further moves SHALL be applied and a message such as "End of line — no more moves" SHALL be displayed

### Requirement: Exploration stack is still available for drilling into different lines

When a user is navigating a selected line and wants to explore a different line's continuation, the back button SHALL restore the parent line list, allowing the user to select a different branch.

#### Scenario: Back button returns to line list
- **WHEN** user is navigating a selected line and clicks the back button
- **THEN** the system SHALL call `handleBackFromLine`, which clears line selection and restores the parent line list (via `explorationStack`)
