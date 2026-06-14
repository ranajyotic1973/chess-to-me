## Why

Advanced players need richer engine-backed analysis than the current shallow auto-eval provides — including strategic reasoning, sacrifice detection, novelty spotting, and endgame probability — together with the ability to annotate positions and save the resulting study as a PGN file. The current "Start Analysis" button triggers a generic engine run with no depth control and no way to persist findings.

## What Changes

- Rename the existing "Start Analysis" play-icon button to **Advanced Analysis** (tooltip update, aria-label update).
- When Advanced Analysis is active, run the engine at the full depth saved in Settings (`analysisDepth`) instead of the shallow auto-eval depth.
- For each engine line returned, request an LLM pass that covers all seven dimensions: strategy/tactics, pros/cons, counter-attack, sacrifice possibilities, novelty move, endgame winning chances, and alternative strategies.
- Add a **Position Notes** notepad panel that appears to the right of the chat area when Advanced Analysis mode is on. Notes are keyed by FEN so they reappear automatically whenever the same position is reached in any future session.
- Add a **Save Analysis** icon button (save icon, tooltip "Save this analysis") in the same toolbar row as the Advanced Analysis button. Visible only in Advanced Analysis mode. Saves the current game + notes as a PGN file named `analysis-<dd-mm-yyyy_hh>.pgn` in the same directory as the app settings file.
- Add a **Load Analysis** icon button (folder-open icon) in the same toolbar row. Opens a file picker filtered to `*.pgn` files in the settings directory; loads the chosen PGN onto the board and restores any embedded notes.
- Show a toast notification with the full file path after a successful save.
- Document the Advanced Analysis feature in `README.md` with a "For Advanced Players" section.

## Capabilities

### New Capabilities

- `deep-analysis-mode`: Engine analysis at full settings depth, LLM deep-dive per line covering the seven dimensions listed above; active when user clicks the Advanced Analysis button.
- `position-notes`: Per-FEN notepad panel alongside the chat area; notes auto-load when the position is revisited; keyed by position hash stored in a JSON sidecar file.
- `analysis-pgn-save-load`: Save and load board position + moves + embedded notes as PGN files; save button visible only in Advanced Analysis mode; file naming convention `analysis-<dd-mm-yyyy_hh>.pgn`; toast notification on save.

### Modified Capabilities

- `analysis-and-llm-guidance`: The LLM guidance pipeline gains a new "deep" mode that produces structured seven-point analysis per line rather than the current brief explanation.
- `inline-analysis-lines`: Analysis lines panel must display the extended deep-analysis fields (strategy, pros/cons, counter-attack, sacrifice, novelty, endgame prognosis, alternatives) alongside the existing SAN description.

## Impact

- `src/App.tsx`: New `advancedAnalysisMode` boolean state; conditionally renders notes panel and save/load buttons; passes `deepMode` flag to `runAnalysis`.
- `src/components/PositionNotesPanel.tsx`: New component — textarea keyed by FEN, auto-saves to Electron settings.
- `electron/main.ts`: New `analysis:deep` IPC handler; new `notes:get` / `notes:set` IPC handlers; new `analysis:save-pgn` / `analysis:load-pgn` IPC handlers.
- `electron/preload.ts`: Expose the four new IPC channels.
- `src/types/index.ts`: New IPC payload/response types; `ElectronAPI` additions.
- `README.md`: New "Advanced Analysis" section for advanced players.
- No new npm dependencies required (chess.js PGN support is already bundled; Electron `dialog` and `fs` are available in main).
