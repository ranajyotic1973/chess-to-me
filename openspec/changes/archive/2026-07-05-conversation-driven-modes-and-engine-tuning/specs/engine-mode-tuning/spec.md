## ADDED Requirements

### Requirement: MultiPV clamp allows at least 10 lines in deep modes
The engine adapters SHALL allow `MultiPV` values of at least 10 (the current hard cap of 4 SHALL be raised). In Deep Analysis, Opening, and Endgame modes the effective `MultiPV` SHALL be at least 10 when the engine can provide that many legal lines, controllable via the existing MultiPV input. When fewer legal lines exist than requested, the engine SHALL return all available lines without error.

#### Scenario: Deep analysis requests ten lines
- **WHEN** Deep Analysis mode runs on a position with many legal continuations and MultiPV is set to 10 or more
- **THEN** the engine SHALL be sent `setoption name MultiPV value <N>` with N ≥ 10 and SHALL return that many lines

#### Scenario: Fewer legal lines than requested
- **WHEN** MultiPV is 10 but only 6 legal moves exist in the position
- **THEN** the engine SHALL return the 6 available lines without error

#### Scenario: Plain analysis is unaffected
- **WHEN** the app is in ordinary (non-deep) Analysis mode
- **THEN** the smaller default MultiPV SHALL continue to be used

### Requirement: Deep modes enable engine exploration for novel moves
In Deep Analysis, Opening, and Endgame modes the engine SHALL be configured with options that widen the search toward less-obvious, creative moves, using the option set appropriate to the active engine (Stockfish vs Lc0). The specific option mapping is defined in the change's design document.

#### Scenario: Exploration options are applied per engine
- **WHEN** a deep mode starts analysis with Lc0 as the active engine
- **THEN** the Lc0 exploration options defined in design SHALL be sent to the engine before the search

#### Scenario: Exploration options are reverted for plain analysis
- **WHEN** the app returns to ordinary Analysis mode
- **THEN** the exploration options SHALL be reset to their default (objective best-move) values
