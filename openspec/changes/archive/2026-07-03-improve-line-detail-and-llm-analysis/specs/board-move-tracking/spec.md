## ADDED Requirements

### Requirement: Display moves played on board
The Line Detail control SHALL display only the moves that have been made on the board, in chronological order, with the most recent move highlighted.

#### Scenario: Display moves after White's first move
- **WHEN** user makes White's first move (e.g., e4)
- **THEN** Line Detail shows "1. e4" and highlights it

#### Scenario: Display moves after Black responds
- **WHEN** user makes Black's first move (e.g., c5)
- **THEN** Line Detail shows "1. e4 c5" with c5 highlighted

#### Scenario: Display moves after more moves
- **WHEN** user makes White's second move (e.g., Nf3)
- **THEN** Line Detail shows "1. e4 c5 2. Nf3" with Nf3 highlighted

### Requirement: Highlight last played move
The Line Detail control SHALL highlight only the most recently played move, using yellow background and bold formatting.

#### Scenario: Highlight changes as moves are made
- **WHEN** user makes a new move
- **THEN** the previous move's highlighting is removed
- **AND** the new move is highlighted with yellow background and bold

### Requirement: Keyboard navigation through played moves
The system SHALL support backward and forward navigation through played moves using keyboard arrow keys.

#### Scenario: Navigate backward with left arrow
- **WHEN** user presses the left arrow key
- **THEN** the move highlighting shifts to the previous move
- **AND** the line detail displays all moves up to and including that move

#### Scenario: Navigate forward with right arrow
- **WHEN** user presses the right arrow key
- **THEN** the move highlighting shifts to the next move
- **AND** the line detail displays all moves up to and including that move

#### Scenario: Navigation at boundaries
- **WHEN** user presses left arrow at the first move
- **THEN** no change occurs
- **WHEN** user presses right arrow at the last (current) move
- **THEN** no change occurs

### Requirement: Update "Moves Played" header
The Line Detail control header SHALL display "Moves Played" instead of any line selection label.

#### Scenario: Header displays correct label
- **WHEN** Line Detail is rendered
- **THEN** the header shows "Moves Played"
