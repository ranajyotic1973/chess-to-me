## 1. Redux State Enhancements

- [ ] 1.1 Add `lineSelectionHistory` to analysisSlice state (maps board position FEN → selected line index)
- [ ] 1.2 Add Redux action `recordLineSelection(fen: string, lineIndex: number)` to store line selection per position
- [ ] 1.3 Add Redux action `restoreLineSelection(fen: string)` to retrieve line selection for a position
- [ ] 1.4 Add Redux action `clearLineSelectionHistory` to reset history when analysis changes
- [ ] 1.5 Add `playedMoves` array to Redux state to track moves made on the board
- [ ] 1.6 Add Redux action `updatePlayedMoves(moves: string[])` to update board move history

## 2. Engine Analysis Hashing

- [ ] 2.1 Create utility function `createMoveSequenceHash(moves: string[]): string` to hash move sequences
- [ ] 2.2 Create utility function `createLineHashMap(lines: AnalysisLine[]): Map<string, number>` to map move sequences to line indices
- [ ] 2.3 Update engine analysis processing to generate hash maps when lines are returned
- [ ] 2.4 Store hash maps in Redux state alongside analysisLines
- [ ] 2.5 Create utility function `findMatchingLine(moves: string[], hashMap: Map): number | null` for fast lookup

## 3. SelectedLineDetail Component Refactoring

- [ ] 3.1 Update SelectedLineDetail prop interface: remove engine line tracking, add `playedMoves: string[]` and `selectedLineIndex: number | null`
- [ ] 3.2 Refactor SelectedLineDetail to display only the played moves with the last move highlighted
- [ ] 3.3 Update move display to show moves in SAN format (using chess.js conversion)
- [ ] 3.4 Change header label from "Line X selected" to "Moves Played"
- [ ] 3.5 Remove "Line X selected" chip and "deselect line" button from UI
- [ ] 3.6 Add component state to track navigation position within played moves
- [ ] 3.7 Implement keyboard event handler for left/right arrow keys to navigate through moves

## 4. Board Move Detection and Line Matching

- [ ] 4.1 Update `handleBoardMove` callback to store the move in `playedMoves`
- [ ] 4.2 Implement move matching logic: after each board move, check hash maps to find matching line
- [ ] 4.3 Dispatch Redux actions to record the matched line selection at the new board position
- [ ] 4.4 Handle the case where no line matches the board move sequence
- [ ] 4.5 Update Redux dispatch in `handleBoardMove` to call `recordLineSelection` with matched line

## 5. Keyboard Navigation Support

- [ ] 5.1 Add keyboard event listener in SelectedLineDetail for arrow keys
- [ ] 5.2 Implement left arrow handler to move highlight backward through played moves (with bounds checking)
- [ ] 5.3 Implement right arrow handler to move highlight forward through played moves (with bounds checking)
- [ ] 5.4 Update move highlighting logic to use the navigation position, not board position
- [ ] 5.5 Ensure making a new board move resets navigation to the latest position

## 6. LLM Analysis Refactoring

- [ ] 6.1 Update LLM fetch trigger: check if a line is selected before fetching
- [ ] 6.2 Modify `fetchExplanations` to only fetch for the selected line (selectedEngineLineIndex), not all lines
- [ ] 6.3 Update LLM request payload to include the selected line's moves and current FEN
- [ ] 6.4 Update line explanation display to show only the selected line's analysis
- [ ] 6.5 Clear line explanations when selectedEngineLineIndex changes

## 7. Navigation History Integration

- [ ] 7.1 Track when user navigates backward (left arrow in SelectedLineDetail)
- [ ] 7.2 When user navigates to a different position via keyboard, look up and restore the previously-selected line
- [ ] 7.3 Display the restored line's information (moves, analysis) based on stored selection history
- [ ] 7.4 When user makes a new board move, update history to discard old branches and start fresh

## 8. State Consistency and Cleanup

- [ ] 8.1 Clear lineSelectionHistory when new analysis is run (not continuation of same position)
- [ ] 8.2 Clear playedMoves when board is reset or position is changed via position editor
- [ ] 8.3 Clear lineExplanations when selectedLineIndex becomes null
- [ ] 8.4 Add validation: ensure lineSelectionHistory keys match actual board positions in history

## 9. UI/UX Refinements

- [ ] 9.1 Update ChatPanel to pass `playedMoves` and `selectedLineIndex` to SelectedLineDetail
- [ ] 9.2 Remove any "Line selected/deselect" prompts from ChatPanel or related components
- [ ] 9.3 Update help text or tooltips to explain keyboard navigation (arrow keys)
- [ ] 9.4 Update component prop types throughout the component tree to reflect new data flow

## 10. Testing and Validation

- [ ] 10.1 Test move display for moves 1, 2, 3 and verify highlighting follows last played move
- [ ] 10.2 Test keyboard navigation: left arrow navigates backward, right arrow navigates forward
- [ ] 10.3 Test line matching: verify correct line is selected after each board move
- [ ] 10.4 Test no matching line: verify Line Detail shows only board moves when no line matches
- [ ] 10.5 Test navigation history: backward navigate and verify previously-selected line is restored
- [ ] 10.6 Test move sequence change: navigate backward and make a different move, verify history updates
- [ ] 10.7 Test LLM analysis: verify LLM is called only for selected line after move count threshold
- [ ] 10.8 Test LLM updates: verify analysis updates when line selection changes
- [ ] 10.9 Test SAN formatting: verify all moves display in algebraic notation, not UCI
- [ ] 10.10 Test bounds checking: verify left arrow at move 1 and right arrow at last move do nothing

## 11. Documentation Updates

- [ ] 11.1 Update code comments in SelectedLineDetail explaining the new board-move-based approach
- [ ] 11.2 Document the move sequence hash format and lookup behavior
- [ ] 11.3 Add JSDoc comments for new Redux actions
- [ ] 11.4 Update any README or architectural documentation to reflect simplified design
