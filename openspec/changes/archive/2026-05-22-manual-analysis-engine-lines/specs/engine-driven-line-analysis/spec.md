## ADDED Requirements

### Requirement: Engine provides analysis lines
The system SHALL use the configured engine (Stockfish or LC0) to analyze positions and return the top analysis lines.

#### Scenario: Engine analysis on demand
- **WHEN** user clicks "Start Analysis"
- **THEN** the configured engine analyzes the position and returns top lines

#### Scenario: Lines respect engine depth setting
- **WHEN** analysis completes
- **THEN** the lines are generated at the configured analysis depth from settings

#### Scenario: Top 4 lines displayed
- **WHEN** engine analysis completes
- **THEN** up to 4 top analysis lines are returned and displayed

### Requirement: LLM explains position using engine lines
The system SHALL include engine analysis lines in the LLM chat context and request LLM to provide explanation and strategic insight.

#### Scenario: Engine lines in LLM context
- **WHEN** user asks a question about position
- **THEN** the LLM prompt includes: "Here are the top engine lines: [list of lines]"

#### Scenario: LLM focuses on explanation not moves
- **WHEN** LLM responds to user question
- **THEN** LLM explains position ideas, strategies, and why engine lines are strong (not suggesting new moves)

#### Scenario: User gets accurate lines from engine
- **WHEN** user asks "What are the best moves?"
- **THEN** system shows engine lines, not LLM-inferred moves

### Requirement: No LLM move inference
The system SHALL NOT allow LLM to suggest or infer moves; LLM role is explanation only.

#### Scenario: LLM provides context not moves
- **WHEN** LLM responds to user
- **THEN** response contains analysis and explanation, not move suggestions

#### Scenario: Engine is source of truth for lines
- **WHEN** user needs move suggestions
- **THEN** they see engine lines with numbers, not LLM-suggested moves

