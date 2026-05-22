## ADDED Requirements

### Requirement: LLM returns structured response type
The system SHALL require the LLM to include a `response_type` field in every response, with value one of: `Analysis`, `Puzzle`, `Position`, or `Game`. This allows the UI to apply type-specific rendering and behavior.

#### Scenario: User asks for analysis
- **WHEN** user asks "Analyze this position"
- **THEN** LLM returns JSON with `response_type: "Analysis"` along with explanation and engine lines

#### Scenario: User asks for a puzzle
- **WHEN** user asks "Create a puzzle from this position"
- **THEN** LLM returns `response_type: "Puzzle"` with a FEN string and hidden solution

#### Scenario: User asks for position evaluation
- **WHEN** user asks "What pieces are on this square?"
- **THEN** LLM returns `response_type: "Position"` with FEN for rendering

#### Scenario: User asks to annotate a game
- **WHEN** user asks "Annotate this game with quality symbols"
- **THEN** LLM returns `response_type: "Game"` with PGN and move annotations

### Requirement: System prompt instructs LLM on response format
The system SHALL include explicit instruction in the LLM system prompt to output JSON with required fields based on response type.

#### Scenario: System message includes format specification
- **WHEN** LLM request is sent to any provider
- **THEN** system prompt includes JSON schema with required fields for each response type

