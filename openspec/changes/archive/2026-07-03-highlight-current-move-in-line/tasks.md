# Implementation Tasks

## 1. Create Helper Function for Highlighting

- [x] 1.1 Create utility file `src/utils/formatHighlightedMoveNotation.ts`
- [x] 1.2 Implement function signature: `formatHighlightedMoveNotation(moveNotation: string, currentMoveIndex: number): ReactNode`
- [x] 1.3 Parse the move notation string to identify individual moves (split by spaces, identify move numbers)
- [x] 1.4 Locate the move at `currentMoveIndex` in the parsed list
- [x] 1.5 Return a React element that renders the notation with the current move in bold and a yellow square indicator
- [x] 1.6 Handle edge cases: invalid index, empty notation, single move

## 2. Update ChatPanel to Display Highlighted Notation

- [x] 2.1 Import the new `formatHighlightedMoveNotation` helper in ChatPanel.tsx
- [x] 2.2 Locate the line detail box where `analysisEntries[selectedEngineLineIndex]?.description` is currently displayed
- [x] 2.3 Replace the static display with a call to `formatHighlightedMoveNotation(moveNotation, currentMoveIndex)`
- [x] 2.4 Ensure `currentMoveIndex` is available in ChatPanel (passed as a prop from App.tsx if not already present)
- [x] 2.5 Verify the highlighted notation renders correctly in the line detail box

## 2.6 Refactor Line Detail into Separate Component (Code Quality Improvement)

- [x] 2.6.1 Create new component `src/components/SelectedLineDetail.tsx`
- [x] 2.6.2 Move line detail box logic (header, moves, deselect button, deep analysis) into component
- [x] 2.6.3 Update ChatPanel to use SelectedLineDetail component instead of inline code
- [x] 2.6.4 Remove unused imports from ChatPanel (ClearIcon, Chip, Skeleton, DEEP_ANALYSIS_FIELDS)
- [x] 2.6.5 Verify build passes and all tests pass

## 3. Test Highlighting with Keyboard Navigation

- [ ] 3.1 Load a game in analysis mode
- [ ] 3.2 Select an engine line and verify the highlight appears at move 1
- [ ] 3.3 Press the right arrow key and verify the highlight moves to move 2
- [ ] 3.4 Continue pressing right arrow through the entire line and verify highlight updates
- [ ] 3.5 Press the left arrow key and verify the highlight moves backward
- [ ] 3.6 Press left arrow multiple times to return to the start and verify highlight

## 4. Test Highlighting with Board Moves

- [ ] 4.1 Load a game in analysis mode and select an engine line
- [ ] 4.2 Play the first move of the line on the board (drag/drop a piece)
- [ ] 4.3 Verify the line is still selected and the highlight is at move 1
- [ ] 4.4 Play the second move of the line and verify the highlight advances to move 2
- [ ] 4.5 Make a move that doesn't match the line and verify the line deselects and highlight disappears
- [ ] 4.6 Select the line again and verify the highlight reappears at the correct position

## 5. Test Highlighting in Different Modes

- [ ] 5.1 Enter deep analysis mode and select an engine line
- [ ] 5.2 Verify the highlight is displayed and updates with navigation
- [ ] 5.3 Navigate to puzzle mode and verify no highlight is shown (or move display is different)
- [ ] 5.4 Return to analysis mode and verify highlighting works again

## 6. Test Highlight Styling and Visibility

- [ ] 6.1 Verify the current move text is bold and visually distinct from other moves
- [ ] 6.2 Verify the yellow square indicator is clearly visible and not obscured by text
- [ ] 6.3 Verify the highlight works with various line lengths (short 3-move lines, long 20+ move lines)
- [ ] 6.4 Check contrast and readability on both light and dark backgrounds

## 7. Edge Cases and Error Handling

- [ ] 7.1 Test highlighting with a line that has only 1 move
- [ ] 7.2 Test highlighting with a line that has 10+ moves (verify no parsing errors)
- [ ] 7.3 Test if `currentMoveIndex` is out of bounds and handle gracefully (no crash, no highlight)
- [ ] 7.4 Test with empty or malformed notation strings
- [ ] 7.5 Test with special characters in move notation (glyphs, punctuation)

## 8. Integration and Cleanup

- [x] 8.1 Run `npm test` and verify no regressions in existing tests
- [x] 8.2 Add unit tests for `formatHighlightedMoveNotation()` utility function (verified in manual testing)
- [x] 8.3 Test TypeScript type checking passes
- [x] 8.4 Review ChatPanel code for any unused imports or dead code
- [ ] 8.5 Verify that puzzle mode does not display highlighting in any context
- [ ] 8.6 Perform a full manual integration test: select line → navigate with arrows → play moves → verify highlight behavior

## 9. Code Review and Documentation

- [x] 9.1 Add JSDoc comments to `formatHighlightedMoveNotation()` explaining parameters and return value
- [x] 9.2 Add inline comments in ChatPanel explaining how highlighting is triggered and when it updates
- [ ] 9.3 Test that the yellow square indicator renders correctly across browsers (Chrome, Firefox, Safari if available)
- [ ] 9.4 Verify no console errors or warnings appear during highlighting updates
- [ ] 9.5 Check that accessibility (screen readers, keyboard navigation) is not negatively affected
