# deep-analysis-mode Specification

## Purpose
Deep (Advanced) Analysis mode: full-depth, multi-line engine analysis with a per-line LLM deep-dive, ten-plus lines, and novelty flagging.

## Requirements
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

### Requirement: Advanced Analysis mode is gated to non-game, non-puzzle contexts
`advancedAnalysisMode` SHALL only be available when `gameMode` is falsy (i.e., the board is in free analysis mode, not in a puzzle or training game). The Advanced Analysis button SHALL be hidden when `gameMode` is truthy.

#### Scenario: Button is hidden during a puzzle
- **WHEN** `gameMode` is set (e.g., a puzzle is active)
- **THEN** the Advanced Analysis button SHALL NOT be visible in the toolbar

#### Scenario: Button is visible in free analysis
- **WHEN** `gameMode` is falsy and the user is in the default analysis view
- **THEN** the Advanced Analysis button SHALL be visible and clickable

### Requirement: Board size is unchanged in Advanced Analysis mode
Entering Advanced (Deep) Analysis mode SHALL NOT change the size of the chess board. The board SHALL use the same size computation as plain analysis mode (board width fixed at 60% of the usable width), so that neither the board nor the adjacent chat column shrink when `advancedAnalysisMode` becomes `true`.

#### Scenario: Board keeps its size when advanced mode is activated
- **WHEN** the user activates Advanced Analysis mode
- **THEN** the board dimensions SHALL remain identical to the plain analysis board
- **AND** the chat column height (which tracks the board) SHALL NOT shrink

### Requirement: Deep Analysis surfaces at least ten lines and flags novel ones
When Deep (Advanced) Analysis mode runs, the engine SHALL be configured to return at least 10 principal variations when that many legal lines exist (per the engine-mode-tuning capability), and lines that are novel (per the novelty-line-detection capability) SHALL be rendered with the novelty icon in the analysis list.

#### Scenario: Deep analysis returns ten or more lines
- **WHEN** Deep Analysis runs on a rich middlegame position
- **THEN** the analysis list SHALL contain at least 10 lines (or all legal lines if fewer than 10 exist)

#### Scenario: Novel deep-analysis line shows the icon
- **WHEN** one of the deep-analysis lines qualifies as novel
- **THEN** that line SHALL display the novelty icon in the analysis list
