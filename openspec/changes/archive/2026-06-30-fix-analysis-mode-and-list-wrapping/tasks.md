# Implementation Tasks

## 1. Remove Auto-Drill-Down from Line Selection

- [x] 1.1 Open [App.tsx](src/App.tsx) and locate `handleSelectEngineLine` (line 1145-1215)
- [x] 1.2 Remove drill-down code: delete lines 1188-1214 (the section that calls `electronAPI.analyzePosition` and updates FEN/lines)
- [x] 1.3 Keep line selection, first move explanation, and `currentMoveIndex = 0` 
- [x] 1.4 Keep `suppressNextAutoEvalRef.current = true` comment/logic if needed, but remove FEN update that follows it
- [x] 1.5 Verify that `setCurrentFen(resultingFen)` is removed (this was the drill-down)
- [ ] 1.6 Test: Select a line, verify it shows first move explanation without changing the board

## 2. Implement onBoardMove Handler for Move Matching

- [x] 2.1 Add new `handleBoardMove` callback in App.tsx after `handleMoveAttempt` (around line 1533)
- [x] 2.2 Implement move matching logic:
  - [x] 2.2.1 Extract the move from the FEN (compare with selectedLineBaseFen to get source/destination)
  - [x] 2.2.2 Loop through `analysisLines` and check if move matches first move (first UCI in pv)
  - [x] 2.2.3 Normalize UCI (lowercase) and handle promotion piece variants
- [x] 2.3 If match found: call `handleSelectEngineLine(matchedIndex, analysisLines[matchedIndex])`
- [x] 2.4 If no match: call `runAnalysis(fen)` to analyze the new position
- [x] 2.5 Add `useCallback` with dependencies: `[analysisLines, selectedLineBaseFen, handleSelectEngineLine, runAnalysis]`
- [x] 2.6 Pass `onBoardMove={handleBoardMove}` to AnalysisBoard component (line 2749-2761)

## 3. Implement Off-Book Position Analysis and LLM

- [x] 3.1 Modify `runAnalysis` callback (line 904-945) to support off-book mode parameter
- [x] 3.2 After off-book analysis completes, invoke LLM via `fetchExplanations` with the new lines
- [x] 3.3 Ensure `selectedEngineLineIndex` is NOT auto-set after off-book analysis (user must click to select)
- [x] 3.4 Update `handleAnalysisSuccess` to skip auto-selecting line (already does this for manual analysis)
- [ ] 3.5 Test: Make a move that doesn't match any line, verify engine analyzes and LLM explains

## 4. Ensure LLM is Invoked on Move Matching

- [x] 4.1 Verify that `handleSelectEngineLine` calls `fetchPerMoveExplanation` for move index 0 (already done at line 1167)
- [x] 4.2 Verify that matched line triggers explanation display (already handled via `fetchPerMoveExplanation`)
- [ ] 4.3 Test: Match a move, verify LLM explanation appears immediately

## 5. Verify Arrow-Key Navigation Still Works

- [x] 5.1 Review `handleKeyboardNavigation` (line 1242-1403) — no changes needed (already implemented)
- [ ] 5.2 Test: Select a line, press right arrow, verify move advances and LLM explanation updates
- [ ] 5.3 Test: Press left arrow, verify position retreats and explanation updates (or clears)

## 6. Update SelectableList for Text Wrapping

- [x] 6.1 Open [SelectableList.tsx](src/components/SelectableList.tsx)
- [x] 6.2 Add computation of single-item flag: `const isSingleItem = items.length === 1`
- [x] 6.3 Find the label Typography (line 109-118) and add conditional `whiteSpace`:
  - [x] 6.3.1 Add `whiteSpace: isSingleItem ? "normal" : "nowrap"` to sx prop
- [x] 6.4 Find the sublabel Typography (line 120-134) and update sx:
  - [x] 6.4.1 Add `whiteSpace: isSingleItem ? "normal" : "nowrap"` to sx prop
- [x] 6.5 Verify that `textOverflow: "ellipsis"` and `overflow: "hidden"` remain in multi-item case
- [ ] 6.6 Test single-item list: text should wrap to multiple lines
- [ ] 6.7 Test multi-item list: text should truncate with ellipsis

## 7. Test Move Matching Edge Cases

- [ ] 7.1 Test: Move that matches with uppercase UCI variant (e.g., "a7a8Q" vs "a7a8q")
- [ ] 7.2 Test: Promotion move (pawn to 8th rank) matches engine line promotion
- [ ] 7.3 Test: Move that matches second engine line (not first) — should not auto-select
- [ ] 7.4 Test: No engine lines available (analysisLines.length === 0) — should not crash

## 8. Test LLM Invocation Flow

- [ ] 8.1 Test: Matched move triggers exactly one LLM call (no duplicates)
- [ ] 8.2 Test: Off-book move triggers exactly one LLM call (engine + LLM, not two LLM calls)
- [ ] 8.3 Test: Arrow-key navigation triggers separate LLM call from prior line-selection call
- [ ] 8.4 Verify one-pipeline-per-question constraint is respected (no PASS 1 + PASS 2 duplicates per move)

## 9. Integration Testing

- [ ] 9.1 Full flow: Select line → first move explanation → arrow-key navigation → new explanations
- [ ] 9.2 Full flow: Make matching move → auto-select → show explanation
- [ ] 9.3 Full flow: Make off-book move → engine analysis → LLM explanation → new candidates
- [ ] 9.4 Full flow: Back button returns to parent line list
- [ ] 9.5 Test: SelectableList wrapping with varying item counts (1, 2, 5 items)

## 10. Code Review and Cleanup

- [x] 10.1 Review `handleSelectEngineLine` for any remaining drill-down logic
- [x] 10.2 Review `handleBoardMove` for correctness and edge cases
- [x] 10.3 Check for any unused variables or dead code from removed drill-down
- [x] 10.4 Verify all callbacks have correct dependency arrays
- [x] 10.5 Update comments in App.tsx explaining line selection behavior (no drill-down)
- [x] 10.6 Run TypeScript type checker: `npm run type-check` (or equivalent)
- [x] 10.7 Run test suite: `npm test` (verify no regressions)
