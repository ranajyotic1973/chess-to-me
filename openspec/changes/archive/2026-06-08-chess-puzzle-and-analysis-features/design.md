## Context

The app is a desktop Electron chess trainer (React + Vite renderer) that uses chess.js for move validation, chessboard.js for board rendering, and a local LLM (Ollama or cloud provider) for natural-language explanations. The analysis pipeline runs through the main process via IPC (`electronAPI`). Key files involved in this change:

- `src/App.tsx` — owns all state (current FEN, line selection, puzzle state, move navigation)
- `src/components/ChatPanel.tsx` — displays chat response, analysis lines (currently via Modal), puzzle solution UI
- `src/utils/llmResponseParser.ts` — parses LLM JSON response into typed objects
- `src/utils/systemPromptGenerator.ts` — generates per-request-type system prompts

**Current state gaps:**
- Analysis lines appear in a `<Modal>` overlay; user asked for inline-in-chat display.
- Move navigation binds Left/Right arrows; user asked for Up/Down arrows.
- Puzzle flow stores `hidden_solution` text but never validates user attempts against a move sequence.
- No per-move LLM explanation; explanations are generated for the whole line at once.
- No explanation cache; backward navigation re-triggers LLM calls (or doesn't exist yet).
- App is not locked during LLM calls triggered by keyboard navigation.

## Goals / Non-Goals

**Goals:**
- Inline analysis lines inside the chat response area, selectable by click or number input.
- Puzzle mode: FEN validation → board load → attempt capture (drag or typed moves) → correct/incorrect alert → solution navigation via Up/Down arrows.
- Per-move forward explanation triggered by Up arrow, with full app lock until generation completes.
- Explanation cache (plain `Map<string, string>` keyed `fen:moveIndex`) served instantly on Down arrow backward navigation.
- Arrow key rebinding from Left/Right to Up/Down throughout.

**Non-Goals:**
- Persistent cross-session explanation database (SQLite, IndexedDB, etc.) — in-memory Map is sufficient for v1.
- Multi-puzzle queue or puzzle rating system.
- LLM streaming (token-by-token) for per-move explanations — full response, then display.
- Puzzle fetching from external sources (Lichess puzzles API, etc.).

## Decisions

### Decision 1: Inline analysis lines — render inside ChatPanel scrollable area, no Modal

**Rationale:** User explicitly asked for lines to appear in the chat response area. The current Modal forces a context switch and closes on selection, losing the sense of continuity. Inline rendering puts all interaction (question → lines → selection → explanation) in one scroll container.

**Alternative considered:** Keep the Modal but add a toggle to switch to inline. Rejected: adds complexity with no user benefit given the explicit requirement.

**Implementation:** Remove the `<Modal>` block from `ChatPanel.tsx`. Add a `<Box>` section that renders when `analysisLines.length > 0 && responseType === "Analysis"`. Each line is a clickable row. A number typed in the chat `<TextField>` that matches a line number (1–4) auto-selects that line (detected in `onKeyDown` or via `detectLineNumberInText` already present in `App.tsx`).

### Decision 2: Puzzle attempt capture — dual path (drag-on-board OR typed in chat)

**Rationale:** Both input methods must work. Drag gives spatial feedback; typing allows fast entry for those who know the notation.

**Drag path:** `AnalysisBoard` already fires `onBoardMove` after each successful legal move. When `responseType === "Puzzle"` and a solution sequence exists in state, `App.tsx` appends the resulting FEN to a `puzzleAttemptMoves[]` array. After the number of moves equals the solution length, validate and alert.

**Typed path:** When the user submits chat input that matches a move notation pattern (e.g., `e2e4 d7d5` or SAN `e4 d5`) while `responseType === "Puzzle"`, parse the moves with chess.js and compare to the solution. Do NOT send to LLM; handle locally.

**Alternative considered:** Force the user to always type in the chat box. Rejected: drags on the board are the most natural chess UI interaction.

### Decision 3: Per-move explanation — Up arrow triggers LLM call; Down arrow reads cache

**Rationale:** Generating a full-line explanation upfront is cheaper but gives the user no reason to navigate. Per-move generation creates a teaching rhythm. Caching backward reads avoids redundant LLM calls and makes backward navigation instant.

**Cache structure:** `Map<string, string>` where key is `${baseFen}:${lineIndex}:${moveIndex}`. The map lives in `App.tsx` state (or `useRef` to avoid re-renders). It is NOT persisted across sessions (in-memory only for v1).

**App lock:** A new state flag `isExplanationLoading: boolean` drives a `<Backdrop>` overlay in `App.tsx` while the LLM call is in flight. This prevents user input during generation.

**Alternative considered:** Per-move generation queued proactively (prefetch next move explanation). Rejected: wastes LLM tokens and complicates state; users may not navigate forward at all.

### Decision 4: Arrow key rebinding — Up = next move forward, Down = previous move

**Rationale:** Matches the user's stated requirement. Left/Right could conflict with text cursor movement in the chat input; Up/Down are less likely to conflict and map intuitively to "deeper in line / back out."

**Guard:** Arrow key handler in `App.tsx` must NOT fire when the chat `<TextField>` is focused. Check `document.activeElement` or use a `ref` on the TextField.

### Decision 5: FEN validation for puzzles — chess.js `Chess` constructor

**Rationale:** chess.js is already imported everywhere; no new dependency. `new Chess(fen)` throws on invalid FEN. Wrap in try/catch and surface error in chat area.

**Solution sequence format:** The LLM system prompt for `Puzzle` responses must be updated to include a `solution` array field in the JSON response (e.g., `["e2e4", "d7d5", "e4e5"]` in UCI notation). `llmResponseParser.ts` must expose this field.

## Risks / Trade-offs

- **LLM doesn't return valid UCI solution array** → Mitigation: fall back to showing the solution as text, disable move-by-move validation, show a warning in the chat area.
- **chess.js sloppy mode vs strict UCI** → The existing `chess.move(..., { sloppy: true })` call in `applyLineMove` handles Stockfish-style notation. Apply the same for puzzle solution replay.
- **Explanation cache grows unbounded in a long session** → Acceptable for v1; a simple `MAX_CACHE_SIZE` constant (e.g., 500 entries) with LRU eviction can be added later.
- **Up/Down arrows conflict with browser scroll in some focus states** → Call `event.preventDefault()` in the handler; guard against TextField focus.
- **Inline analysis lines take vertical space in chat** → Line list is collapsed/hidden after a line is selected; show a "Change line" toggle to re-expand.
