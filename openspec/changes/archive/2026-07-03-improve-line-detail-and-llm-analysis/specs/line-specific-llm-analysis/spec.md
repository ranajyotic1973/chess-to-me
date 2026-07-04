## ADDED Requirements

### Requirement: Scope LLM analysis to selected line only
The system SHALL analyze only the engine line that is currently selected, instead of analyzing all available lines.

#### Scenario: LLM analyzes selected line
- **WHEN** an engine line is selected and enough moves have been played (moveNumber >= 2 AND Black to move)
- **THEN** LLM analysis is requested for that specific line only
- **AND** no analysis is performed for unselected lines

#### Scenario: LLM analysis updates when line changes
- **WHEN** the user makes a move that selects a different engine line
- **THEN** the previous line's analysis is discarded
- **AND** LLM analysis is requested for the newly selected line

### Requirement: LLM evaluates position and line moves
The system SHALL provide LLM with the current position and the moves in the selected line for analysis.

#### Scenario: LLM receives position context
- **WHEN** LLM analysis is triggered
- **THEN** the current FEN position is sent to the LLM
- **AND** the moves in the selected line are included in the analysis request

#### Scenario: LLM response displays correctly
- **WHEN** LLM returns analysis for the selected line
- **THEN** the response is displayed in markdown format
- **AND** the response is associated only with the selected line

### Requirement: Only fetch LLM after sufficient moves
The system SHALL only initiate LLM analysis when White has played 2 moves and Black has played 1 move (moveNumber >= 2 AND activeColor === 'b').

#### Scenario: LLM not fetched too early
- **WHEN** user makes moves 1-3 (White, Black, White)
- **THEN** no LLM analysis is requested during moves 1 or 2

#### Scenario: LLM fetched at correct time
- **WHEN** the position reaches moveNumber >= 2 AND activeColor === 'b'
- **THEN** LLM analysis is fetched for the selected line
