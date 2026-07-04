## MODIFIED Requirements

### Requirement: Engine analysis is triggered with visible state management
When analysis begins, the application SHALL set `isAnalysisRunning = true` before invoking Stockfish and update the `analysisStatus` message to "Analyzing with [engine name]...". The analysis board SHALL display a spinner to indicate computation is in progress.

#### Scenario: Engine analysis starts
- **WHEN** the user triggers analysis (paste FEN, move on board, etc.)
- **THEN** `isAnalysisRunning` is set to `true`, `analysisStatus` displays "Analyzing with [engine name]...", and a spinner appears on the analysis board

#### Scenario: Engine analysis completes with results
- **WHEN** Stockfish returns PV lines successfully
- **THEN** the renderer updates `analysisStatus` to "Engine analysis complete. Generating explanation..." but keeps `isAnalysisRunning = true` until LLM analysis finishes

### Requirement: LLM analysis is gated on engine completion
The LLM analysis phase SHALL NOT begin until the engine analysis phase has completed and populated valid analysis results. Before calling the LLM, the code SHALL explicitly check that `analysisLines.length > 0` and that engine status indicates completion. If this guard fails, the LLM analysis SHALL not be triggered.

#### Scenario: LLM analysis waits for engine results
- **WHEN** engine analysis finishes and `analysisLines.length > 0`
- **THEN** the renderer immediately begins LLM analysis and updates status to show LLM is now running

#### Scenario: LLM analysis is prevented if engine has no results
- **WHEN** engine analysis completes but `analysisLines.length === 0` (e.g., engine timeout or error)
- **THEN** status updates to explain the issue and LLM analysis is NOT called

### Requirement: Analysis spinner and status lifecycle
The spinner SHALL remain visible (`isAnalysisRunning = true`) from the start of engine analysis through the completion of LLM analysis. Once both phases complete, `isAnalysisRunning` SHALL be set to `false`, the spinner SHALL disappear, and `analysisStatus` SHALL either show "Analysis complete." briefly or clear immediately based on user preference.

#### Scenario: Spinner shows throughout both phases
- **WHEN** engine analysis starts
- **THEN** spinner is visible; it remains visible while LLM analysis runs; it hides only when both complete

#### Scenario: Spinner clears when analysis finishes
- **WHEN** both engine and LLM analysis complete
- **THEN** `isAnalysisRunning` is set to `false`, the spinner disappears, and status is cleared or shows a brief completion message

### Requirement: Error handling and timeouts update status
If engine analysis times out (exceeds 120s) or fails, the system SHALL update `analysisStatus` with an error message (e.g., "Engine analysis timed out") and set `isAnalysisRunning = false` without attempting LLM analysis.

#### Scenario: Engine timeout updates status
- **WHEN** Stockfish does not respond within 120 seconds
- **THEN** status displays "Engine analysis timed out. Please try again.", spinner clears, `isAnalysisRunning = false`, and LLM is not called

#### Scenario: Engine error updates status
- **WHEN** Stockfish process exits with an error
- **THEN** status displays "Engine error: [error message]", spinner clears, and LLM analysis is skipped
