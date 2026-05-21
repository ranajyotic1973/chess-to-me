## 1. Investigation & Setup

- [x] 1.1 Verify if chessboard.js library supports arrow drawing (check documentation and library features)
- [x] 1.2 Identify arrow drawing API/method if available (color options, from/to squares, etc.)
- [x] 1.3 Document findings; decide if arrow visualization is implemented or skipped for phase 1

## 2. Manual Analysis Control - UI

- [x] 2.1 Add "Start Analysis" and "Stop Analysis" buttons to AnalysisBoard component
- [x] 2.2 Create button styling and layout (position in board controls area)
- [x] 2.3 Add state tracking for `isAnalysisRunning` in App.tsx
- [x] 2.4 Wire up button clicks to start/stop analysis handlers
- [x] 2.5 Add visual feedback when buttons are disabled (grayed out appropriately)

## 3. Manual Analysis Control - Logic

- [x] 3.1 Remove auto-analysis trigger from `onBoardMove` callback in App.tsx
- [x] 3.2 Create `handleStartAnalysis()` function that sets `isAnalysisRunning` to true
- [x] 3.3 Create `handleStopAnalysis()` function that halts engine and sets `isAnalysisRunning` to false
- [x] 3.4 Update analysis flow to only run when user clicks start button
- [x] 3.5 Test: manual button clicks trigger/stop analysis correctly

## 4. Engine-Driven Analysis - Backend

- [x] 4.1 Modify `runLlmChat()` to include engine lines in system prompt context
- [x] 4.2 Update LLM system prompt to request explanation only, not move suggestions
- [x] 4.3 Pass engine analysis directly to LLM chat (format: "Top engine lines: Line 1: e2-e4..., Line 2: d2-d4...")
- [x] 4.4 Verify LLM receives engine lines in every chat message
- [ ] 4.5 Test with actual LLM to confirm it explains lines instead of inferring moves

## 5. Engine Lines Display - Frontend

- [x] 5.1 Modify ChatPanel to display engine lines with numbers (Line 1, 2, 3, 4)
- [x] 5.2 Format lines clearly: "Line 1: e2-e4 e7-e5 g1-f3..."
- [x] 5.3 Make each line clickable for selection
- [ ] 5.4 Test: lines display correctly after analysis completes
- [ ] 5.5 Test: lines are readable and properly numbered

## 6. Arrow Visualization (Conditional on 1.2)

- [x] 6.1 IF arrows supported: Implement arrow drawing for first move of each line
- [x] 6.2 IF arrows supported: Add color differentiation for each line's arrow
- [x] 6.3 IF arrows supported: Update arrows when position changes
- [x] 6.4 IF arrows supported: Clear arrows on new analysis start
- [x] 6.5 IF arrows NOT supported: Verify text-only display works well (fallback)
- [x] 6.6 Test: arrows display and update correctly (or fallback displays cleanly)

## 7. Line Selection - Interface

- [x] 7.1 Add click handler to each numbered line in ChatPanel
- [x] 7.2 Detect line selection and store selected line index
- [x] 7.3 Add visual highlight to selected line (bold, background color, etc.)
- [x] 7.4 Display "Line X selected" confirmation message
- [x] 7.5 Add parsing for LLM responses containing "line X" pattern to detect voice selection
- [ ] 7.6 Test: clicking line selects it; LLM mention of "line 2" triggers selection

## 8. Line Memorization

- [x] 8.1 Extend `BoardStateManager` with `selectedLineIndex` and `selectedLineData` properties
- [x] 8.2 Add `setSelectedLine(lineIndex, lineData)` method to store selected line
- [x] 8.3 Add `getSelectedLine()` method to retrieve selected line
- [x] 8.4 Store full line data (all moves) when selected
- [x] 8.5 Clear selected line when new analysis starts
- [x] 8.6 Test: selected line persists and is retrievable throughout session

## 9. Keyboard Navigation - Setup

- [x] 9.1 Add `currentMoveIndex` state to track position within selected line in App.tsx
- [x] 9.2 Create `handleKeyboardNavigation()` to listen for arrow key presses
- [x] 9.3 Attach keyboard event listener in useEffect (only when line is selected)
- [x] 9.4 Implement left arrow (previous move) and right arrow (next move) logic
- [x] 9.5 Add boundary checks to prevent navigation beyond line start/end
- [x] 9.6 Test: arrow keys navigate forward/backward through selected line

## 10. Keyboard Navigation - Board Updates

- [x] 10.1 Create `applyLineMove(moveIndex)` function to update board position for specific move in line
- [x] 10.2 Call `boardManager.applyMove()` to update chess.js state
- [x] 10.3 Call `setCurrentFen()` to update board display
- [x] 10.4 Update move counter display: "Move X of Y"
- [x] 10.5 Test: board updates correctly as user navigates through line

## 11. UI Polish & Feedback

- [x] 11.1 Add "Move X of Y" indicator in ChatPanel when line is selected
- [x] 11.2 Add keyboard hint in UI: "Use arrow keys to navigate through line"
- [x] 11.3 Highlight selected line visually (distinct from other lines)
- [x] 11.4 Add confirmation feedback when line is selected
- [x] 11.5 Test: all feedback indicators display correctly and update in real-time

## 12. Testing - Manual

- [ ] 12.1 Test manual analysis: click start, analysis runs; click stop, analysis halts
- [ ] 12.2 Test that moving piece on board does NOT auto-start analysis
- [ ] 12.3 Test line display: 4 lines appear after analysis with correct numbering
- [ ] 12.4 Test line selection via click: line highlights and is selectable
- [ ] 12.5 Test line selection via LLM: saying "line 2" in chat selects line 2
- [ ] 12.6 Test keyboard navigation: left/right arrows move through line moves correctly
- [ ] 12.7 Test move counter: displays correct "Move X of Y" during navigation
- [ ] 12.8 Test boundaries: can't go past start or end of line

## 13. Testing - LLM Integration

- [ ] 13.1 Test with multiple LLM providers (Grok, OpenAI, Anthropic, Ollama, Gemini)
- [ ] 13.2 Verify LLM explains lines instead of suggesting moves
- [ ] 13.3 Test that LLM response includes chess-only analysis (no AI chatter)
- [ ] 13.4 Verify engine lines are accurately provided in chat context
- [ ] 13.5 Test follow-up questions maintain context with engine lines

## 14. Testing - Arrow Visualization (If Implemented)

- [x] 14.1 Verify arrows appear for first move of each line
- [x] 14.2 Verify arrows have different colors for visual distinction
- [x] 14.3 Verify arrows update when navigating to new position
- [x] 14.4 Verify arrows clear when new analysis starts
- [x] 14.5 Test with multiple positions (opening, midgame, endgame)

## 15. Cleanup & Documentation

- [x] 15.1 Remove debug logging from analysis flow
- [x] 15.2 Add comments to keyboard navigation event handler
- [x] 15.3 Update README or docs with new manual analysis feature
- [x] 15.4 Document keyboard shortcuts: arrow keys for navigation
- [x] 15.5 Clean up any console logs related to line selection/navigation
- [x] 15.6 Final code review and consistency check

## 16. Known Limitations & Future Work

- [x] 16.1 Document that arrow key nav only works with selected line (feature, not bug)
- [x] 16.2 Document that line selection clears on new analysis (intended behavior)
- [x] 16.3 Note for future: position memory could persist across multiple analyses
- [x] 16.4 Note for future: could add opening book integration to supplement engine lines
- [x] 16.5 Note for future: could cache analysis results for performance

