## Why

The renderer sometimes fails to surface the chessboard at all, leaving users staring at a blank screen. While we resolve that reliability issue, the visual polish should also match the rest of the desktop controls by introducing slightly rounded edges so the board/gutter elements feel cohesive.

## What Changes

- Fix the ChessboardJS integration so the board reliably appears when the app starts and whenever a FEN is applied.
- Add blueprint/renderer adjustments so the board container and nearby controls have gently rounded corners that match the rest of the UI.
- Document the new capability so specs capture both the rendering guarantee and the rounding requirement.

## Capabilities

### New Capabilities
- `chessboard-rendering`: Guarantees the ChessboardJS board is mounted/rendered whenever the analysis view is shown and ensures adjacent controls have consistent rounded edges.

### Modified Capabilities
- None

## Impact

- Touches `src/App.jsx` (board lifecycle) and `src/styles.css` (corner radius overrides). No dependency changes.
