## ADDED Requirements

### Requirement: LLM access to board state
The system SHALL provide tools that allow the LLM to retrieve and inspect the current chess board position without modifying it.

#### Scenario: Get current position FEN
- **WHEN** LLM calls `get_board_fen()` tool
- **THEN** system returns the current position as a FEN string

#### Scenario: Get list of legal moves
- **WHEN** LLM calls `get_legal_moves()` tool
- **THEN** system returns array of legal moves in algebraic notation (e.g., ["e2e4", "d2d4", ...])

### Requirement: LLM move validation
The system SHALL allow the LLM to validate whether a proposed move is legal in the current position.

#### Scenario: Validate legal move
- **WHEN** LLM calls `validate_move(from, to)` with valid coordinates
- **THEN** system returns `{ valid: true }`

#### Scenario: Validate illegal move
- **WHEN** LLM calls `validate_move(from, to)` with illegal move (e.g., e2-e6 when queen on e2)
- **THEN** system returns `{ valid: false, reason: "<reason>" }` (e.g., "move is not legal in current position")

#### Scenario: Validate move with invalid square
- **WHEN** LLM calls `validate_move(from, to)` with non-existent squares
- **THEN** system returns `{ valid: false, reason: "invalid square" }`

### Requirement: LLM move application
The system SHALL allow the LLM to apply a validated move to the board state.

#### Scenario: Apply legal move to board
- **WHEN** LLM calls `apply_move(from, to)` with a validated legal move
- **THEN** board updates to reflect the move, and system returns new FEN

#### Scenario: Prevent applying invalid move
- **WHEN** LLM calls `apply_move(from, to)` with an invalid move
- **THEN** system returns error and board remains unchanged

### Requirement: LLM position analysis request
The system SHALL allow the LLM to request analysis of any position.

#### Scenario: Request analysis of current position
- **WHEN** LLM calls `analyze_position()` with no FEN argument (or current FEN)
- **THEN** system triggers engine analysis (using depth from settings) and returns analysis result

#### Scenario: Request analysis of hypothetical position
- **WHEN** LLM calls `analyze_position(fen, depth)` with arbitrary FEN
- **THEN** system triggers engine analysis of that position and returns analysis result

#### Scenario: Analysis returns engine lines
- **WHEN** analysis completes
- **THEN** system returns object with best line, evaluation, and alternate lines (same format as standard analysis)
