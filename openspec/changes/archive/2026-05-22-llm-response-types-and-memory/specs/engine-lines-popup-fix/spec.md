## ADDED Requirements

### Requirement: Engine analysis produces multiple lines
The system SHALL ensure the chess engine (Stockfish or LC0) returns multiple analysis lines (top variations) for any position, with at least 3 lines returned by default.

#### Scenario: Engine returns multiple lines for mid-game position
- **WHEN** user clicks "Start Analysis" on a mid-game position
- **THEN** engine analyzes and returns 3+ top lines with move sequences

#### Scenario: Engine returns lines for opening position
- **WHEN** analysis runs from starting position
- **THEN** engine returns multiple opening variations

#### Scenario: Engine returns lines with depth and evaluation
- **WHEN** engine completes analysis
- **THEN** each line includes: principal variation (moves), depth, evaluation score

### Requirement: Lines popup displays all engine variations
The system SHALL display a modal popup showing all engine lines with move previews after analysis completes.

#### Scenario: Modal shows up immediately after analysis
- **WHEN** engine analysis finishes
- **THEN** modal popup appears with list of lines

#### Scenario: Each line shows move preview
- **WHEN** modal displays lines
- **THEN** each line displays first 3-4 moves followed by move count indicator

#### Scenario: Lines are clickable and selectable
- **WHEN** user clicks on a line in the modal
- **THEN** line is highlighted and full variation is loaded for keyboard navigation

### Requirement: Engine line parsing is robust
The system SHALL correctly parse engine output and handle edge cases (empty position, mate threats, etc.).

#### Scenario: Handle positions with limited moves
- **WHEN** position has only 1 legal move (zugzwang)
- **THEN** popup shows single line and indicates it is forced

#### Scenario: Handle mate in X scenarios
- **WHEN** engine finds forced mate sequence
- **THEN** line is displayed with mate notation (e.g., "Mate in 3")
