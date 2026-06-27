## ADDED Requirements

### Requirement: Update PGN on forward moves
The system SHALL update the current PGN representation in memory whenever a move is played on the board in the forward direction.

#### Scenario: Play move on board
- **WHEN** user makes a move on the board via drag-and-drop or keyboard navigation
- **THEN** the move is appended to the PGN representation in memory

#### Scenario: Navigate forward through analysis line
- **WHEN** user presses the right arrow key to advance through a selected analysis line
- **THEN** the move is added to the current PGN state, and the PGN reflects the position after that move

### Requirement: Update PGN on backward moves
The system SHALL update the current PGN representation when user navigates backward through moves.

#### Scenario: Retreat to previous move
- **WHEN** user presses the left arrow key to go back to the previous position
- **THEN** the last move is removed from the PGN representation, reverting to the prior board state

#### Scenario: Retreat to start position
- **WHEN** user presses the left arrow key repeatedly to return to the starting position
- **THEN** the PGN is cleared to represent the starting position only

### Requirement: PGN maintains valid format
The system SHALL ensure that the PGN representation remains in valid, parseable PGN format at all times as moves are added or removed.

#### Scenario: Generated PGN is valid
- **WHEN** PGN is updated after any move navigation
- **THEN** the PGN can be parsed by a PGN parser without errors

### Requirement: Move annotations preserved in PGN
Any existing move annotations or comments in the PGN SHALL persist as the user navigates.

#### Scenario: Position comments survive navigation
- **WHEN** PGN includes comments on positions and user navigates forward then backward
- **THEN** comments remain attached to their respective positions

### Requirement: PGN tracks move count and turn
The system SHALL ensure that the PGN accurately reflects the number of moves and whose turn it is at any given position.

#### Scenario: Move number increments correctly
- **WHEN** white plays a move followed by black's move
- **THEN** the PGN reflects this as two complete moves (e.g., move 1 for the pair)

### Requirement: Advanced Analysis mode requires real-time PGN tracking
In Advanced Analysis mode, the PGN representation SHALL be continuously synchronized with the board state for annotation saving.

#### Scenario: PGN ready for annotation
- **WHEN** user is in Advanced Analysis mode and navigates to various positions
- **THEN** the PGN is always current and ready to be annotated with position notes
