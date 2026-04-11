## Why

The current layout renders the chessboard so large that the entire page shows a vertical scrollbar, making the UI feel cramped and less usable on laptop screens. We need to reorganize the view so the board and its controls fit together on a single responsive canvas without page-level scrollbars.

## What Changes

- Introduce a two-panel layout with the chessboard locked to the left and the FEN/chat controls grouped on the right, keeping all sections on-screen simultaneously.
- Refine Tailwind/container settings so the page never introduces horizontal or vertical scrollbars regardless of viewport height, while allowing internal scrolling only where appropriate (chat log, analysis feed).
- Adjust responsive breakpoints so the board-control split reorganizes gracefully on narrower screens, ensuring touch and mouse users can still reach every control without overflow.

## Capabilities

### New Capabilities
- oard-controls-panel-layout: Define the left-board/right-controls layout with responsive behavior that guarantees the entire interface (board, FEN controls, chat) remains within the viewport on supported screen sizes.

### Modified Capabilities
- <existing-name>: <what requirement is changing>

## Impact

- Layout CSS/Tailwind utilities for the main app shell (likely src/app, src/components, or shared layout wrappers)
- Chessboard container sizing/parent wrappers and their responsive paddings
- Chat/FEN controls containers to fit within new column while adhering to the no-scroll requirement
- Potential adjustments to the responsive grid system or any utility classes that were causing overflow
