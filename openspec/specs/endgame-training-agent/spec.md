# endgame-training-agent Specification

## Purpose
Interactive endgame training agent for children (ages 4–18): generates or analyses endgame positions and teaches winning/drawing technique, and reasons over engine line evaluations toward a result.

## Requirements
### Requirement: Endgame training is triggered by natural-language requests
The system SHALL detect endgame training intent when the user's message matches phrases such as "endgame practice", "teach me a rook and pawn endgame", "how do I checkmate with king and rook", "queen vs rook endgame", or similar. Upon detection, the main process SHALL route the request to `handleEndgameRequest` in `electron/endgameAgent.ts`.

#### Scenario: User requests a specific endgame type
- **WHEN** the user types "Show me a Rook and Pawn endgame"
- **THEN** the system SHALL route to the endgame training pipeline with the extracted material configuration ("Rook and Pawn")

#### Scenario: User requests endgame practice generally
- **WHEN** the user types "I want to practice endgames"
- **THEN** the system SHALL route to the endgame training pipeline and ask the LLM to select an appropriate common endgame position

#### Scenario: Puzzle or analysis requests are not misrouted
- **WHEN** the user asks for a puzzle or a position analysis
- **THEN** the system SHALL NOT route the request to the endgame training pipeline

### Requirement: Endgame agent uses an independent system prompt and LLM pipeline
The `handleEndgameRequest` function in `electron/endgameAgent.ts` SHALL use its own system prompt that instructs the LLM to act as a children's endgame coach. The system prompt SHALL instruct the LLM to: (a) generate a legal endgame FEN position matching the requested material configuration, (b) provide a winning or drawing technique as an ordered move sequence, (c) explain each move with age-appropriate chess vocabulary, (d) include real-world stories or named endgame principles where applicable (e.g., "Lucena position", "Philidor position", "Rook behind the passed pawn"), (e) return a structured JSON response with a `moves` array and a starting `fen`.

#### Scenario: Endgame agent generates a legal position
- **WHEN** the user requests a "King and Pawn endgame"
- **THEN** the `fen` field in the response SHALL be a valid chess position containing only a king and pawn for one side plus a king for the other, validated by chess.js before being applied to the board

#### Scenario: Endgame agent includes a named principle or story
- **WHEN** the endgame position has a classical name or a famous game reference
- **THEN** the `story` field SHALL mention the name (e.g., "This is the Philidor position, a defensive fortress discovered by François-André Philidor in the 18th century")

### Requirement: Endgame training response includes a per-move commentary array
The LLM SHALL return a `moves` array where each element contains `{ "uci": string, "san": string, "commentary": string }`. The `commentary` field SHALL explain the purpose of each move in 2–4 sentences using child-appropriate language and relevant technical chess terms (e.g., "opposition", "key square", "tempo", "zugzwang"). The array SHALL contain the complete technique sequence up to a maximum of 20 moves.

#### Scenario: Moves array covers the complete technique
- **WHEN** the endgame response is received for a K+P vs K position
- **THEN** the `moves` array SHALL include moves from both sides showing the winning technique through to checkmate or a drawn position, with commentary for every move

#### Scenario: Technical terms are used and briefly explained
- **WHEN** a move's commentary introduces a term like "zugzwang"
- **THEN** the commentary SHALL include a brief inline definition (e.g., "zugzwang — a situation where any move you make worsens your position")

### Requirement: Endgame position FEN is validated before being applied to the board
When the endgame training response is received, the system SHALL validate the `fen` field using `chess.js` before setting it as `currentFen`. If the FEN is invalid or does not match the requested material configuration, the system SHALL display an error message and SHALL NOT update the board.

#### Scenario: Valid endgame FEN is accepted
- **WHEN** the LLM returns a syntactically and legally valid FEN
- **THEN** the board SHALL update to that FEN and the first move's `commentary` SHALL be displayed

#### Scenario: Invalid FEN is rejected
- **WHEN** the LLM returns a FEN that fails chess.js validation
- **THEN** the board SHALL remain unchanged and the chat area SHALL display "Invalid endgame position received — please try again"

### Requirement: Arrow-key navigation steps through endgame moves with per-move commentary
When `responseType === "Endgame"`, the system SHALL store the `moves` array in `trainingMoves` state. Left arrow key SHALL advance to the next move (applying the UCI move to the board and displaying its `commentary`). Right arrow key SHALL retreat one move. Navigation SHALL not fire when the chat input has focus.

#### Scenario: Left arrow advances through endgame technique
- **WHEN** `responseType === "Endgame"`, `trainingMoves` is populated, and the user presses left arrow
- **THEN** the board SHALL apply the next UCI move and the chat area SHALL display that move's `commentary`

#### Scenario: Right arrow retreats through endgame moves
- **WHEN** the user has advanced at least one move and presses right arrow
- **THEN** the board SHALL revert to the previous position and the prior move's `commentary` SHALL be displayed

#### Scenario: Navigation stops at the start and end of the line
- **WHEN** the user presses right arrow at move 0 or left arrow at the final move
- **THEN** the board SHALL remain at the current position and the commentary SHALL indicate the boundary

### Requirement: Endgame training uses its own conversation memory file
The system SHALL load and save endgame training conversation history to `conversation-endgame.json` in the `<userData>/chess-to-me/` directory. When the response type transitions to `"Endgame"`, the per-mode conversation system SHALL switch to the `"endgame"` mode key. A new endgame training session SHALL clear the prior endgame conversation history.

#### Scenario: Endgame conversation is isolated from other modes
- **WHEN** the user asks a follow-up question during endgame training
- **THEN** the LLM context SHALL contain only messages from the current endgame training session

#### Scenario: New endgame request clears prior endgame conversation
- **WHEN** the user requests a new endgame position after completing a previous one
- **THEN** `conversation-endgame.json` SHALL be cleared and in-memory history SHALL reset

### Requirement: Endgame mode entry is driven by the conversation intent classifier
Entry into Endgame mode SHALL be governed by the shared conversation-mode-detection classifier (intent-based). A request to learn or win an endgame switches to Endgame mode, while an analysis question such as "Who wins this endgame?" remains in Analysis mode.

#### Scenario: Winning-strategy request enters Endgame mode
- **WHEN** the classifier detects endgame-learning intent (e.g., "What is the best strategy to win a queen's-pawn endgame?")
- **THEN** the app SHALL switch to Endgame mode and route to the endgame agent

#### Scenario: Evaluation question stays in Analysis
- **WHEN** the user asks "Who wins this endgame?" about the current position
- **THEN** the app SHALL remain in Analysis mode

### Requirement: Endgame analysis reasons over the engine's numeric line evaluations
In Endgame mode the LLM SHALL be given every engine line for the position in UCI form together with each line's numeric evaluation (centipawns or mate distance / win probability). The prompt SHALL instruct the LLM to interpret those numbers and choose the continuation that wins for the side the user asked about; if no winning line exists, it SHALL choose the line that best holds a draw. The explanation SHALL justify the choice by reference to the line evaluations.

#### Scenario: Endgame analysis is fed UCI lines with evaluations
- **WHEN** the endgame agent analyzes a position
- **THEN** the LLM request SHALL include the engine's lines in UCI notation each paired with its numeric evaluation

#### Scenario: Analysis targets a win for the requested side
- **WHEN** the user asks how to win for a specific side and at least one engine line is winning for that side
- **THEN** the recommended continuation SHALL be a winning line for that side, justified by its evaluation

#### Scenario: Falls back to holding a draw
- **WHEN** no engine line wins for the requested side but at least one holds a draw
- **THEN** the recommended continuation SHALL be a drawing line, and the explanation SHALL state that a win is not available and a draw is the best outcome
