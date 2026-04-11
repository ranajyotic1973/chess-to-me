## 1. Layout shell

- [x] 1.1 Replace the main container with a fixed-height grid of two columns so the chessboard occupies the left column and the FEN/chat controls sit in the right column without causing page scrollbars.
- [x] 1.2 Apply h-screen, min-h, and overflow-hidden utilities to the outer shell so the viewport locks to the screen height and horizontal overflow is prevented.

## 2. Controls responsiveness

- [x] 2.1 Wrap the FEN controls and chat panels in a flex/stacked column inside the right panel with overflow-y-auto sections for long chat and analysis logs.
- [x] 2.2 Add responsive breakpoints (around 1024px) to collapse the two-panel layout into a single column and ensure the reflow still fits the viewport.

## 3. Verification

- [ ] 3.1 Confirm no vertical or horizontal page-level scrollbars appear on a 1366x768 viewport with the new layout.
- [ ] 3.2 Validate the stacked view on a 900px-wide viewport keeps the board and controls visible without page scrollbars.
