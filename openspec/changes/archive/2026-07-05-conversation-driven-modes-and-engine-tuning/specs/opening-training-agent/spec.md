## ADDED Requirements

### Requirement: Opening mode entry is driven by the conversation intent classifier
Entry into Opening mode SHALL be governed by the shared conversation-mode-detection classifier (intent-based), so that a request to learn or explore an opening switches to Opening mode while a passing mention of the word "opening" in an analysis question does not.

#### Scenario: Learning request enters Opening mode
- **WHEN** the classifier detects opening-learning intent (e.g., "Tell me all the openings starting with e4")
- **THEN** the app SHALL switch to Opening mode and route to the opening agent

#### Scenario: Analysis question mentioning "opening" stays in Analysis
- **WHEN** the user asks "What is the name of the opening?" about the current position
- **THEN** the app SHALL remain in Analysis mode and SHALL NOT route to the opening agent

### Requirement: Opening-mode engine analysis uses deep, novelty-aware tuning
When engine analysis runs while in Opening mode, it SHALL use the deep-line and exploration tuning from the engine-mode-tuning capability (at least 10 lines when available) and the novelty flagging from the novelty-line-detection capability, so learners can see creative alternatives alongside main theory.

#### Scenario: Opening-mode analysis shows deep lines with novelty flags
- **WHEN** engine analysis runs for an opening position in Opening mode
- **THEN** the returned lines SHALL include at least 10 lines when available, with novel lines flagged by the novelty icon
