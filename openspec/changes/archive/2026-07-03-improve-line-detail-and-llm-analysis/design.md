## Context

Currently, the Line Detail control attempts to track a selected engine line and highlight the "next move to play" within that line. This approach is error-prone because:
- The control doesn't know if the user will play the suggested move or deviate
- Highlighting future moves (not yet played) is confusing
- Switching between lines requires complex state coordination
- LLM analyzes all lines simultaneously, wasting resources

The redesign simplifies this by treating Line Detail as a simple move history display, with line selection implicit based on matching board moves to engine lines.

## Goals / Non-Goals

**Goals:**
- Simplify Line Detail logic by showing only played moves
- Implement O(1) line lookup using move sequence hashing
- Track line selection history for accurate backward navigation
- Scope LLM analysis to selected line only
- Support keyboard navigation (left/right arrows) through move history
- Remove ambiguous UI elements (selection buttons)

**Non-Goals:**
- Change how engine analysis is generated or scored
- Modify the chat or puzzle modes
- Alter the LLM provider or model selection logic
- Implement move validation or suggestion overlays

## Decisions

### Decision 1: Move representation in Line Detail
**Choice**: Store only the moves made on the board; display only these moves with the last one highlighted.

**Rationale**: This eliminates the cognitive mismatch between "moves we've played" and "moves the engine suggests next." Users understand exactly what they've done vs what might come next.

**Alternatives considered**:
- Continue tracking selected line's future moves: Rejected because it requires constant updates and user confusion about highlighting
- Show both board moves and line moves separately: Rejected for UI complexity

### Decision 2: Line lookup mechanism
**Choice**: Create a hash map for each cached engine line mapping move sequences to line metadata.

**Rationale**: Move sequence hashing allows O(1) lookup when determining which line matches the current board position. The hash key is the sequence of moves in UCI format (e.g., "e2e4 c7c5 g1f3").

**Alternatives considered**:
- Linear search through lines on each move: Rejected for O(n) performance
- Store move sequences as strings and string-compare: Slower than hashing

### Decision 3: Line selection tracking
**Choice**: Maintain a map of board positions (FEN) → selected line, updated as the user makes moves.

**Rationale**: This allows accurate restoration of which line was selected when navigating backward. If the user changes move sequences, the old selections are discarded.

**Alternatives considered**:
- Simple undo/redo stack: Rejected because it doesn't account for move sequence changes
- Always re-detect line: Works but doesn't preserve which line the user had clicked on

### Decision 4: Navigation state
**Choice**: Track a "navigation position index" (0 = starting, increases with each move) separate from the "current board position." Keyboard navigation adjusts the navigation index; making a new move resets it to the latest position.

**Rationale**: Separates the user's review (navigation) from the actual board state, preventing confusion.

**Alternatives considered**:
- Modify the board FEN during navigation: Rejected because it could trigger unwanted analysis or state updates
- Store separate "navigation FEN": Rejected for complexity

### Decision 5: LLM analysis scope
**Choice**: Before fetching LLM explanation, check if a line is selected. If so, request analysis only for that line.

**Rationale**: Reduces LLM API calls and provides focused analysis for the specific line the user is interested in.

**Alternatives considered**:
- Batch analyze all lines: Rejected for efficiency
- No analysis until user clicks a line: Rejected because current behavior expects auto-fetch after move count

### Decision 6: State management
**Choice**: Use Redux for game state (analysisLines, selectedLineIndex, lineSelectionHistory). Use local component state in SelectedLineDetail for navigation position.

**Rationale**: Redux manages shared state (line selection across components). Local state handles UI-only concerns (where in the move history we're viewing).

## Risks / Trade-offs

**Risk**: Move sequence hashing might miss edge cases (pawn promotions, castling notation).
→ **Mitigation**: Use chess.js to validate and normalize moves before hashing. Include promotion piece in UCI format.

**Risk**: Backward navigation might show incorrect line if the same position is reached via different move sequences.
→ **Mitigation**: The hash key includes the full move sequence, not just the FEN. This handles transpositions correctly.

**Risk**: User might expect keyboard navigation to rewind the board position, not just the display.
→ **Mitigation**: Add UI hint or tooltip: "Arrow keys navigate move history. Make a new move to continue from any position."

**Trade-off**: Removing the "Line selected" button means users can't explicitly select a line that doesn't match their board moves.
→ **Decision**: Acceptable because we match based on moves, which is the natural intent. If no line matches, none is selected — this is clearer than ambiguous selection.

## Migration Plan

1. Refactor SelectedLineDetail to accept played moves instead of a selected engine line
2. Implement move sequence hashing for engine lines during analysis
3. Create Redux actions for tracking line selection history
4. Update the main analysis flow to store line selections per board position
5. Replace LLM multi-line analysis with single-line analysis based on selection
6. Add keyboard navigation handlers in SelectedLineDetail
7. Update UI labels and remove selection buttons
8. Test backward/forward navigation scenarios thoroughly

## Open Questions

1. Should navigation reset to the latest move automatically when the user makes a new board move, or should it require an explicit action?
   → **Assumption**: Automatically reset to latest position for simplicity

2. How should we handle the case where a user navigates to a position and makes a move that no longer matches any engine line?
   → **Assumption**: No line is selected; Line Detail shows only the board moves

3. Should the LLM explanation persist when the user navigates backward, or should it update to reflect the new position?
   → **Assumption**: Persist during navigation; clear when the board position changes
