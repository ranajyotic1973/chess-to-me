## Context

Chess To Me's main LLM pipeline lives in `electron/main.ts` and routes user questions through a two-pass classifier → generator pattern. Puzzle handling has a dedicated handler (`handlePuzzleRequest`), and move-by-move navigation uses a `solution` array stored in React state. The renderer navigates that array with arrow keys and shows the matching commentary.

The existing per-mode conversation memory system stores `conversation-{mode}.json` files in `<userData>/chess-to-me/`. The `@chess-openings/eco.json` npm package (zero deps, Node 18+, TypeScript types) gives ECO lookup by FEN position or move sequence — this is the authoritative opening name source.

## Goals / Non-Goals

**Goals:**
- Two isolated LLM pipelines (`opening:ask`, `endgame:ask`) with their own system prompts, IPC handlers, and handler modules.
- One-shot response: the LLM returns a `moves` array where each element is `{ uci, san, commentary }`. The renderer stores this and displays the right commentary as the user arrows through positions.
- ECO lookup integrated into the main process; used by both opening agent and the game-database loader.
- Conversation memory keyed to `"opening"` and `"endgame"` modes, auto-loaded when those response types are active.
- Age-appropriate language with technical chess vocabulary and famous-game story snippets embedded in commentary.
- New `ResponseType` values `"Opening"` and `"Endgame"` routed through existing renderer infrastructure (arrow-key nav, `ChatPanel`, `App.tsx`).

**Non-Goals:**
- Interactive opening tree browser / UI — training is conversational, not a visual tree.
- Real-time engine evaluation of opening moves — the agent is LLM-only; Stockfish is not run during opening/endgame training unless the user explicitly asks for analysis.
- Multiplayer or external API calls beyond the LLM provider already configured.
- Storing the full ECO dataset in the app's SQLite database — the npm package is loaded directly in the main process.

## Decisions

### 1. Isolated handler modules per agent
Each agent gets its own file (`electron/openingAgent.ts`, `electron/endgameAgent.ts`) with a single exported async function (`handleOpeningRequest`, `handleEndgameRequest`). These are registered as `ipcMain.handle("opening:ask", ...)` and `ipcMain.handle("endgame:ask", ...)` in `main.ts` — the same pattern as `handlePuzzleRequest`.

**Why not a single "training" handler with a mode flag?** Separating them keeps system prompts, prompting strategy, and future iteration independent. The opening agent needs ECO lookup; the endgame agent needs position generation logic — coupling them adds complexity for little benefit.

### 2. One-shot `moves` array in the LLM response
The LLM is instructed to return a structured JSON object with:
```json
{
  "response_type": "Opening",
  "opening_name": "Sicilian Defense, Najdorf Variation",
  "eco_code": "B90",
  "fen": "<starting FEN>",
  "moves": [
    { "uci": "e2e4", "san": "e4", "commentary": "White occupies the center…" },
    { "uci": "c7c5", "san": "c5", "commentary": "Black fights for the center from the flank…" }
  ],
  "story": "Magnus Carlsen played this exact line against Hikaru Nakamura at the 2010 Tal Memorial…",
  "explanation": "<intro paragraph shown immediately>"
}
```

**Why one-shot instead of streaming per move?** The renderer's arrow-key nav needs the full `moves` array at once. Streaming the array piecemeal would require complex partial-parse logic with no UX benefit since the user can't navigate before the response is complete anyway.

### 3. ECO lookup strategy
`@chess-openings/eco.json` is loaded once at main-process startup (`import { findOpening } from "@chess-openings/eco.json"`). The opening agent passes the position FEN (after each move) to `findOpening(fen)` to get the canonical ECO code and name. This result is injected into the LLM prompt as context so the model can reference it.

For the games-database loader, when a game is selected, the main process plays through the PGN move-by-move and calls `findOpening(fen)` at each position, returning the last matched opening name to the renderer.

**Why not query the LLM for the opening name?** The ECO library is authoritative, deterministic, and free. The LLM might hallucinate or use inconsistent naming.

### 4. Intent routing in the classifier
The PASS 1 classifier in `main.ts` is extended with two new intent categories:
- `"opening_training"` — triggers `handleOpeningRequest`
- `"endgame_training"` — triggers `handleEndgameRequest`

Keywords/patterns that trigger each: "teach me an opening", "show me the Sicilian", "how does the King's Indian start", "endgame practice", "Rook and Pawn endgame", "how to checkmate with king and rook", etc. Regex heuristics provide fast pre-screening; the LLM classifier confirms ambiguous cases.

### 5. Renderer navigation re-use
The existing `puzzleSolution` / `currentMoveIndex` / arrow-key handler pattern in `App.tsx` is generalised. A new unified `trainingMoves` state (`Array<{ uci, san, commentary }>`) replaces the separate puzzle-solution and line-navigation states for training modes. When `responseType === "Opening"` or `"Endgame"`, arrow keys step through `trainingMoves` and set `questionResponse` to the current move's `commentary`.

**Alternative considered**: separate `openingMoves` and `endgameMoves` states. Rejected — they share identical navigation logic; a single `trainingMoves` state with the type discriminated by `currentResponseType` is cleaner.

### 6. Conversation memory modes
The existing per-mode file system gains two new keys: `"opening"` and `"endgame"`. `deriveConversationMode` in `App.tsx` maps `responseType === "Opening"` → `"opening"` and `responseType === "Endgame"` → `"endgame"`. Conversation resets on new training session (same pattern as puzzle mode).

## Risks / Trade-offs

**[Risk] LLM response too long for token limits** — Opening theory for 20 moves with full commentary may exceed context. Mitigation: cap `moves` array at 15 entries; instruct the LLM to be concise per move (2–3 sentences). Users can ask follow-up questions for deeper dives.

**[Risk] eco.json package not found at startup** — Missing dep causes main-process crash. Mitigation: wrap the import in a try/catch; if unavailable, degrade gracefully (opening agent still works but ECO metadata is omitted from prompts).

**[Risk] LLM generates invalid UCI moves** — Commentary array has moves the board cannot play. Mitigation: validate each UCI move with `chess.js` before storing in `trainingMoves`; skip invalid moves and log a warning rather than crashing.

**[Risk] Intent mis-classification routes training requests to the general handler** — Kids get generic answers instead of structured training. Mitigation: heuristic pre-screen runs before LLM classifier for strong signals ("teach me", "endgame practice"); unit tests cover the routing logic.

## Migration Plan

No breaking changes to existing data or IPC contracts. The two new IPC channels are additive. The `ResponseType` union gains two values — existing `switch` statements in the renderer handle unknown types via their default/fallback branches, so old builds gracefully ignore the new types.

The `@chess-openings/eco.json` package must be added to `package.json` and included in the Electron build configuration (`electron-builder` `files` array or `extraResources`). This is a one-time setup step with no migration of existing user data.

## Open Questions

- **Story sourcing**: Should famous-game stories come entirely from the LLM's training data, or should we maintain a small curated YAML file of verified stories? Current plan: LLM only, with a system-prompt instruction to cite year and tournament when mentioning real games, and to clarify uncertainty.
- **Opening depth**: Is 15 moves the right cap? Could be a user setting in the future — leaving that for a follow-up change.
- **Endgame position validation**: Should the engine analyse the generated endgame position to confirm it is theoretically won/drawn as claimed? Deferred — adds complexity; LLM is generally reliable for standard endgame types.
