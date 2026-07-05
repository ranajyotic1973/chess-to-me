# conversation-mode-detection Specification

## Purpose
TBD - created by archiving change conversation-driven-modes-and-engine-tuning. Update Purpose after archive.

## Requirements
### Requirement: Chat messages switch mode by classified intent, not keyword presence
The system SHALL classify every user chat message by intent into one of Analysis, Opening, Middlegame, or Endgame, using the LLM classifier rather than literal keyword matching. The presence of the words "opening" or "endgame" alone SHALL NOT switch the mode; only a request whose intent is to learn/practice that mode SHALL switch it. The classified mode SHALL become the active mode and SHALL be shown in the status bar.

#### Scenario: A question about the current opening stays in Analysis
- **WHEN** the user asks "What is the name of the opening?" while in Analysis mode
- **THEN** the mode SHALL remain Analysis and the request SHALL be handled by the analysis pipeline

#### Scenario: A request to learn an opening switches to Opening
- **WHEN** the user says "I want to know about the Ruy Lopez" or "Tell me all the openings starting with e4"
- **THEN** the mode SHALL switch to Opening and the request SHALL route to the opening agent

#### Scenario: A "who wins this endgame" question stays in Analysis
- **WHEN** the user asks "Who wins this endgame?" about the current position
- **THEN** the mode SHALL remain Analysis (engine evaluation), not Endgame training

#### Scenario: A request to learn endgame technique switches to Endgame
- **WHEN** the user says "What is the best strategy to win a queen's-pawn endgame?"
- **THEN** the mode SHALL switch to Endgame and the request SHALL route to the endgame agent

### Requirement: Chat requests are guardrailed to chess-only, age-appropriate content
Every chat request SHALL include a system prompt that constrains the assistant to chess topics only and to language and content appropriate for children aged 4–18. The assistant SHALL decline or redirect non-chess or age-inappropriate requests with an encouraging, child-safe message.

#### Scenario: Non-chess request is redirected
- **WHEN** the user asks something unrelated to chess
- **THEN** the assistant SHALL not answer the off-topic request and SHALL steer the conversation back to chess in an encouraging tone

#### Scenario: Guardrail is applied in every mode
- **WHEN** any mode (Analysis, Opening, Middlegame, Endgame) processes a chat message
- **THEN** the chess-only and age-4–18 guardrail system prompt SHALL be part of the request

### Requirement: Chat message assembly depends on whether the app is in Analysis mode
When assembling the LLM request, the system SHALL always include the guardrail system message and the user message. When the app is in Analysis mode and engine analysis is available for the current position, the system SHALL additionally include that engine analysis as an assistant message in the context. When the app is not in Analysis mode, the system SHALL send only the system and user messages (no engine-analysis assistant message).

#### Scenario: Analysis mode includes the engine analysis as context
- **WHEN** the app is in Analysis mode with engine analysis available and the user sends a message
- **THEN** the LLM request SHALL contain the system message, the engine analysis as an assistant message, and the user message

#### Scenario: Non-analysis mode omits the engine-analysis message
- **WHEN** the app is in Opening, Middlegame, or Endgame mode and the user sends a message
- **THEN** the LLM request SHALL contain only the system message and the user message

### Requirement: The active mode is shown in the leftmost status-bar pill
The detected/active mode SHALL be displayed in the leftmost corner of the status bar as it is today, updating whenever the mode changes.

#### Scenario: Status bar reflects a mode change
- **WHEN** the classified mode changes from Analysis to Opening
- **THEN** the leftmost status-bar pill SHALL update to show "Opening"
