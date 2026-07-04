## Why

The current line detail display tries to track moves within a theoretical engine line, which is error-prone and complicated. Users expect the detail panel to show the moves they've actually played on the board, with the ability to navigate backward/forward through those moves using keyboard shortcuts. Additionally, LLM analysis currently generates explanations for all engine lines simultaneously, which is inefficient and unnecessary — we should only analyze the line the user has selected or the line that matches their last board move.

## What Changes

- **Line Detail Display**: Changes from tracking a selected engine line's future moves to displaying only the moves the user has actually played on the board. The highlighted move shifts from "next move to play" to "last move made."
- **Keyboard Navigation**: Add support for arrow keys to navigate backward/forward through played moves with automatic move highlighting.
- **Line Selection Tracking**: Implement a hash map structure for each cached engine line to enable fast lookup of which line matches the user's current board position (move sequence).
- **Navigation History**: Track which engine line was selected at each board position so backward navigation accurately restores the previously-selected line.
- **LLM Analysis Scope**: Narrow LLM analysis to only the selected line instead of analyzing all lines. The LLM evaluates the current position and the moves in that specific selected line.
- **UI Simplification**: Remove the "Line selected/deselect line" buttons; line selection is now implicit based on matching board moves to engine lines.
- **Label Change**: Change the numbered moves display header from current label to "Moves Played".

## Capabilities

### New Capabilities
- `board-move-tracking`: Display and navigate moves made on the board with keyboard support (arrow keys)
- `selected-line-tracking`: Hash-based lookup and tracking of which engine line matches the current board position
- `line-selection-history`: Track and restore engine line selection when navigating backward
- `line-specific-llm-analysis`: LLM analysis scoped to the selected line only

### Modified Capabilities
- `line-detail-display`: Refactor to show played moves instead of theoretical line moves; highlight last played move instead of next move

## Impact

- **Components**: SelectedLineDetail will be refactored to work with board moves instead of engine lines
- **State Management**: Redux state needs to track line selection history per board position
- **LLM Integration**: Change from analyzing all lines to analyzing selected line only
- **UI/UX**: Keyboard navigation added, selection buttons removed, label updated
- **Performance**: Hash maps reduce line lookup time from O(n) to O(1)
