## ADDED Requirements

### Requirement: Start analysis with button
The system SHALL provide a "Start Analysis" button that triggers engine analysis of the current board position.

#### Scenario: Start analysis from current position
- **WHEN** user clicks the "Start Analysis" button
- **THEN** the engine begins analysis and displays progress

#### Scenario: Button disabled when analysis running
- **WHEN** analysis is already running
- **THEN** the "Start Analysis" button is disabled

### Requirement: Stop analysis with button
The system SHALL provide a "Stop Analysis" button that halts the currently running engine analysis.

#### Scenario: Stop ongoing analysis
- **WHEN** user clicks "Stop Analysis" while analysis is running
- **THEN** the analysis stops and engine returns partial results

#### Scenario: Button disabled when analysis not running
- **WHEN** analysis is not running
- **THEN** the "Stop Analysis" button is disabled

### Requirement: No auto-analysis on board move
The system SHALL NOT automatically start analysis when a piece is moved on the board.

#### Scenario: User moves piece manually
- **WHEN** user moves a piece on the board
- **THEN** the board updates the position but analysis does not start automatically

#### Scenario: Analysis only on explicit start
- **WHEN** user has moved a piece and wants analysis
- **THEN** user must click "Start Analysis" button to trigger it

### Requirement: Analysis state tracking
The system SHALL track whether analysis is currently running and display clear visual feedback.

#### Scenario: Button labels reflect current state
- **WHEN** analysis is not running, button shows "Start Analysis"
- **THEN** user knows they can begin analysis

#### Scenario: Button labels when running
- **WHEN** analysis is running, button shows "Stop Analysis"
- **THEN** user knows analysis is active and can stop it

