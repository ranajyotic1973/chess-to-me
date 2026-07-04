## 1. State Management Enhancement

- [x] 1.1 Identify all analysis state variables in `src/App.tsx` (isAnalysisRunning, analysisStatus, etc.)
- [x] 1.2 Add separate state variable for engine analysis phase completion flag (e.g., `engineAnalysisDone`)
- [x] 1.3 Update state initialization to track engine vs LLM status separately
- [x] 1.4 Document state transitions in comments for clarity

## 2. Engine Analysis Flow Updates

- [x] 2.1 Locate the function that triggers Stockfish analysis in `src/App.tsx` (likely `runAnalysis` or similar callback)
- [x] 2.2 Update engine analysis start to set `isAnalysisRunning = true` and `analysisStatus = "Analyzing with [engine name]..."`
- [x] 2.3 Add status update when engine analysis completes: `analysisStatus = "Engine analysis complete. Generating explanation..."`
- [x] 2.4 Set `engineAnalysisDone = true` when engine returns valid results (`analysisLines.length > 0`)
- [x] 2.5 Add error handling: if engine times out or fails, update status to "Engine analysis timed out" and set `isAnalysisRunning = false` without calling LLM

## 3. LLM Analysis Gating

- [x] 3.1 Locate the function that triggers LLM analysis in `src/App.tsx` (likely part of the analysis orchestration logic)
- [x] 3.2 Add guard condition before LLM call: `if (!engineAnalysisDone || analysisLines.length === 0) return`
- [x] 3.3 Only proceed with LLM call if engine analysis completed successfully
- [x] 3.4 Update status to reflect LLM phase starting: `analysisStatus = "Generating explanation..."`
- [x] 3.5 Set `isAnalysisRunning = false` only after LLM analysis completes (not when engine completes)

## 4. Status Display and Messaging

- [x] 4.1 Verify `StatusBanner.tsx` correctly renders `analysisStatus` prop
- [x] 4.2 Verify `StatusBanner` re-renders when `analysisStatus` changes (check React dependency array)
- [x] 4.3 Test that status messages appear at each phase: engine start, engine complete, LLM start, completion
- [x] 4.4 Add logic to clear status message after 2-3 seconds when analysis completes (or leave it to user interaction)
- [x] 4.5 Ensure status bar handles error messages (timeout, engine failure) and displays them clearly

## 5. Spinner and Loading State

- [x] 5.1 Verify spinner in analysis board uses `isAnalysisRunning` prop correctly
- [x] 5.2 Ensure spinner appears when `isAnalysisRunning = true` and disappears when `false`
- [x] 5.3 Test spinner visibility during engine analysis phase
- [x] 5.4 Test spinner visibility during LLM analysis phase
- [x] 5.5 Test spinner clears after both phases complete

## 6. Cancellation and Stop Logic

- [x] 6.1 Locate stop/cancel analysis button if it exists in the UI
- [x] 6.2 Update stop handler to set `isAnalysisRunning = false`, `engineAnalysisDone = false`, and clear pending LLM calls
- [x] 6.3 Update status to "Analysis cancelled" when user clicks stop
- [x] 6.4 Ensure cancelled analysis doesn't trigger LLM analysis later

## 7. Integration and Testing

- [x] 7.1 Run `npm test` to verify unit tests still pass
- [x] 7.2 Run `npm run test:integration` to verify Playwright tests still pass
- [ ] 7.3 Manually test analysis flow end-to-end: paste FEN → observe spinner → observe status messages → LLM generates explanation
- [ ] 7.4 Test timeout scenario: verify status message shows "timed out" and LLM doesn't start
- [ ] 7.5 Test error scenario: if engine fails, verify status message and LLM doesn't start
- [ ] 7.6 Test cancellation: click stop mid-analysis and verify all state clears
- [x] 7.7 Run `npm run build` to verify no TypeScript errors

## 8. Code Review and Cleanup

- [x] 8.1 Review all state updates for consistency and clarity
- [x] 8.2 Remove or clean up any dead code or debug logging
- [x] 8.3 Ensure all new state transitions are documented with comments
- [x] 8.4 Verify no race conditions between engine and LLM async operations
- [x] 8.5 Update CLAUDE.md if needed with new state management patterns
