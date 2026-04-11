## Context

The analysis view currently initializes the ChessboardJS board as soon as React renders the oardRef. If the script defines window.ChessBoard (capital B) instead of the lowercase Chessboard, the existing guard thinks the library is missing and sets the status to  ChessboardJS failed to load, leaving the board blank even though the script is actually present.

## Goals / Non-Goals

**Goals:**
- Detect the real constructor exported by chessboardjs (window.ChessBoard or window.Chessboard) before the board initialization runs.
- Allow a short retry loop while the script finishes loading so temporary timing issues cannot trigger the error message.
- Keep the rest of the analysis logic intact while providing a clearer status when initialization genuinely fails.

**Non-Goals:**
- Replacing chessboardjs with another board library.
- Reworking the entire settings flow or analysis layout.

## Decisions

1. **Constructor detection** ? Probe both window.ChessBoard and window.Chessboard, caching the first available value, so we work with whichever casing the bundled script exposes. This ensures compatibility with the legacy global while the code remains future-proof.
2. **Retry strategy** ? Introduce a small retry timer that re-checks for the constructor for up to 2 seconds after the analysis view mounts. If it appears, we proceed; if it never does, the status message stays on screen so the user sees the exact problem.
3. **Status message clarity** ? Keep the existing setStatusMessage pathway but only set the error after the retries exhaust. This ensures we only report a hard failure when the script truly never defines the constructor.

## Risks / Trade-offs

- [Risk] Timing heuristics may still be brittle if the script loads even later than expected. ? Mitigation: keep the retry window short but consider adding a manual  Reload board button if necessary later.
- [Risk] Polling for the constructor introduces extra hooks. ? Mitigation: keep the loop lightweight (~200ms) and cancel once the constructor exists.

## Migration Plan

1. Add a helper that resolves ChessboardCtor by checking both global names and exposes it through state.
2. Tie the board initialization effect to that helper so we only render once the constructor is available, and allow a retry loop before giving up.
3. Keep the error path alive but only trigger it after retries fail, so the user sees the real cause if the library is missing.

## Open Questions

- None currently.
