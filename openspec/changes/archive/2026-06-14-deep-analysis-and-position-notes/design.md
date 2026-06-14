## Context

The app currently has an "Start Analysis" button that triggers `runAnalysis(currentFen)`, which calls `electronAPI.analyzePosition` at `formState.analysisDepth` (default 16) and displays lines in the inline chat panel. A separate auto-eval effect runs continuously at a fixed shallow depth (5) to feed the evaluation bar.

Advanced players need richer per-line insights than the generic LLM commentary currently produced, plus the ability to annotate positions and persist a study as a PGN. The current infrastructure — Electron IPC, chess.js, `SettingsStore`, and the existing Snackbar pattern — covers all new needs without additional npm dependencies.

## Goals / Non-Goals

**Goals:**
- Rename the existing analysis button to "Advanced Analysis" and make it toggle a distinct advanced mode state.
- Run a second LLM pass per engine line when advanced mode is active, covering seven analytical dimensions.
- Show a Position Notes panel (textarea keyed by FEN) alongside the chat area in advanced mode.
- Persist position notes in `userData/chess-to-me/position-notes.json` across sessions.
- Save the current game + embedded notes as a PGN file; load a previously saved PGN file via Electron dialog.
- Show a Snackbar toast with the saved file path after a successful save.
- Document the feature in `README.md`.

**Non-Goals:**
- Changing the auto-eval eval-bar depth (stays at 5 for speed).
- Adding a new npm package (chess.js PGN, `fs`, and Electron `dialog` are already available).
- Real-time collaborative annotation or cloud sync of notes.
- Changing how the analysis button interacts with `isAnalysisRunning` (it still stops/starts the engine run; `advancedAnalysisMode` is an orthogonal boolean).

## Decisions

### Decision 1: `advancedAnalysisMode` boolean state in `App.tsx`

The analysis button now toggles two concerns simultaneously: whether engine analysis is running (`isAnalysisRunning`) and whether the UI should present deep-analysis extras (notes panel, save/load buttons, deep LLM pass). Separating these into two independent booleans keeps each responsibility clear.

`advancedAnalysisMode` is set to `true` when the user clicks the analysis button, and cleared when they click it again (stop) or navigate away from analysis mode. It gates:
- The deep LLM pass after engine lines return.
- Rendering of `<PositionNotesPanel>`.
- Visibility of Save/Load icon buttons.

**Alternative considered**: A single `analysisMode: "none" | "standard" | "advanced"` enum. Rejected because the standard analysis path was removed — there is now only "off" or "advanced", so a boolean suffices and avoids adding a new type.

### Decision 2: Deep LLM pass as a new `analysis:deep` IPC handler

The seven-dimension analysis per line is a non-trivial LLM call. Placing it in the main process alongside existing LLM routing (provider selection, timeout rules, conversation history) avoids duplicating those rules in the renderer.

The renderer calls `electronAPI.deepAnalyzeLines({ fen, lines })` after `runAnalysis` completes (only when `advancedAnalysisMode` is true). The main process iterates each line, builds a structured prompt, calls the LLM, and streams back a JSON array of `{ lineIndex, analysis: DeepLineAnalysis }`.

`DeepLineAnalysis` fields: `strategy`, `proscons`, `counterattack`, `sacrifice`, `novelty`, `endgameChances`, `alternatives`.

**Alternative considered**: One LLM call for all lines in a single prompt. Rejected because response parsing becomes fragile and timeouts hit on long positions with many lines. Per-line calls also allow progressive display.

### Decision 3: Position notes stored as a flat JSON map keyed by full FEN

Notes are keyed by the canonical full FEN string (including side to move, castling rights, en-passant, clocks). This uniquely identifies a position within a game context. The store is `userData/chess-to-me/position-notes.json` with the shape `Record<string, string>`.

IPC surface:
- `notes:get(fen: string) → string | null`
- `notes:set(fen: string, text: string) → void`

`notes:get` is called every time `currentFen` changes while `advancedAnalysisMode` is true. `notes:set` is debounced 500 ms from the last keystroke inside `PositionNotesPanel` to avoid excessive disk writes.

**Alternative considered**: Keying by a Zobrist hash of the board position (ignoring en-passant and clocks). Rejected because chess.js does not expose a hash, and the full FEN is already available.

### Decision 4: PGN save embeds notes as move comments

When saving, the handler calls `chess.pgn()` to get the standard PGN string, then appends a custom `[Notes]` tag block containing a JSON-encoded map of `{ fen → note }`. This keeps everything in one file and is trivially re-parsed on load. Notes are NOT embedded inline as `{ comment }` annotations per move (which would require re-parsing the PGN move tree), keeping the save/load implementation simpler.

File name: `analysis-<dd-mm-yyyy_hh>.pgn` in `userData/chess-to-me/`. The IPC handlers:
- `analysis:save-pgn({ pgn, notes }) → { path: string }`
- `analysis:load-pgn() → { pgn: string, notes: Record<string, string> }` (triggers Electron dialog)

### Decision 5: `PositionNotesPanel` as a new standalone component

The panel is a MUI `Paper` with a full-height `TextField` (multiline). It receives the current FEN as a prop, calls `notes:get` on mount and when the FEN changes, and debounces `notes:set` on each change. No Redux or global state — the panel owns its own load/save lifecycle.

The panel is rendered to the right of the existing chat area using a `Box flexDirection="row"` wrapper, occupying roughly 280–320 px. It collapses entirely when `advancedAnalysisMode` is false.

## Risks / Trade-offs

- **[Risk] Deep LLM calls can be slow**: Seven per-line prompts back-to-back with a cloud provider may take 10–30 seconds. Mitigation: Show a progress indicator per line; call them sequentially to avoid rate-limit 429s; display results as they arrive rather than waiting for all.
- **[Risk] FEN key collisions in notes**: Two different games that reach identical FENs will share a note. Mitigation: Document this behavior in the UI ("Notes apply to this position in any game"); it is a reasonable trade-off for simplicity.
- **[Risk] position-notes.json grows unboundedly**: Users who analyze many games may accumulate thousands of FEN entries. Mitigation: File size is negligible for years of typical use; no pruning needed at launch.
- **[Risk] PGN load fails if file is corrupt**: The `analysis:load-pgn` handler wraps the parse in a try/catch and returns an error string to the renderer. Mitigation: Renderer shows a Snackbar error toast on failure.

## Migration Plan

No database schema changes. No breaking changes to existing IPC channels. New channels are additive. Existing `analysis-and-llm-guidance` pipeline is unchanged for non-advanced mode. Rollout steps:

1. Add new IPC handlers in `electron/main.ts`.
2. Expose new channels in `electron/preload.ts` and `src/types/index.ts`.
3. Add `advancedAnalysisMode` state and new UI elements in `App.tsx`.
4. Create `src/components/PositionNotesPanel.tsx`.
5. Update README.

No rollback strategy needed — all additions are gated by the `advancedAnalysisMode` flag.

## Open Questions

- Should the Load Analysis button accept PGN files from any location (via dialog filter to `*.pgn`) or only from the `userData/chess-to-me/` directory? (Current design: full file picker, `*.pgn` filter, any location.)
- Should the deep LLM analysis be re-triggered automatically when moves are made in advanced mode, or only on explicit button click? (Current design: only on explicit click, matching existing analysis button behavior.)
