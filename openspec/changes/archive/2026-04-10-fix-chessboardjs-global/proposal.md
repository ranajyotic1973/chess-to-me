## Why

The analysis view sometimes reports  ChessboardJS failed to load even though the renderer already ships the library. The root cause is the code checking window.Chessboard, but the bundled script defines window.ChessBoard (with a capital B), so the board fails to initialize and the user sees an empty screen.

## What Changes

- Update the renderer to detect both window.ChessBoard and window.Chessboard, initializing the board only after the correct constructor is available so we never raise the error message erroneously.
- Add a short-lived retry when the constructor is not yet present so that temporary timing issues between script hydration and React rendering cannot leave the board blank.
- Document the new safeguards with a dedicated spec that guarantees the analysis view always succeeds once the settings gate is cleared.

## Capabilities

### New Capabilities
- chessboard-global-detection: Ensure the analysis view waits for the actual ChessboardJS constructor definition (window.ChessBoard or window.Chessboard) before trying to create the board instance.

### Modified Capabilities
- None

## Impact

- Touches src/App.jsx (board initialization logic) and the new spec under openspec/specs/chessboard-global-detection/spec.md. No dependency changes are required.
