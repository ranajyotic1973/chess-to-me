## ADDED Requirements

### Requirement: Store selected line in app state
The system SHALL maintain the currently selected line in app state (BoardStateManager or similar).

#### Scenario: Line stored after selection
- **WHEN** user selects a line
- **THEN** the line is stored in app state for reference

#### Scenario: Selected line persists during navigation
- **WHEN** user has selected a line and views other UI elements
- **THEN** the selected line remains in memory

### Requirement: Track position within selected line
The system SHALL track the current move index within the selected line.

#### Scenario: Move index initialized
- **WHEN** line is first selected
- **THEN** current move index is set to 0 (start of line)

#### Scenario: Move index updated on navigation
- **WHEN** user navigates forward/backward through line
- **THEN** move index increments or decrements accordingly

### Requirement: Memorize line across board states
The system SHALL remember the selected line even as user explores variations.

#### Scenario: Line not forgotten on board update
- **WHEN** user navigates through line moves
- **THEN** the line selection is maintained throughout exploration

#### Scenario: Line cleared on new analysis
- **WHEN** user starts new analysis (clicks "Start Analysis")
- **THEN** previous line selection is cleared

### Requirement: Display selected line in UI
The system SHALL show which line is currently selected and the current move position.

#### Scenario: Selected line status displayed
- **WHEN** line is selected
- **THEN** UI shows "Currently exploring Line 2" or "Line 2: Move 3 of 8"

#### Scenario: Navigation info available
- **WHEN** user explores line
- **THEN** "Move X of Y" indicator shows progress through line

