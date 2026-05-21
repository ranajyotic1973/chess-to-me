## ADDED Requirements

### Requirement: Draw arrows for first move of each line
The system SHALL draw directional arrows on the chessboard showing the first move of each engine analysis line.

#### Scenario: Arrows display for top lines
- **WHEN** engine analysis completes
- **THEN** an arrow appears for each line's first move (e.g., from e2 to e4)

#### Scenario: Each arrow uses distinct color
- **WHEN** multiple lines are displayed
- **THEN** each line's arrow uses a different color for visual distinction

#### Scenario: Arrows update on position change
- **WHEN** user navigates to a new position
- **THEN** arrows update to show first moves of lines for the new position

### Requirement: Clear arrows on new analysis
The system SHALL remove all previous arrows when new analysis starts.

#### Scenario: Old arrows cleared on analysis start
- **WHEN** user starts new analysis
- **THEN** all arrows from previous analysis are removed

#### Scenario: Board shows only current analysis arrows
- **WHEN** analysis completes
- **THEN** only the newest analysis arrows are visible on board

### Requirement: Arrow visualization graceful degradation
If the chessboard.js library does not support arrow drawing, the system SHALL display engine lines as text only without visual arrows.

#### Scenario: Library supports arrows
- **WHEN** chessboard.js library has arrow drawing capability
- **THEN** arrows are drawn as designed

#### Scenario: Library does not support arrows
- **WHEN** chessboard.js library does not support arrow drawing
- **THEN** engine lines display as numbered text list without visual arrows

