## Why

The analysis view needs a clearer spatial structure so the board and chat/panels each occupy predictable areas without stacking, improving usability on larger screens.

## What Changes

- Introduce a two-column layout where the left column (board) takes roughly 70% of the width while the right column (chat/settings) occupies the remaining space, keeping both full height of the window.
- Pad the chessboard container so the board sits with consistent breathing room and retains the drop shadow without extra panels at the bottom.
- Keep the FEN popup trigger attached to the board column and ensure all interactive controls remain within the chat column.

## Capabilities

### New Capabilities
- nalysis-layout-partition: Defines the fixed two-column layout with proportional widths, full-height alignment, and board padding rules mentioned above.

### Modified Capabilities
- <existing-name>: <what requirement is changing>

## Impact

- Layout and styling in src/App.jsx, src/components/AnalysisBoard.jsx, and related CSS/background containers will need updates to respect the new proportions.
- Rendering assumptions in chat/settings components may need adjustments to accept the reshuffled widths.
