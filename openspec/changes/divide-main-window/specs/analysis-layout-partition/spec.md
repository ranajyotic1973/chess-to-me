## ADDED Requirements

### Requirement: Two-column analysis layout
The renderer SHALL split the analysis view into a left column that takes approximately 70% of the available width and a right column that occupies the remaining 30%, and both columns SHALL stretch to the full height of the window.

#### Scenario: Render analysis view
- **WHEN** the user switches to the analysis tab after configuring Stockfish
- **THEN** the left column contains only the chess board and the + button, the right column hosts chat/settings, and no vertical stacking occurs between the columns.

### Requirement: Board padding with preserved shadow
The chess board container SHALL include 5px of padding on every side so the board fits snugly inside the column while keeping its drop shadow visible and without introducing a filled panel beneath the board.

#### Scenario: Display the board
- **WHEN** the board renders inside the left column
- **THEN** there is exactly 5px of padding around the board container, the drop shadow remains exposed, and no additional panel or empty card is rendered below the board.

### Requirement: FEN popup tied to board column
The + button that opens the existing FEN dialog SHALL remain inside the left column directly beneath the board so the trigger stays visually connected to the board area.

#### Scenario: Opening the FEN popup
- **WHEN** the user clicks the + icon below the board
- **THEN** the FEN popup opens while the button remains aligned under the board and no other controls appear between the button and the board.
