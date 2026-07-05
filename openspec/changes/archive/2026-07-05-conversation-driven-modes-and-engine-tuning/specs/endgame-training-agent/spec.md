## ADDED Requirements

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
