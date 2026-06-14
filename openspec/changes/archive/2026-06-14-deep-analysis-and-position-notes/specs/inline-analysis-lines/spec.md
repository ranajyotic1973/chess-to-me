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
