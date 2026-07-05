## ADDED Requirements

### Requirement: Middlegame mode is gated to positions past 20 plies
Middlegame mode SHALL only be enterable from Analysis mode after at least 10 full moves (20 plies) have been played by both sides in the current game. Before 20 plies, a strategic or tactical question SHALL be handled in Analysis mode and SHALL NOT switch to Middlegame.

#### Scenario: Middlegame question before 20 plies stays in Analysis
- **WHEN** fewer than 20 plies have been played and the user asks a middlegame strategy question
- **THEN** the mode SHALL remain Analysis and the question SHALL be answered by the analysis pipeline

#### Scenario: Middlegame question after 20 plies switches to Middlegame
- **WHEN** at least 20 plies have been played and the user asks a strategic or tactical middlegame question
- **THEN** the mode SHALL switch to Middlegame and the request SHALL route to the middlegame agent

### Requirement: Middlegame agent answers strategic and tactical questions
When in Middlegame mode, the request SHALL route to the middlegame agent (`electron/middlegameAgent.ts`), which SHALL answer the user's strategic or tactical question about the current position using child-appropriate language for ages 4–18 and relevant chess vocabulary.

#### Scenario: Strategic question is answered in Middlegame mode
- **WHEN** the user asks a plan-oriented question (e.g., "What is my plan with this pawn structure?") after 20 plies
- **THEN** the middlegame agent SHALL return a strategic explanation appropriate for the current position

#### Scenario: Tactical question is answered in Middlegame mode
- **WHEN** the user asks a tactics-oriented question (e.g., "Are there any tactics here?") after 20 plies
- **THEN** the middlegame agent SHALL return an explanation of tactical ideas available in the current position

### Requirement: Middlegame mode is shown in the status bar
When Middlegame mode is active, the leftmost status-bar pill SHALL display "Middlegame".

#### Scenario: Status bar shows Middlegame
- **WHEN** the mode switches to Middlegame
- **THEN** the leftmost status-bar pill SHALL read "Middlegame"
