# LLM Position Question Handling

The system SHALL handle position-specific questions by auto-fetching the current FEN from the chessboard, querying the selected engine for analysis lines, and providing context-aware answers with strategic recommendations based on the top line.

## ADDED Requirements

### Requirement: Auto-retrieve FEN from chessboard when question is asked
The system SHALL automatically fetch the current FEN notation from the React chessboard component when the user submits a question, without requiring manual FEN entry.

#### Scenario: FEN auto-fetched on question submission
- **WHEN** user types a question and submits it
- **THEN** system retrieves current board FEN automatically and passes it to the question handler

### Requirement: Query selected engine for analysis lines when question is asked
The system SHALL automatically send the FEN to the selected chess engine (Stockfish or LC0) to generate fresh analysis lines when a question is submitted, without requiring pre-existing analysis.

#### Scenario: Engine analysis auto-triggered
- **WHEN** user submits a question without existing analysis
- **THEN** system queries the selected engine for 3-4 top analysis lines and includes them in the LLM request

### Requirement: Include top analysis line in question response for best-move recommendations
The system SHALL use the top-ranked analysis line (Line 1) to provide the best next move recommendation when answering position-specific questions.

#### Scenario: Best move recommendation from top line
- **WHEN** LLM answers a question like "What should I play here?"
- **THEN** system includes top line in context, and LLM recommends the first move of that line as the best continuation

### Requirement: Support move-by-move explanation requests
The system SHALL detect when user asks to "explain this line move-by-move" and provide the full move sequence to the LLM with instructions to break down each move's purpose.

#### Scenario: Move-by-move breakdown on request
- **WHEN** user asks "explain the first line move by move"
- **THEN** system includes full line in LLM prompt with instruction to explain each move sequentially

### Requirement: Provide full position context in question responses
The system SHALL include position FEN, normalized analysis lines, user question, and selected engine name in the LLM request for position questions, ensuring LLM has complete context for accurate answers.

#### Scenario: Complete question context provided to LLM
- **WHEN** system builds prompt for a position question
- **THEN** prompt includes current FEN, top 3-4 analysis lines, user's specific question, and engine name

### Requirement: Cache recent analysis to avoid redundant engine queries
The system SHALL cache the most recent analysis result (lines + FEN) and reuse it if the same position is questioned within 30 seconds without board changes.

#### Scenario: Cache hit on repeated question
- **WHEN** user asks two questions about the same position within 30 seconds
- **THEN** system uses cached analysis from first question, avoiding redundant engine query
