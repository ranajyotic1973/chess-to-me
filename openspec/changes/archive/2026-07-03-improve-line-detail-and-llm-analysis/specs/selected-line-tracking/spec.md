## ADDED Requirements

### Requirement: Hash-based line lookup
The system SHALL maintain a hash map for each cached engine line to enable O(1) lookup of which line matches the current board position (move sequence).

#### Scenario: Create hash map for engine lines
- **WHEN** engine analysis completes and returns lines
- **THEN** a hash map is created for each line mapping move sequences to line metadata

#### Scenario: Lookup line by move sequence
- **WHEN** user makes a move on the board
- **THEN** the move sequence is hashed and looked up in the engine line hash maps
- **AND** the matching line is identified in O(1) time

### Requirement: Match board moves to engine lines
The system SHALL automatically select the engine line that matches the user's current board move sequence.

#### Scenario: Select line after first move
- **WHEN** user makes White's first move (e.g., e4)
- **THEN** engine lines are searched for one starting with e4
- **AND** the matching line is automatically selected

#### Scenario: Select line after multiple moves
- **WHEN** user makes a sequence of moves that match the beginning of an engine line
- **THEN** the matching line is automatically selected
- **AND** the selected line updates as the user continues playing

#### Scenario: No matching line
- **WHEN** user makes a move that doesn't match any engine line
- **THEN** no line is selected
- **AND** Line Detail shows only the moves played on the board

### Requirement: Remove line selection UI controls
The system SHALL remove the "Line selected" label and "deselect line" button from the interface.

#### Scenario: No selection buttons visible
- **WHEN** Line Detail is rendered
- **THEN** no selection confirmation buttons are displayed
- **AND** line selection is implicit based on board move matching
