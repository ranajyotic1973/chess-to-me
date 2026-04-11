## ADDED Requirements

### Requirement: Stockfish analysis is triggered for pasted FEN and forwarded to LLM
The renderer SHALL send every pasted or entered FEN to Stockfish immediately, wait for the multi-line PV response, and then forward the PV lines along with the current FEN to the LLM so it can produce a chess-focused explanation.

#### Scenario: Paste valid FEN for mid-game position
- **WHEN** the user pastes a FEN string and submits it
- **THEN** the renderer notifies Stockfish with that FEN, waits for analysis, and after receiving PV lines it sends the PV and FEN to the LLM for explanation

### Requirement: LLM explanations describe risks/plans and omit non-chess commentary
The LLM SHALL respond with analysis that assesses risk for both sides and recommends the next player’s plan of attack. All prompts SHALL include explicit instructions to avoid generic AI commentary, guaranteeing the response stays purely about chess.

#### Scenario: LLM explanation request after analysis
- **WHEN** Stockfish returns PV lines for the current position
- **THEN** the renderer calls the LLM with instructions describing risk and plan requirements AND the LLM replies with chess terminology only, mentioning both sides’ prospects and next moves

### Requirement: User can ask chat questions tied to the current position
The chat interface SHALL attach the current FEN to each user question so follow-up prompts reference the existing board. The system SHALL treat each chat question as “analysis for position X” and maintain the same chess-only response policy.

#### Scenario: User asks “What should white play next?”
- **WHEN** the user submits a question with the current position after receiving an explanation
- **THEN** the system resends the current FEN plus the question to the LLM and displays a chess-focused answer about potential moves without general AI commentary

### Requirement: LLM responses are displayed without AI chatter and mention Stockfish insight
LLM responses SHALL start with a short summary of the relative risks/plans derived from Stockfish’s PVs and avoid fluff (no references to being an AI or mentioning hallucinations). The renderer should highlight the board side related to the described plan.

#### Scenario: Displaying the explanation panel
- **WHEN** the LLM returns its response
- **THEN** the UI shows the explanation text, ensures it references Stockfish’s PV lines, and strips any sentences unrelated to tactical/strategic chess commentary

