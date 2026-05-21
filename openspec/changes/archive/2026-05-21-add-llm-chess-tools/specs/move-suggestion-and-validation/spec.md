## ADDED Requirements

### Requirement: LLM suggests moves through tools
The system SHALL allow the LLM to suggest moves by calling validation tools, with visual and error feedback.

#### Scenario: LLM suggests valid move
- **WHEN** LLM calls `validate_move(from, to)` and receives `valid: true`, then calls `apply_move(from, to)`
- **THEN** frontend detects move in LLM response and applies it to the board display

#### Scenario: LLM suggests invalid move
- **WHEN** LLM calls `validate_move(from, to)` and receives `valid: false`
- **THEN** system displays warning popup showing the reason (e.g., "Move is not legal in current position")

#### Scenario: Move suggestion includes analysis
- **WHEN** LLM applies a move and calls `analyze_position()` for the new position
- **THEN** system returns analysis of the new position, and LLM includes both move and analysis in response

### Requirement: Frontend detects and applies moves
The system SHALL parse LLM responses to identify move suggestions and apply them to the board.

#### Scenario: Parse move from LLM response
- **WHEN** LLM response contains move object with `from` and `to` fields
- **THEN** frontend extracts move and applies it to board display

#### Scenario: Move with analysis metadata
- **WHEN** move object includes `analysis` field
- **THEN** frontend displays move alongside analysis (same as standard analysis lines)

### Requirement: Invalid move warning dialog
The system SHALL display user-friendly warnings when LLM-suggested moves are invalid.

#### Scenario: Show invalid move warning
- **WHEN** LLM suggests invalid move
- **THEN** popup appears with title "Invalid Move" and message showing the reason

#### Scenario: Warning preserves board state
- **WHEN** warning is shown
- **THEN** board remains in state before the invalid move (no changes applied)

#### Scenario: User can dismiss warning
- **WHEN** warning is displayed
- **THEN** user can click "OK" or close button to dismiss; board remains unchanged
