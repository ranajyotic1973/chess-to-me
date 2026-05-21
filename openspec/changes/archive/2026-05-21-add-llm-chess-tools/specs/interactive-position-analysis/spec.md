## ADDED Requirements

### Requirement: Automatic analysis after move application
The system SHALL analyze the position after an LLM-suggested move is applied to the board.

#### Scenario: Analyze position after move
- **WHEN** LLM applies a move via `apply_move(from, to)`
- **THEN** system can call `analyze_position()` to analyze the new position using the configured engine

#### Scenario: Analysis uses configured engine settings
- **WHEN** `analyze_position()` is called
- **THEN** analysis uses the depth and engine settings from the application's settings panel

#### Scenario: Analysis includes multiple lines
- **WHEN** analysis completes
- **THEN** result includes best line plus alternate lines (same structure as standard multi-PV analysis)

### Requirement: LLM integrates move and analysis in response
The system SHALL allow the LLM to combine move suggestions with analysis of the resulting position.

#### Scenario: LLM provides move with analysis
- **WHEN** LLM suggests a move and immediately analyzes the resulting position
- **THEN** LLM response includes both the move object and analysis explanation

#### Scenario: Analysis is integrated into explanation text
- **WHEN** LLM includes analysis in response
- **THEN** analysis is presented as structured data (not just text) so frontend can apply it to board alongside move

### Requirement: Position analysis works with any FEN
The system SHALL support analysis of arbitrary positions, not just the current board state.

#### Scenario: Analyze hypothetical position
- **WHEN** LLM calls `analyze_position(fen)` with arbitrary FEN
- **THEN** system analyzes that position without modifying the current board state

#### Scenario: Current board unchanged by analysis call
- **WHEN** LLM analyzes a hypothetical position
- **THEN** the current board position remains unmodified; analysis is returned without side effects

#### Scenario: Analysis respects depth parameter
- **WHEN** LLM calls `analyze_position(fen, depth)` with custom depth
- **THEN** system uses the specified depth (if provided) or falls back to settings default
