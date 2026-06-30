# analysis-and-llm-guidance Specification (Delta)

## ADDED Requirements

### Requirement: LLM explanation is triggered for every user move

The system SHALL invoke LLM analysis (via `explainLines`, `fetchPerMoveExplanation`, or `askQuestion`) for each user move event in analysis mode. This includes: (1) user move matches an engine line (auto-select), (2) user navigates within a selected line via arrow keys, (3) user makes an off-book move requiring new position analysis.

#### Scenario: Matched move triggers LLM explanation
- **WHEN** user drag/drops a move that matches engine line N's first move
- **THEN** system SHALL call `fetchPerMoveExplanation(N, line, baseFen, 0, move)` to explain that move to the user

#### Scenario: Arrow-key navigation within line triggers LLM
- **WHEN** user presses right arrow to advance within selected line and moves to index K
- **THEN** system SHALL fetch LLM explanation for move at index K (already implemented, no change required)

#### Scenario: Off-book move triggers LLM for new position
- **WHEN** user move does not match any engine line, engine analysis completes on new position, and new lines are fetched
- **THEN** system SHALL call `explainLines` with the new FEN and lines to explain the new position and top candidates

### Requirement: LLM is invoked once per user move event (one pipeline per question)

The system SHALL enforce one LLM call per distinct user move event, respecting the one-pipeline-per-question constraint in CLAUDE.md. Rapid or simultaneous events (e.g., fast drag/drop + arrow key) are treated as separate events, each triggering one LLM call.

#### Scenario: One call per drag/drop
- **WHEN** user makes a single drag/drop move
- **THEN** system SHALL invoke exactly one LLM call (either for matched line or off-book position); no duplicate calls within that move event

#### Scenario: Arrow key advance triggers separate call
- **WHEN** user presses arrow key to navigate within line after initial selection
- **THEN** system SHALL invoke a separate LLM call for that navigation event, independent of the prior line-selection call

## MODIFIED Requirements

### Requirement: Stockfish analysis is triggered for pasted FEN and forwarded to LLM
The renderer SHALL send every pasted or entered FEN to Stockfish immediately, wait for the multi-line PV response, and then forward the PV lines along with the current FEN to the LLM so it can produce a chess-focused explanation.

#### Scenario: Paste valid FEN for mid-game position
- **WHEN** the user pastes a FEN string and submits it
- **THEN** the renderer notifies Stockfish with that FEN, waits for analysis, and after receiving PV lines it sends the PV and FEN to the LLM for explanation

### Requirement: LLM explanations describe risks/plans and omit non-chess commentary
The LLM SHALL respond with analysis that assesses risk for both sides and recommends the next player's plan of attack. All prompts SHALL include explicit instructions to avoid generic AI commentary, guaranteeing the response stays purely about chess.

#### Scenario: LLM explanation request after analysis
- **WHEN** Stockfish returns PV lines for the current position
- **THEN** the renderer calls the LLM with instructions describing risk and plan requirements AND the LLM replies with chess terminology only, mentioning both sides' prospects and next moves

### Requirement: User can ask chat questions tied to the current position
The chat interface SHALL attach the current FEN to each user question so follow-up prompts reference the existing board. The system SHALL treat each chat question as "analysis for position X" and maintain the same chess-only response policy.

#### Scenario: User asks "What should white play next?"
- **WHEN** the user submits a question with the current position after receiving an explanation
- **THEN** the system resends the current FEN plus the question to the LLM and displays a chess-focused answer about potential moves without general AI commentary

### Requirement: LLM responses are displayed without AI chatter and mention Stockfish insight
LLM responses SHALL start with a short summary of the relative risks/plans derived from Stockfish's PVs and avoid fluff (no references to being an AI or mentioning hallucinations). The renderer should highlight the board side related to the described plan.

#### Scenario: Displaying the explanation panel
- **WHEN** the LLM returns its response
- **THEN** the UI shows the explanation text, ensures it references Stockfish's PV lines, and strips any sentences unrelated to tactical/strategic chess commentary
