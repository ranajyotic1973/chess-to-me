## ADDED Requirements

### Requirement: Analysis button is renamed to Advanced Analysis and toggles a dedicated mode state
The system SHALL rename the analysis button tooltip from "Start Analysis" / "Stop Analysis" to "Advanced Analysis" / "Stop Analysis" and update its aria-label accordingly. Clicking the button while it is off SHALL set `advancedAnalysisMode` to `true` and begin analysis. Clicking it again SHALL set `advancedAnalysisMode` to `false` and stop analysis.

#### Scenario: Button tooltip reflects advanced mode
- **WHEN** `advancedAnalysisMode` is `false` and the user hovers over the analysis button
- **THEN** the tooltip SHALL read "Advanced Analysis"

#### Scenario: Button stops analysis
- **WHEN** `advancedAnalysisMode` is `true` (analysis is running) and the user clicks the button
- **THEN** `advancedAnalysisMode` SHALL be set to `false`, engine analysis SHALL stop, and the tooltip SHALL revert to "Advanced Analysis"

### Requirement: Engine analysis in Advanced Analysis mode uses the full depth from settings
When `advancedAnalysisMode` is active, the engine SHALL be invoked with the depth value stored in `formState.analysisDepth` (read from user settings, default 16). The shallow auto-eval effect (depth 5) SHALL continue running independently of advanced mode and SHALL NOT be replaced by it.

#### Scenario: Full depth is used in advanced mode
- **WHEN** the user activates Advanced Analysis with `analysisDepth` set to 20 in settings
- **THEN** the `analyzePosition` IPC call issued by the Advanced Analysis button SHALL use `depth: 20`

#### Scenario: Auto-eval depth is unchanged
- **WHEN** `advancedAnalysisMode` is `true`
- **THEN** the continuous auto-eval effect that feeds the evaluation bar SHALL still call `analyzePosition` with `depth: 5` independently

### Requirement: After engine lines return, a deep LLM pass is triggered per line in Advanced Analysis mode
When `advancedAnalysisMode` is `true` and the engine returns analysis lines, the renderer SHALL call the `analysis:deep` IPC handler with `{ fen, lines }`. The main process SHALL iterate each line, build a seven-dimension LLM prompt, and return an array of `{ lineIndex: number, analysis: DeepLineAnalysis }`. The LLM provider and timeout rules in effect SHALL match the existing rules (300 s for reasoning models, 120 s for cloud, 60 s for Ollama).

`DeepLineAnalysis` fields:
- `strategy`: Possible strategy or tactics for either side from this line
- `proscons`: Pros and cons of following this line
- `counterattack`: Counter-attack possibilities for the opposing side
- `sacrifice`: Any possible sacrifice move within this line
- `novelty`: A possible novelty move that diverges from theory
- `endgameChances`: Which side has winning chances in the endgame, or likely draw
- `alternatives`: An alternative strategy the player could choose instead

#### Scenario: Deep analysis returns seven-dimension data per line
- **WHEN** `advancedAnalysisMode` is `true` and engine returns four lines
- **THEN** the deep LLM pass SHALL return an array of four `{ lineIndex, analysis }` objects, each containing all seven fields

#### Scenario: Deep analysis is skipped when not in advanced mode
- **WHEN** `advancedAnalysisMode` is `false`
- **THEN** no `analysis:deep` IPC call SHALL be made, and the standard analysis behaviour applies

#### Scenario: Deep analysis respects the saved LLM provider
- **WHEN** the user has configured Anthropic as the LLM provider
- **THEN** the `analysis:deep` handler SHALL call the Anthropic API and SHALL NOT fall back to Ollama

### Requirement: Deep analysis results are displayed per line in the inline analysis panel
Each analysis line displayed in the chat area SHALL show its existing SAN description plus the seven deep-analysis fields when `advancedAnalysisMode` is `true`. The fields SHALL be displayed as collapsible sections or labelled paragraphs beneath the line's SAN. When `advancedAnalysisMode` is `false`, lines SHALL display as before (SAN only).

#### Scenario: Seven-dimension fields appear under each line in advanced mode
- **WHEN** deep analysis results are returned for Line 1
- **THEN** the inline line display SHALL show sections labelled "Strategy", "Pros & Cons", "Counter-attack", "Sacrifice", "Novelty", "Endgame chances", and "Alternatives" beneath the SAN text of Line 1

#### Scenario: Deep analysis fields are loading while awaiting LLM response
- **WHEN** engine lines have been received but the deep LLM pass is still running
- **THEN** each line SHALL show a loading skeleton or spinner in place of the seven-dimension fields

### Requirement: Advanced Analysis mode is gated to non-game, non-puzzle contexts
`advancedAnalysisMode` SHALL only be available when `gameMode` is falsy (i.e., the board is in free analysis mode, not in a puzzle or training game). The Advanced Analysis button SHALL be hidden when `gameMode` is truthy.

#### Scenario: Button is hidden during a puzzle
- **WHEN** `gameMode` is set (e.g., a puzzle is active)
- **THEN** the Advanced Analysis button SHALL NOT be visible in the toolbar

#### Scenario: Button is visible in free analysis
- **WHEN** `gameMode` is falsy and the user is in the default analysis view
- **THEN** the Advanced Analysis button SHALL be visible and clickable
