## ADDED Requirements

### Requirement: LLM supports multiple response types beyond Analysis
The system SHALL extend LLM capability to handle response types: `Analysis`, `Puzzle`, `Position`, and `Game` in addition to position analysis.

#### Scenario: User requests puzzle creation
- **WHEN** user asks "Create a puzzle from this position"
- **THEN** LLM returns `response_type: "Puzzle"` with FEN, solution, and difficulty assessment

#### Scenario: User requests position evaluation
- **WHEN** user asks "Evaluate this position"
- **THEN** LLM returns `response_type: "Position"` with FEN and piece placement explanation

#### Scenario: User requests game annotation
- **WHEN** user asks "Annotate this PGN with move quality"
- **THEN** LLM returns `response_type: "Game"` with annotated PGN

### Requirement: Conversation history is provided to LLM
The system SHALL include the last 10 user-LLM exchanges as context in every LLM request to maintain conversation coherence.

#### Scenario: Follow-up questions reference previous analysis
- **WHEN** user asks "Why is that better than my original move?" after previous analysis
- **THEN** LLM receives context of previous exchange and can refer to it

#### Scenario: LLM request includes conversation array
- **WHEN** LLM request is sent
- **THEN** payload includes `conversationHistory: [{role, message, timestamp}]` array

### Requirement: System prompt is token-optimized
The system SHALL use compact JSON-formatted instructions in the system prompt, reducing token overhead by 30-40%.

#### Scenario: System message uses JSON schema
- **WHEN** LLM is called
- **THEN** system prompt uses structured JSON schema instead of verbose prose

#### Scenario: Response type instructions are inline
- **WHEN** LLM processes system prompt
- **THEN** instructions for Analysis, Puzzle, Position, Game response types are defined in single JSON schema

## MODIFIED Requirements

### Requirement: Stockfish analysis is triggered for pasted FEN and forwarded to LLM
The system SHALL continue to analyze positions when FEN is pasted or entered. Analysis is sent to LLM as context for explanations. Conversation history is now included to provide continuity.

#### Scenario: Pasted FEN is analyzed and sent to LLM with prior context
- **WHEN** user pastes a FEN string
- **THEN** the system analyzes it with Stockfish, includes conversation history, and forwards both to LLM for explanation

#### Scenario: LLM explanation references previous discussions
- **WHEN** LLM receives analysis plus conversation history
- **THEN** LLM can reference prior positions or concepts from the conversation

### Requirement: LLM explanations describe risks/plans and omit non-chess commentary
LLM responses SHALL assess risk for both sides, recommend attack plans, and avoid generic AI commentary. All explanations SHALL focus purely on chess.

#### Scenario: LLM avoids AI chatter in optimized prompt
- **WHEN** LLM is instructed with optimized system prompt
- **THEN** response contains pure chess analysis, no references to being an AI or hallucinations

### Requirement: User can ask chat questions tied to the current position
The chat interface SHALL attach the current FEN and conversation history to each user question. All responses SHALL be chess-focused.

#### Scenario: Chat question includes conversation context
- **WHEN** user submits a follow-up question
- **THEN** LLM receives the question, current position, and previous 10 exchanges for context
