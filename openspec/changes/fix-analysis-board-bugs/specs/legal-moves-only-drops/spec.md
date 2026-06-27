## ADDED Requirements

### Requirement: Validate move legality before accepting drop
The system SHALL only accept piece drop operations that result in legal chess moves according to the current board state.

#### Scenario: Legal move accepted
- **WHEN** user drags a piece and drops it on a legal destination square
- **THEN** the move is applied and the board position updates

#### Scenario: Illegal move rejected
- **WHEN** user drags a piece and drops it on an illegal destination (occupied by own piece, blocked path, etc.)
- **THEN** the move is rejected, the piece snaps back to its original square, and the board position remains unchanged

### Requirement: Enforce turn order
The system SHALL prevent pieces of the non-active color from being moved.

#### Scenario: Cannot move opponent piece
- **WHEN** it is white's turn and user attempts to drag a black piece
- **THEN** the piece cannot be picked up and drag operation is prevented

### Requirement: Prevent invalid pawn captures
The system SHALL ensure pawns can only be moved or captured according to standard chess rules.

#### Scenario: Pawn forward capture invalid
- **WHEN** white pawn attempts to capture diagonally forward to an empty square
- **THEN** the move is rejected and piece snaps back

### Requirement: Enforce check legality
The system SHALL prevent moves that would leave the king in check.

#### Scenario: Move that leaves king in check rejected
- **WHEN** user attempts a move that would result in their king being in check
- **THEN** the move is rejected and the piece returns to its original square

### Requirement: Support promotion on pawn advancement
When a pawn reaches the promotion rank, the system SHALL prompt the user to select a promotion piece (queen, rook, bishop, or knight).

#### Scenario: Pawn promotion required
- **WHEN** user moves a pawn to the eighth rank (for white) or first rank (for black)
- **THEN** a promotion dialog appears allowing selection of promotion piece

### Requirement: Visual feedback for legal destination squares
The system MAY provide visual indicators (highlighting, color change) showing which squares are legal destinations during a piece drag operation.

#### Scenario: Legal squares highlighted during drag
- **WHEN** user begins dragging a piece
- **THEN** legal destination squares may be highlighted for user guidance

### Requirement: Snapback behavior for rejected moves
When a move is rejected, the piece SHALL snap back smoothly to its original square position.

#### Scenario: Piece snaps back on invalid move
- **WHEN** an illegal move attempt is made and rejected
- **THEN** the piece visually returns to its starting square with smooth animation
