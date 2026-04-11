## 1. Board lifecycle

- [x] 1.1 Ensure the ChessboardJS instance initializes only after the board container ref is attached and survives view toggles, so the board is visible when the analysis view opens or a FEN is applied.
- [x] 1.2 Keep the current FEN, position updates, and draggable moves synchronized with the initialized board so that applying new FEN strings always repaints the board.

## 2. Visual polish

- [x] 2.1 Add subtle `border-radius` overrides to the board wrapper, analysis panel, and control cards so their edges match the rest of the Blueprint UI.
- [x] 2.2 Verify there are no layout rules hiding the board container and that the rounded containers render without clipping or overflow issues.
