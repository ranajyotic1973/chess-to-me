## ADDED Requirements

### Requirement: Engine analysis lines are displayed inline in the chat response area
When analysis lines are available (`analysisLines.length > 0`) and the response type is `Analysis` or `Position`, the system SHALL render the lines as a numbered list directly inside the chat conversation scroll container. The lines SHALL NOT appear in a modal, popup, or separate panel.

#### Scenario: Lines rendered after analysis completes
- **WHEN** the engine returns analysis lines and the response type is `Analysis`
- **THEN** the lines SHALL appear below the LLM text response in the same scrollable chat area, each line labeled "Line 1:", "Line 2:", etc.

#### Scenario: Lines are hidden when a line is selected
- **WHEN** the user selects a line (by click or number input)
- **THEN** the line list SHALL collapse and a summary chip showing the selected line number SHALL remain visible along with a "Change line" toggle to re-expand

### Requirement: User can select an analysis line by mouse click
Each line row in the inline list SHALL be clickable. Clicking a row SHALL trigger `onSelectEngineLine` with that line's index and data.

#### Scenario: User clicks Line 2
- **WHEN** the user clicks the row labeled "Line 2:"
- **THEN** `selectedEngineLineIndex` SHALL be set to `1` and the chat area SHALL show navigation instructions

### Requirement: User can select an analysis line by typing its number in the chat input
If the user types a single digit (1–4) in the chat input while analysis lines are visible, the system SHALL interpret that as a line selection and SHALL NOT send it as an LLM question. The selection SHALL be applied immediately on Enter.

#### Scenario: User types "2" to select Line 2
- **WHEN** analysis lines are visible and the user types "2" and presses Enter
- **THEN** Line 2 SHALL be selected, the list SHALL collapse, and no LLM request is made

### Requirement: After a line is selected, the chat area instructs the user to use Up/Down arrow keys
When a line is selected, the chat response area SHALL display an instruction message: "Line {N} selected. Use Up arrow to advance moves, Down arrow to go back."

#### Scenario: Navigation instruction appears on line selection
- **WHEN** the user selects Line 1
- **THEN** the instruction "Line 1 selected. Use Up arrow to advance moves, Down arrow to go back." SHALL appear in the chat area

## MODIFIED Requirements

### Requirement: Engine analysis lines are displayed inline in the chat response area
When analysis lines are available (`analysisLines.length > 0`) and the response type is `Analysis` or `Position`, the system SHALL render the lines as a numbered list directly inside the chat conversation scroll container. The lines SHALL NOT appear in a modal, popup, or separate panel.

When `advancedAnalysisMode` is `true` and deep-analysis results have been received, each line SHALL additionally display the seven-dimension analysis fields (`strategy`, `proscons`, `counterattack`, `sacrifice`, `novelty`, `endgameChances`, `alternatives`) as labelled sections beneath the SAN text. While deep analysis for a line is still loading, the line SHALL show a loading skeleton in place of the seven sections.

When `advancedAnalysisMode` is `false`, lines SHALL display only the SAN description as before — no seven-dimension sections SHALL appear.

#### Scenario: Lines rendered after analysis completes (standard mode)
- **WHEN** the engine returns analysis lines and `advancedAnalysisMode` is `false`
- **THEN** the lines SHALL appear below the LLM text response in the same scrollable chat area, each line labeled "Line 1:", "Line 2:", etc., with SAN only

#### Scenario: Lines show seven-dimension fields in advanced mode
- **WHEN** the engine returns analysis lines, `advancedAnalysisMode` is `true`, and deep analysis results have been received
- **THEN** each line in the inline list SHALL display labelled sections for Strategy, Pros & Cons, Counter-attack, Sacrifice, Novelty, Endgame chances, and Alternatives beneath its SAN text

#### Scenario: Lines show loading state while deep analysis is pending
- **WHEN** engine lines are rendered, `advancedAnalysisMode` is `true`, but the `analysis:deep` IPC call has not yet returned
- **THEN** each line SHALL display a loading skeleton or spinner in place of the seven-dimension sections

#### Scenario: Lines are hidden when a line is selected
- **WHEN** the user selects a line (by click or number input)
- **THEN** the line list SHALL collapse and a summary chip showing the selected line number SHALL remain visible along with a "Change line" toggle to re-expand
