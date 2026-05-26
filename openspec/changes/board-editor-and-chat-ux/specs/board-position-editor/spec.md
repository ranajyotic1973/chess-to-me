## ADDED Requirements

### Requirement: Board position editor modal interface
The system SHALL provide a modal dialog for editing chess board positions using drag-and-drop interaction. The modal SHALL display the current board position with two horizontal lists of chess pieces (one for white, one for black), each containing King, Queen, Rook, Bishop, Knight, and Pawn pieces.

#### Scenario: Open board editor modal
- **WHEN** user clicks the "Edit Board" icon button in the board controls
- **THEN** the modal opens displaying the current board position, white piece list, black piece list, and Clear/Reset buttons

#### Scenario: Close board editor modal without changes
- **WHEN** user clicks the Cancel button or the close icon
- **THEN** the modal closes and the main board remains unchanged

### Requirement: Drag pieces from list to board
The system SHALL allow users to drag chess pieces from the piece lists and drop them onto board squares to place them at that position.

#### Scenario: Drag white piece to board square
- **WHEN** user drags a white piece (e.g., ♔) from the WHITE list
- **THEN** the piece can be dragged across the board
- **WHEN** user drops the piece on a valid board square (e.g., e1)
- **THEN** the piece appears on that square in the board display

#### Scenario: Drag black piece to board square
- **WHEN** user drags a black piece (e.g., ♚) from the BLACK list
- **THEN** the piece can be dragged across the board
- **WHEN** user drops the piece on a valid board square
- **THEN** the piece appears on that square in the board display

#### Scenario: Replace piece on occupied square
- **WHEN** user drags a piece and drops it on a square that already contains a piece
- **THEN** the new piece replaces the existing piece on that square

### Requirement: Delete pieces by dragging off board
The system SHALL remove a piece from the board when the user drags it outside the board boundaries.

#### Scenario: Drag piece off board edge
- **WHEN** user drags a piece currently on the board
- **THEN** the piece can be dragged beyond the board boundaries
- **WHEN** user releases the piece outside the board area
- **THEN** the piece is removed from the board

#### Scenario: Drag piece back onto board
- **WHEN** user drags a piece off the board but decides to drag it back
- **THEN** the piece can be repositioned onto any board square before release
- **WHEN** user releases the piece on a valid square
- **THEN** the piece remains on that square

### Requirement: Clear board button
The system SHALL provide a "Clear Board" button that removes all pieces from the board.

#### Scenario: Clear all pieces
- **WHEN** user clicks the "Clear Board" button
- **THEN** all pieces are removed from the board
- **AND** the board is left completely empty

### Requirement: Reset to start position button
The system SHALL provide a "Reset to Start" button that loads the standard chess starting position (rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR).

#### Scenario: Reset board to starting position
- **WHEN** user clicks the "Reset to Start" button
- **THEN** the board is populated with the standard chess starting position
- **AND** all pieces are in their standard locations

### Requirement: Validate position on save
The system SHALL validate the final board position using chess.js when the user clicks the OK button. If the position is invalid, an error message SHALL be displayed indicating what is wrong.

#### Scenario: Valid position - OK succeeds
- **WHEN** user sets up a valid chess position (one king per side, pawns not on 1st/8th rank, etc.)
- **WHEN** user clicks the OK button
- **THEN** the position is validated successfully
- **AND** the modal closes
- **AND** the main board updates to the new position

#### Scenario: Invalid position - missing king
- **WHEN** user sets up a position without a white king
- **WHEN** user clicks the OK button
- **THEN** the position validation fails
- **AND** an error message appears: "White king is missing"
- **AND** the modal remains open for correction
- **AND** the error message fades away after a few seconds

#### Scenario: Invalid position - pawn on promotion rank
- **WHEN** user places a white pawn on the 8th rank or a black pawn on the 1st rank
- **WHEN** user clicks the OK button
- **THEN** the position validation fails
- **AND** an error message appears describing the invalid pawn placement
- **AND** the modal remains open for correction

#### Scenario: Invalid position - multiple kings
- **WHEN** user places two white kings on the board
- **WHEN** user clicks the OK button
- **THEN** the position validation fails
- **AND** an error message appears: "White has more than one king"
- **AND** the modal remains open for correction
