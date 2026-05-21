## MODIFIED Requirements

### Requirement: Analysis triggered manually, not on board movement
The system SHALL only analyze positions when user explicitly clicks "Start Analysis" button, not automatically on board piece movement.

#### Scenario: User moves piece without auto-analysis
- **WHEN** user moves a piece on the board
- **THEN** the position updates but analysis does NOT start automatically

#### Scenario: Analysis starts on explicit button click
- **WHEN** user clicks "Start Analysis" button
- **THEN** engine analyzes current position and returns lines

### Requirement: Engine lines are source of truth for analysis
The system SHALL use configured engine (Stockfish/LC0) to generate analysis lines and provide those lines directly to user and LLM context.

#### Scenario: Engine analysis displayed with line numbers
- **WHEN** analysis completes
- **THEN** top 4 engine lines are displayed as: "Line 1: e2-e4...", "Line 2: d2-d4...", etc.

#### Scenario: Engine lines sent to LLM context
- **WHEN** user asks a question about position
- **THEN** LLM receives: "Top engine lines for this position are: [lines]"

#### Scenario: LLM explains engine lines only
- **WHEN** LLM responds to user question
- **THEN** LLM explains why engine lines are strong, not suggesting different moves

### Requirement: LLM provides explanation and strategic insight only
The system SHALL use LLM to explain position, assess risks, and provide strategic context - NOT to suggest or infer moves.

#### Scenario: LLM explains position ideas
- **WHEN** user asks "What should White play?"
- **THEN** LLM explains the position and points to engine lines: "The top move is e2-e4 (Line 1) because..." 

#### Scenario: User sees engine lines as the moves
- **WHEN** user needs move suggestions
- **THEN** system displays engine lines with numbers (Line 1, 2, 3, 4), not LLM-inferred moves

#### Scenario: LLM avoids AI chatter
- **WHEN** LLM responds
- **THEN** response contains pure chess analysis without generic AI commentary

## REMOVED Requirements

### Requirement: LLM responses present move suggestions
**Reason**: Replaced by engine-driven lines. LLM now explains positions, not suggests moves.
**Migration**: Use numbered engine lines (Line 1, Line 2, etc.) for move suggestions. Ask LLM "Why is Line 1 best?" instead of "What move should I play?"

