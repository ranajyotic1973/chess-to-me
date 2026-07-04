## ADDED Requirements

### Requirement: Track engine line selection per board position
The system SHALL maintain a history of which engine line was selected at each board position.

#### Scenario: Record line selection on first move
- **WHEN** user makes White's first move and a line is selected
- **THEN** the selected line is recorded as associated with that board position

#### Scenario: Record line selection on subsequent moves
- **WHEN** user makes additional moves and the selected line changes
- **THEN** the new line selection is recorded for the new board position

### Requirement: Restore line selection when navigating backward
The system SHALL restore the previously-selected engine line when the user navigates backward through moves.

#### Scenario: Backward navigation restores correct line
- **WHEN** user navigates backward using keyboard (left arrow)
- **THEN** the engine line that was previously selected at that board position is restored
- **AND** the Line Detail shows that line's information

#### Scenario: Return to latest position
- **WHEN** user navigates forward to the current board position using keyboard (right arrow)
- **THEN** the current engine line selection is restored

### Requirement: Handle position changes due to board moves
The system SHALL accurately track line selection when the user makes a new move that differs from the previous position.

#### Scenario: User changes line by making a different move
- **WHEN** user navigates backward and then makes a move that differs from the original sequence
- **THEN** the history is updated to replace the old line with the new line at that position
- **AND** new history is created for any subsequent board positions
