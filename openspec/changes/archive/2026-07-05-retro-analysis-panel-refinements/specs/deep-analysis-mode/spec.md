## ADDED Requirements

### Requirement: Board size is unchanged in Advanced Analysis mode
Entering Advanced (Deep) Analysis mode SHALL NOT change the size of the chess board. The board SHALL use the same size computation as plain analysis mode (board width fixed at 60% of the usable width), so that neither the board nor the adjacent chat column shrink when `advancedAnalysisMode` becomes `true`.

#### Scenario: Board keeps its size when advanced mode is activated
- **WHEN** the user activates Advanced Analysis mode
- **THEN** the board dimensions SHALL remain identical to the plain analysis board
- **AND** the chat column height (which tracks the board) SHALL NOT shrink

## REMOVED Requirements

### Requirement: Deep analysis results are displayed per line in the inline analysis panel
**Reason**: The seven deep-analysis field labels (Strategy, Pros & Cons, Counter-attack, Sacrifice, Novelty, Endgame chances, Alternatives) rendered inside the "Moves Played" box were reported as clutter and are no longer shown there.
**Migration**: The deep LLM pass still runs and its `DeepLineAnalysis` data remains available in state; there is simply no longer an inline per-line display of those fields within the "Moves Played" box.
