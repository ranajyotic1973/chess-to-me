## MODIFIED Requirements

### Requirement: Display selected line's moves
The system SHALL display the moves of a selected engine line to help the user understand the engine's analysis and recommendations.

#### Scenario: Display line moves in order
- **WHEN** a line is selected
- **THEN** all moves in that line are displayed in order
- **AND** moves are shown in algebraic notation (e.g., e4, c5, Nf3)

#### Scenario: Highlight last matched move
- **WHEN** a line is selected based on matching board moves
- **THEN** the last move that was played on the board (and matched to the line) is highlighted
- **AND** future moves in the line (not yet played) are displayed but not highlighted

### Requirement: Display moves with keyboard navigation
The system SHALL allow users to navigate through the displayed moves using arrow keys.

#### Scenario: Navigate through line moves
- **WHEN** user presses left or right arrow keys
- **THEN** the highlight moves within the displayed line moves
- **AND** the currently highlighted move changes to show which move is being reviewed

### Requirement: Show moves in SAN format
The system SHALL convert move notation to Standard Algebraic Notation (SAN) for display.

#### Scenario: Convert UCI to SAN
- **WHEN** engine lines contain moves in UCI format (e.g., e2e4)
- **THEN** moves are converted to SAN format (e.g., e4) for display
- **AND** special moves (castling, en passant, promotion) are displayed correctly
