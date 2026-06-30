# user-move-off-book-analysis Specification

## ADDED Requirements

### Requirement: Off-book user moves trigger engine analysis on new position

When a user move does not match any engine line's first move, the system SHALL invoke engine analysis on the resulting position to generate new candidates for that position.

#### Scenario: Unmatched drag/drop move triggers analysis
- **WHEN** user makes a drag/drop move that does not match the first move of any displayed engine line
- **THEN** the system SHALL call `runAnalysis(newFen)` with shallow depth (e.g., depth=5) to generate new candidates from the new position

#### Scenario: Analysis result updates lines and entries
- **WHEN** engine analysis completes on the off-book position
- **THEN** `analysisLines` and `analysisEntries` SHALL be updated with the new engine lines for that position

### Requirement: Off-book move triggers LLM explanation of new position

When a user makes an off-book move, the system SHALL invoke the LLM to provide analysis of the resulting position and its top candidates.

#### Scenario: LLM analyzes off-book position
- **WHEN** engine analysis completes and new lines are fetched for an off-book user move
- **THEN** the system SHALL call `explainLines` (or equivalent LLM endpoint) with `fen=newFen, lines=newAnalysisLines` to explain the position and candidates

#### Scenario: User sees explanation before selecting a line
- **WHEN** LLM explanation is received for off-book position
- **THEN** the explanation SHALL be displayed in the chat panel before any line is selected, giving context for the new candidates

### Requirement: Off-book analysis does not auto-select a line

After off-book analysis completes and LLM explanation is shown, the system SHALL NOT automatically select a line. The user must explicitly click a line to navigate it.

#### Scenario: Off-book analysis shows candidates without selection
- **WHEN** off-book analysis completes and explanation is ready
- **THEN** `selectedEngineLineIndex` SHALL remain null and the user SHALL see the list of candidates without any line highlighted
