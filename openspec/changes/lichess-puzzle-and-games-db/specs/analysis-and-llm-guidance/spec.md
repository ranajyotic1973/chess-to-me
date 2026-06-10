## ADDED Requirements

### Requirement: Puzzle classification extracts structured search intent from the user question
When PASS 1 classifies a question as `PUZZLE`, the system SHALL additionally extract structured search parameters as part of the same classification response (or a lightweight follow-up call). The extracted parameters SHALL be a JSON object: `{ theme?: string, minRating?: number, maxRating?: number, opening?: string }`. Fields MAY be omitted if not determinable from the question.

#### Scenario: User asks for a themed puzzle at a specific rating
- **WHEN** the user asks "Give me a discovered attack puzzle around 1600 rating"
- **THEN** the classification step SHALL return (alongside `PUZZLE`) `{ theme: "discoveredAttack", minRating: 1400, maxRating: 1800 }` (using a ±200 window around the stated rating)

#### Scenario: User asks for a puzzle with no specific constraints
- **WHEN** the user asks "Give me a puzzle"
- **THEN** the classification step SHALL return `PUZZLE` with an empty intent object `{}`, and the DB query SHALL select a random puzzle

#### Scenario: User asks for an opening-specific puzzle
- **WHEN** the user asks "Show me a Sicilian Defence tactical puzzle"
- **THEN** the intent extraction SHALL return `{ theme: "tactics", opening: "Sicilian" }` (or similar theme approximation)

### Requirement: LLM puzzle presentation prompt includes DB puzzle data as context
When `handlePuzzleRequest` has sourced a puzzle from the local DB, the system prompt used for the LLM presentation call SHALL include the puzzle's `fen`, `moves` (UCI array), `themes`, and `opening_tags` as explicit context. The prompt SHALL instruct the LLM to use this data as the puzzle content and to write a story/walkthrough, NOT to generate a new puzzle position.

#### Scenario: LLM receives DB puzzle context
- **WHEN** the LLM presentation call is made with a DB-sourced puzzle
- **THEN** the system prompt SHALL contain the literal FEN string and UCI move array from the DB row, and the instruction "Present this exact puzzle — do not generate a new position"
