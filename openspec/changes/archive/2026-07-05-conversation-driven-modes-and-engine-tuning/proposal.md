## Why

The app already has Opening, Middlegame, and Endgame agents plus an intent classifier and a status-bar mode pill, but the conversation flow that ties them together is incomplete: mode switching is not reliably driven by user intent, the chat request is not assembled consistently (guardrails + optional in-context engine analysis), and the engines are not tuned per mode. Critically, both engines currently clamp `MultiPV` to a maximum of 4, so the "show 10+ lines" and "find novel moves" goals are impossible today. This change makes the four analysis-adjacent modes fully conversation-driven, child-safe, and backed by mode-appropriate engine settings.

## What Changes

- **Conversation-driven mode detection.** Every chat message is classified by LLM *intent* (not keyword presence) into Analysis, Opening, Middlegame, or Endgame. The mere word "opening"/"endgame" does not switch modes ("What is the name of the opening?" stays Analysis); an intent like "I want to know about the Ruy Lopez" or "best strategy to win a queen's-pawn endgame" does switch. The detected mode is reflected in the leftmost status-bar pill (already rendered).
- **Guardrailed chat assembly.** The chat agent wraps every request with a system prompt that constrains the conversation to chess and to age-appropriate content for children aged 4–18. When the app is in Analysis mode, the current engine analysis is added to the LLM context as an assistant message alongside the user and system messages; when not in Analysis mode, only the system and user messages are sent.
- **Middlegame mode gated by move count.** Middlegame mode may be entered from Analysis only after at least 10 full moves (20 plies) have been played by both sides; a strategic or tactical middlegame question then routes to the middlegame agent. Before 20 plies, such questions stay in Analysis.
- **Per-mode engine tuning.** In Deep Analysis, Opening, and Endgame modes the engine is configured to (1) explore more and (2) return at least 10 principal variations (raising the current max-4 `MultiPV` clamp), controllable via the existing MultiPV input.
- **Games-database novelty detection.** Novel lines (moves rarely/never played from the position in the imported games database, yet engine-approved) are flagged with a small icon. Novelty uses a persisted per-position index derived from the games database; when a games database is imported but not yet indexed, a background job builds the index, and novelty is unavailable until a games database exists.
- **Line preview popup.** In Deep Analysis, Opening, Middlegame, and Endgame modes, every engine line has a play icon that opens a stateless preview popup: a board with an active evaluation bar the user steps through with the keyboard, an instruction line, and an X to close. Opening the preview also sends the whole line (UCI + engine output) to the LLM, which returns critical-move insights that pop up as a balloon when that move is reached and stay until the next/previous move.
- **Endgame result-oriented analysis.** In Endgame mode the LLM receives every engine line in UCI form together with its numeric evaluation and reasons over those numbers to find the path that wins for the side the user asked about — or, if a win is not available, the path that holds a draw.

## Capabilities

### New Capabilities
- `conversation-mode-detection`: LLM intent-based switching between Analysis/Opening/Middlegame/Endgame, chess-only + age-4–18 guardrails, per-mode chat message assembly (system + user, plus the engine analysis as an assistant message in Analysis mode), and status-bar reflection of the active mode.
- `middlegame-analysis-mode`: a Middlegame mode entered from Analysis only after ≥20 plies, answering strategic/tactical middlegame questions via the middlegame agent.
- `engine-mode-tuning`: per-mode engine option configuration — raise the `MultiPV` clamp to allow ≥10 lines and enable exploration options in deep modes.
- `novelty-line-detection`: classify a line as novel from a persisted games-database-derived index (move rarely/never played from the position, yet engine-approved), built by a background job when a games database is imported but unindexed, and flag novel lines with an icon.
- `line-preview-popup`: a play icon on each engine line opens a stateless preview board with an active evaluation bar, keyboard-only navigation, instruction text, and an X close; opening it requests LLM critical-move insights for the line that surface as move-anchored balloons.

### Modified Capabilities
- `deep-analysis-mode`: deep analysis returns ≥10 lines (via the raised MultiPV clamp) and marks novel lines with an icon.
- `opening-training-agent`: entry is driven by classified conversation intent, and its engine lines use the deep-line tuning and novelty flagging.
- `endgame-training-agent`: entry is driven by classified conversation intent, and the endgame analysis reasons over the engine's numeric line evaluations to steer toward a win (else a draw) for the requested side.

## Impact

- Main process: `electron/main.ts` (classify → assemble messages → route by mode; pass mode-specific engine options), `electron/agentPrompts.ts` (guardrail system prompt for 4–18 and chess-only; endgame result-oriented prompt), `electron/openingAgent.ts`, `electron/middlegameAgent.ts`, `electron/endgameAgent.ts`.
- Engines: `electron/engines/StockfishEngine.ts`, `electron/engines/LC0Engine.ts`, `electron/engines/IChessEngine.ts` — raise the MultiPV clamp and add per-mode exploration options (see design for Stockfish vs Lc0 option mapping).
- Renderer: `src/App.tsx` (ply-count gating for Middlegame, mode state, MultiPV wiring), `src/components/AppStatusBar.tsx` (already renders modes; reports the novelty-index background job), inline analysis line rendering for the novelty icon and the play icon, a new stateless line-preview popup component (board + eval bar + insight balloons), `src/utils/twoStepLLMProcessing.ts` (align renderer classifier with the intent categories or defer to the main-process classifier).
- Data / main process: a persisted novelty index derived from the games database (new table/store + background build job) alongside the existing `better-sqlite3` games database; an LLM insight call for the previewed line.
- Reference: engine option semantics come from the Stockfish UCI docs and the Lc0 options wiki (linked in design.md).
- No new runtime dependencies. Age guardrail uses 4–18, consistent with the wider project copy.
