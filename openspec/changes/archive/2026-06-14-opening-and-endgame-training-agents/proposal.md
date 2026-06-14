## Why

Chess To Me currently supports freeform analysis and puzzle solving, but lacks structured training modes that guide kids through the two most skill-defining areas of chess: opening theory and endgame technique. Adding dedicated Opening and Endgame training agents gives children a scaffolded, story-rich learning path from their very first moves to converting winning positions.

## What Changes

- **New opening training agent**: An independent LLM pipeline that teaches opening principles move by move. It identifies the opening being played using the `@chess-openings/eco.json` library (ECO database with 12 000+ openings), narrates each move with age-appropriate explanations, tactical vocabulary, and famous-game stories, and sends all move analyses in one shot so that arrow-key navigation shows the correct commentary for every position.
- **New endgame training agent**: An independent LLM pipeline that generates endgame positions on demand (e.g., "Rook and Pawn", "King and Pawn", "Queen vs Rook") and provides step-by-step technique commentary for each move in the line, with the same one-shot analysis and arrow-key navigation.
- **ECO opening annotation in game-database view**: When a game is loaded from the games database, the app resolves and displays the opening name via the ECO library so children learn which opening each player chose.
- **Conversation memory per agent**: Each agent uses its own per-mode conversation file (`conversation-opening.json`, `conversation-endgame.json`) extending the existing per-mode conversation memory system.

## Capabilities

### New Capabilities

- `opening-training-agent`: Full LLM pipeline for opening training — ECO lookup, move-by-move analysis array, age-appropriate narration with stories, arrow-key navigation, and conversation memory scoped to the opening session.
- `endgame-training-agent`: Full LLM pipeline for endgame training — position generation from natural-language requests, move-by-step technique commentary array, age-appropriate narration, arrow-key navigation, and conversation memory scoped to the endgame session.
- `eco-opening-library`: Integration of `@chess-openings/eco.json` into the main process for ECO code lookup by FEN/move sequence, used by both the opening agent and the game-database game loader.

### Modified Capabilities

- `puzzle-solve-flow`: The per-move analysis navigation pattern (arrow keys advance/retreat through a line while showing matching commentary) established for puzzles is extended to opening and endgame training responses.
- `games-database`: When a game is loaded, the ECO library resolves the opening name and it is surfaced in the PlayerBar / game header.
- `analysis-and-llm-guidance`: The question classifier in the main process must route "teach me an opening" and "endgame practice" intents to their dedicated pipelines instead of the general analysis handler.

## Impact

- **New npm dependency**: `@chess-openings/eco.json` (Node 18+, zero sub-dependencies, TypeScript types included) — bundled in the main process.
- **New response types**: `Opening` and `Endgame` added to the `ResponseType` union and the LLM JSON schema.
- **New IPC channels**: `opening:ask` and `endgame:ask` — each with its own system prompt and LLM call, analogous to `llm:ask-question`.
- **Renderer changes**: `ChatPanel` and `App.tsx` handle the new response types, render per-move commentary arrays, and wire up arrow-key navigation identical to the puzzle solution navigator.
- **Electron main process**: Two new handler files (`electron/openingAgent.ts`, `electron/endgameAgent.ts`) keep each pipeline isolated.
- **Conversation memory**: Two new mode keys (`"opening"`, `"endgame"`) added to the existing per-mode file storage system.
