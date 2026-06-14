## ADDED Requirements

### Requirement: PASS 1 classifier recognises opening and endgame training intents
The PASS 1 classifier in `electron/main.ts` SHALL be extended to detect two new intent categories before invoking the LLM classifier:

- **`"opening_training"`** — triggered when the user's message matches heuristics such as: contains "teach me" + "opening", "show me the [opening name]", "how does the [X] start", "I want to learn [opening name]", "opening for white/black", "play the [opening name]".
- **`"endgame_training"`** — triggered when the user's message matches heuristics such as: contains "endgame", "end game", "king and pawn", "rook and pawn", "queen vs", "how to checkmate with", "endgame practice", "teach me endgame", material-configuration phrases (e.g. "rook and pawn", "bishop and knight").

A fast regex pre-screen SHALL run first. For messages that pass the pre-screen but are ambiguous, the LLM classifier SHALL explicitly include `"opening_training"` and `"endgame_training"` as candidate labels in its classification prompt.

#### Scenario: Clear opening request is pre-screened without LLM classifier round-trip
- **WHEN** the user types "Teach me the Sicilian Defence"
- **THEN** the regex pre-screen SHALL match and the request SHALL be routed to `handleOpeningRequest` without an additional LLM PASS 1 call, satisfying the one-pipeline-per-question rule

#### Scenario: Ambiguous message uses LLM classifier
- **WHEN** the user types "Tell me about Rook endgames"
- **THEN** the pre-screen MAY NOT match definitively, and the LLM PASS 1 classifier SHALL classify it as `"endgame_training"` and route accordingly

#### Scenario: General analysis question is not misrouted
- **WHEN** the user types "What is the best move for white in this position?"
- **THEN** the classifier SHALL NOT assign `"opening_training"` or `"endgame_training"` and SHALL route to the existing analysis/LLM guidance handler

#### Scenario: Puzzle request is not misrouted
- **WHEN** the user types "Give me a puzzle"
- **THEN** the classifier SHALL route to the puzzle pipeline, not to a training agent

### Requirement: Opening training requests are routed to handleOpeningRequest
When the classifier resolves the intent as `"opening_training"`, the main process SHALL invoke `handleOpeningRequest` from `electron/openingAgent.ts`. The general analysis pipeline (Stockfish + LLM commentary) SHALL NOT be invoked for this intent.

#### Scenario: Opening request invokes dedicated handler
- **WHEN** intent resolves to `"opening_training"`
- **THEN** `handleOpeningRequest` SHALL be called with the user message and the saved LLM provider settings; the IPC response SHALL carry `response_type: "Opening"` and the `moves` array

#### Scenario: One pipeline per question is preserved
- **WHEN** an opening training request is handled
- **THEN** exactly one LLM call chain (PASS 2 inside `handleOpeningRequest`) SHALL execute; no additional general-analysis pipeline call SHALL occur

### Requirement: Endgame training requests are routed to handleEndgameRequest
When the classifier resolves the intent as `"endgame_training"`, the main process SHALL invoke `handleEndgameRequest` from `electron/endgameAgent.ts`. The general analysis pipeline SHALL NOT be invoked for this intent.

#### Scenario: Endgame request invokes dedicated handler
- **WHEN** intent resolves to `"endgame_training"`
- **THEN** `handleEndgameRequest` SHALL be called with the user message and the saved LLM provider settings; the IPC response SHALL carry `response_type: "Endgame"`, the starting `fen`, and the `moves` array

#### Scenario: One pipeline per question is preserved
- **WHEN** an endgame training request is handled
- **THEN** exactly one LLM call chain SHALL execute; no Stockfish engine analysis SHALL be triggered unless the user follows up with an explicit analysis question

### Requirement: Training agent pipelines obey existing provider and timeout rules
Both `handleOpeningRequest` and `handleEndgameRequest` SHALL read the LLM provider from saved settings at call time (not from a cached component state or default). Timeout values SHALL follow the existing rules: 300 s for reasoning models, 120 s for standard cloud models, 60 s for Ollama.

#### Scenario: Opening agent uses the saved cloud provider
- **WHEN** the user has configured Anthropic as the LLM provider in settings
- **THEN** `handleOpeningRequest` SHALL call the Anthropic API using that saved configuration; it SHALL NOT default to Ollama

#### Scenario: Reasoning model gets the extended timeout
- **WHEN** the saved model name contains "reasoning"
- **THEN** both training handlers SHALL apply the 300 s timeout, matching the rule in `main.ts`

### Requirement: Classification unit tests cover the new intents
A unit test file (`electron/classifier.test.ts` or equivalent) SHALL include test cases asserting that:
- "Teach me the Sicilian Defence" → `opening_training`
- "Show me a good opening for white" → `opening_training`
- "I want to practice a King and Pawn endgame" → `endgame_training`
- "How do I checkmate with a rook?" → `endgame_training`
- "What is the best move here?" → NOT `opening_training`, NOT `endgame_training`
- "Give me a puzzle" → NOT `opening_training`, NOT `endgame_training`
