## ADDED Requirements

### Requirement: Opening training is triggered by natural-language requests
The system SHALL detect opening training intent when the user's message matches phrases such as "teach me an opening", "show me the Sicilian", "how does the King's Indian start", "I want to learn the Ruy Lopez", or similar variants. Upon detection, the main process SHALL route the request to `handleOpeningRequest` instead of the general LLM pipeline.

#### Scenario: User requests opening training by name
- **WHEN** the user types "Teach me the Sicilian Defence"
- **THEN** the system SHALL route the request to the opening training pipeline and SHALL NOT invoke the general analysis handler

#### Scenario: User requests opening training generically
- **WHEN** the user types "Show me a good opening for white"
- **THEN** the system SHALL route the request to the opening training pipeline and ask the LLM to select an appropriate opening

#### Scenario: General chess question is not misrouted
- **WHEN** the user types "What is the best move for white here?"
- **THEN** the system SHALL NOT route the request to the opening training pipeline

### Requirement: Opening agent uses an independent system prompt and LLM pipeline
The `handleOpeningRequest` function in `electron/openingAgent.ts` SHALL use its own system prompt that instructs the LLM to act as a children's opening coach. The system prompt SHALL instruct the LLM to: (a) use simple encouraging language appropriate for ages 4–18, (b) introduce technical chess vocabulary with brief inline definitions, (c) include at least one real-world story mentioning a famous game or player when relevant, citing year and tournament, (d) return a structured JSON response with a `moves` array.

#### Scenario: Opening agent response is child-appropriate
- **WHEN** the opening training pipeline returns a response
- **THEN** the explanation text SHALL use encouraging language, avoid adult or complex non-chess concepts, and include at least one chess term (e.g., "center", "development", "tempo") with a brief explanation

#### Scenario: Opening agent includes a famous-game story
- **WHEN** the requested opening has a notable historical game
- **THEN** the `story` field in the response SHALL reference a real player, year, and tournament (e.g., "Magnus Carlsen played this exact line against Hikaru Nakamura at the 2010 Tal Memorial")

### Requirement: Opening training response includes a per-move commentary array
The LLM SHALL return a `moves` array where each element contains `{ "uci": string, "san": string, "commentary": string }`. The `commentary` field SHALL be 2–4 sentences of age-appropriate explanation for why that specific move is played, what idea it advances, and any tactical or strategic vocabulary relevant to the move. The array SHALL be capped at 15 moves.

#### Scenario: LLM returns a valid moves array
- **WHEN** the opening agent response is received
- **THEN** the `moves` field SHALL be an array of objects each containing `uci`, `san`, and `commentary` strings, and SHALL contain at least 2 entries and at most 15

#### Scenario: Each move has meaningful commentary
- **WHEN** the moves array is rendered
- **THEN** every `commentary` entry SHALL be non-empty and SHALL reference at least one chess concept (e.g., "This move develops the knight toward the center")

### Requirement: Opening training response includes ECO identification
The main process SHALL call the `@chess-openings/eco.json` `findOpening()` function with the FEN after each move to resolve the current ECO code and opening name. The resolved ECO code and canonical opening name SHALL be injected into the LLM prompt as context and SHALL be included in the response JSON as `eco_code` and `opening_name` fields.

#### Scenario: ECO code is resolved and shown
- **WHEN** the opening training response is received and the opening has a known ECO code
- **THEN** the response SHALL contain `eco_code` (e.g., "B90") and `opening_name` (e.g., "Sicilian Defense, Najdorf Variation")

#### Scenario: Unknown position has no ECO match
- **WHEN** the position after a move does not match any known ECO entry
- **THEN** the `eco_code` and `opening_name` fields SHALL be omitted or null, and the response SHALL still include commentary for that move

### Requirement: Arrow-key navigation steps through opening moves with per-move commentary
When `responseType === "Opening"`, the system SHALL store the `moves` array in `trainingMoves` state. Left arrow key SHALL advance to the next move (applying the UCI move to the board and displaying its `commentary` in the chat response area). Right arrow key SHALL retreat one move (reverting the board to the previous position and showing the prior move's `commentary`). Navigation SHALL not fire when the chat input has focus.

#### Scenario: Left arrow advances through opening moves
- **WHEN** `responseType === "Opening"`, `trainingMoves` is populated, and the user presses the left arrow key
- **THEN** the board SHALL apply the next UCI move and the chat area SHALL display that move's `commentary`

#### Scenario: Right arrow retreats through opening moves
- **WHEN** the user has advanced at least one move and presses right arrow
- **THEN** the board SHALL revert to the previous position and the chat area SHALL display the previous move's `commentary`

#### Scenario: Navigation does not fire during text input
- **WHEN** the chat input TextField has focus and the user presses an arrow key
- **THEN** the board SHALL NOT change and cursor movement within the TextField SHALL proceed normally

#### Scenario: Reaching the end of the opening line
- **WHEN** the user presses left arrow past the last move
- **THEN** the board SHALL remain at the final position and the chat area SHALL indicate the end of the training line

### Requirement: Opening training uses its own conversation memory file
The system SHALL load and save opening training conversation history to `conversation-opening.json` in the `<userData>/chess-to-me/` directory. When the response type transitions to `"Opening"`, the per-mode conversation system SHALL switch to the `"opening"` mode key. A new opening training session SHALL NOT inherit conversation history from the previous opening session.

#### Scenario: Opening conversation is isolated from analysis conversation
- **WHEN** the user asks a follow-up question during opening training
- **THEN** the LLM context SHALL include only messages from the current opening training session, not analysis or endgame messages

#### Scenario: New opening request clears prior opening conversation
- **WHEN** the user requests a new opening after completing a previous one
- **THEN** the `conversation-opening.json` file SHALL be cleared and the in-memory history SHALL reset to empty
