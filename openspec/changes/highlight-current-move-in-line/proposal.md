## Why

In analysis mode, when users navigate through selected engine lines using keyboard arrows or by making moves on the board, it's difficult to track which move they're currently at within the line's move sequence. The move notation display (e.g., "1. e4 e5 2. ♘f3...") shows all moves but provides no visual indicator of the current position, forcing users to mentally count moves or rely solely on the "Move N of M" counter. This reduces usability and increases cognitive load.

## What Changes

- **Line detail box now includes move highlighting**: When a line is selected in the line detail box (alongside the deselect button), the SAN move notation display will visually indicate the current move position.
- **Current move styling**: The move at the current position will be displayed in bold text with a small yellow square indicator positioned at that move.
- **Dynamic indicator movement**: As the user navigates moves via keyboard (arrow keys) or by playing moves on the board, the yellow square and bold styling will move to track the current move position.
- **Scope**: This feature applies to all game/analysis modes EXCEPT puzzle mode. In puzzle mode, the move display behavior remains unchanged.

## Capabilities

### New Capabilities
- `current-move-highlight`: Highlighting and visual indicator (bold + yellow square) for the current move in the line detail box's SAN move notation display.

### Modified Capabilities
- `line-step-navigation`: Modified to trigger move highlighting updates when users navigate via keyboard or board moves (previously no highlighting was shown).

## Impact

- **UI Components**: ChatPanel component's selected line detail box will need to display the move notation with dynamic styling.
- **State Management**: The current move index (`currentMoveIndex`) already exists in App.tsx and will be used to determine which move to highlight.
- **CSS/Styling**: New MUI sx styling to bold text and position a small yellow square indicator.
- **Affected Files**: ChatPanel.tsx (to render highlighted notation), possibly a helper to format the move string with highlighted segments.
- **No breaking changes**: This is purely additive to the existing UI with no API or behavior modifications to child components.
