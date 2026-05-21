## ADDED Requirements

### Requirement: Navigate line with arrow keys
The system SHALL allow user to move forward and backward through selected line using arrow keys.

#### Scenario: Right arrow moves forward
- **WHEN** line is selected and user presses right arrow key
- **THEN** board advances to next move in line and position updates

#### Scenario: Left arrow moves backward
- **WHEN** user is in middle of line and presses left arrow key
- **THEN** board goes back one move

#### Scenario: Navigation at line boundaries
- **WHEN** user is at move 1 and presses left arrow
- **THEN** no movement occurs (already at start)

#### Scenario: Navigation respects line length
- **WHEN** user is at last move of line and presses right arrow
- **THEN** no movement occurs (already at end)

### Requirement: Keyboard nav only when line selected
The system SHALL only respond to arrow key navigation when a line is explicitly selected.

#### Scenario: Arrows active with selected line
- **WHEN** user has selected a line
- **THEN** arrow keys navigate through it

#### Scenario: Arrows inactive without selection
- **WHEN** no line is selected
- **THEN** arrow keys do not navigate (fall back to board move entry)

### Requirement: Update board position on navigation
The system SHALL update the board display to show the current move in the selected line.

#### Scenario: Position updates on each move
- **WHEN** user presses arrow key to advance move
- **THEN** board displays new position after that move

#### Scenario: All pieces repositioned
- **WHEN** user navigates to a move
- **THEN** entire position updates (not just the moved piece)

### Requirement: Display move counter during navigation
The system SHALL show "Move X of Y" to indicate position within line.

#### Scenario: Move counter at start
- **WHEN** line is selected and user is at move 1
- **THEN** display shows "Move 1 of 8" (or actual count)

#### Scenario: Counter updates on navigation
- **WHEN** user presses arrow key
- **THEN** move counter updates immediately

### Requirement: Keyboard accessibility
The system SHALL not conflict with other keyboard shortcuts and work across all keyboard layouts.

#### Scenario: No conflict with other shortcuts
- **WHEN** line is selected
- **THEN** arrow keys navigate line, other keys work normally

#### Scenario: Keyboard layout compatible
- **WHEN** user on different keyboard layout
- **THEN** arrow keys still function for navigation

