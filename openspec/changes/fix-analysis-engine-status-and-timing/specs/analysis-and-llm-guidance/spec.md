## MODIFIED Requirements

### Requirement: Stockfish analysis is triggered for pasted FEN and forwarded to LLM
The renderer SHALL send every pasted or entered FEN to Stockfish immediately, display "Analyzing with [engine name]..." in the status bar, wait for the multi-line PV response while showing a spinner, and then forward the PV lines along with the current FEN to the LLM so it can produce a chess-focused explanation. Only after engine analysis completes successfully SHALL the LLM analysis begin.

#### Scenario: Paste valid FEN for mid-game position
- **WHEN** the user pastes a FEN string and submits it
- **THEN** the renderer displays "Analyzing with [engine name]..." status, shows a spinner, notifies Stockfish with that FEN, waits for analysis, and after receiving PV lines updates status to "Engine analysis complete. Generating explanation..." before sending the PV and FEN to the LLM

#### Scenario: Engine analysis times out or fails
- **WHEN** Stockfish fails to respond within the configured timeout (120s default)
- **THEN** the status bar displays "Engine analysis timed out. Please try again." and the spinner stops; LLM analysis does NOT start

#### Scenario: User requests analysis cancellation
- **WHEN** the user clicks a "Stop Analysis" button while analysis is running
- **THEN** the status updates to "Analysis cancelled" briefly, the spinner clears, and any pending LLM request does NOT execute

### Requirement: LLM explanations describe risks/plans with proper sequencing
The LLM analysis SHALL only begin after engine analysis completes and populates the analysis lines. The renderer SHALL ensure `analysisLines.length > 0` before initiating the LLM call. The LLM SHALL respond with analysis that assesses risk for both sides and recommends the next player's plan of attack. All prompts SHALL include explicit instructions to avoid generic AI commentary, guaranteeing the response stays purely about chess.

#### Scenario: LLM explanation request after engine analysis
- **WHEN** Stockfish returns PV lines for the current position and status is updated to "complete"
- **THEN** the renderer waits to confirm `analysisLines.length > 0`, displays "Engine analysis complete. Generating explanation...", and then sends the PV and FEN to the LLM, which replies with chess terminology only, mentioning both sides' prospects and next moves

#### Scenario: LLM request prevented if engine has no results
- **WHEN** engine analysis completes but `analysisLines.length === 0`
- **THEN** status displays "Engine analysis did not produce results. Cannot generate explanation." and LLM is not called

### Requirement: Status bar displays real-time progress messages
The status bar (StatusBanner component) SHALL display distinct messages for each analysis phase: engine initialization, engine running, engine complete, LLM running, and completion. These messages SHALL be updated via the `analysisStatus` or `statusMessage` state and SHALL clear or show final summary when analysis completes.

#### Scenario: Status displays during engine analysis
- **WHEN** engine analysis starts
- **THEN** status displays "Analyzing with [engine name]..." and updates to show progress

#### Scenario: Status updates after engine completes before LLM starts
- **WHEN** engine analysis finishes successfully
- **THEN** status displays "Engine analysis complete. Generating explanation..." while LLM analysis begins

#### Scenario: Status updates after all analysis completes
- **WHEN** both engine and LLM analysis finish
- **THEN** status displays "Analysis complete." briefly and then clears after 2-3 seconds
