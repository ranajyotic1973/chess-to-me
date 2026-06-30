## MODIFIED Requirements

### Requirement: Move validation on piece drop
The system SHALL validate all piece drop operations using chess.js move validation logic before applying the move to the board. If a move is invalid, the piece SHALL snap back to its original position and the board state SHALL NOT change.

#### Scenario: Valid move applied
- **WHEN** user drags a piece to a legal destination square
- **THEN** the `chess.move()` function in chess.js returns a move object (not null), the move is applied, and the board position updates with the new FEN

#### Scenario: Invalid move rejected with snapback
- **WHEN** user drags a piece to an illegal destination (e.g., occupied by own piece, impossible path for that piece type)
- **THEN** `chess.move()` returns null, the `onDrop` handler returns "snapback", and the piece visually returns to its starting square

### Requirement: Legal turn enforcement
The system SHALL only allow pieces of the active player's color to be dragged, preventing moves out of turn.

#### Scenario: Only active player's pieces draggable
- **WHEN** it is white's turn (or black's turn) and user attempts to drag a piece
- **THEN** the `onDragStart` handler checks `chess.turn()` and compares the piece color to the active turn, returning false to prevent drag if colors don't match

#### Scenario: Opponent pieces cannot be picked up
- **WHEN** it is black's turn and user attempts to drag a white piece
- **THEN** the piece is not picked up, no drag operation begins, and board position is unchanged

### Requirement: Pawn promotion dialog on advancement
When a pawn move results in the pawn reaching the promotion rank (rank 8 for white, rank 1 for black), the system SHALL prompt the user to select a promotion piece if not already specified.

#### Scenario: Promotion prompt appears
- **WHEN** user drags a white pawn to rank 8 (or black pawn to rank 1)
- **THEN** the move is tentatively accepted, a promotion dialog appears asking the user to select Queen/Rook/Bishop/Knight, and the final move is recorded once selection is made

### Requirement: Piece placement respects check rules
The system SHALL not allow any move that would result in the moving player's king being in check.

#### Scenario: Move leaving king in check rejected
- **WHEN** user attempts a move that would leave their king in check (including discovered check scenarios)
- **THEN** `chess.move()` validates this and returns null, the move is rejected, and the piece snaps back

### Requirement: Board state synchronized with chess.js
The board display SHALL always reflect the current state of the internal chess.js board instance, ensuring visual and logical state match.

#### Scenario: Board position reflects latest move
- **WHEN** a move is applied via the `onDrop` handler
- **THEN** `chess.fen()` returns the updated position, `setCurrentFen(nextFen)` is called, and the board renders the new position

### Requirement: Piece drag-and-drop disabled in certain modes
Piece drag-and-drop interactions SHALL be disabled in Puzzle mode and Game mode where player input should be text-based (e.g., typing move in chat).

#### Scenario: Dragging disabled in Puzzle mode
- **WHEN** `puzzleMode === true` (including when `currentResponseType === "Puzzle"`)
- **THEN** the chessboard is initialized with `draggable: false`, pieces cannot be picked up, and the board is non-interactive except for display

#### Scenario: Dragging enabled in Analysis mode
- **WHEN** the application is in standard Analysis mode (not Puzzle, not Game)
- **THEN** the chessboard is initialized with `draggable: true`, pieces are interactive, and drag-and-drop works normally
