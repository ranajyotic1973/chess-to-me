## ADDED Requirements

### Requirement: Auto LLM explanation begins from move 2
The renderer SHALL trigger the automatic LLM explanation of the selected engine line starting from move 2 — the position reached after both sides have made their first move (for example after `1.e4 e5`) — instead of waiting until move 3. Before that threshold the renderer SHALL stay quiet and SHALL NOT request an auto explanation.

#### Scenario: Explanation fires after both first moves
- **WHEN** a line is selected and the current position is the one after `1.e4 e5` (move 2)
- **THEN** the renderer SHALL request exactly one auto LLM explanation for that position

#### Scenario: No explanation before move 2
- **WHEN** the current position is the starting position or the position after only White's first move (`1.e4`)
- **THEN** the renderer SHALL NOT request an auto LLM explanation

#### Scenario: Each new position still gets one explanation
- **WHEN** the user advances to a further position at or past move 2 that has not yet been explained
- **THEN** the renderer SHALL request exactly one auto explanation for that position, deduped so the same position is not explained twice
