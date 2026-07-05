## Context

The app already has the building blocks: an intent classifier (`CLASSIFIER_SYSTEM_PROMPT` / `CLASSIFIER_RESPONSE_FORMAT` in `electron/agentPrompts.ts` with categories including `OPENING_TRAINING`, `MIDDLEGAME_ANALYSIS`, `ENDGAME_TRAINING`), agents (`openingAgent.ts`, `middlegameAgent.ts`, `endgameAgent.ts`), structured response formats, per-mode conversation memory, and a status bar (`AppStatusBar.tsx`) whose leftmost pill already renders all modes. The gaps are integration and tuning:

1. Mode switching is not consistently wired from the classifier through to the active mode + status bar, and the chat request is not assembled per the "system + user (+ analysis-as-assistant only in Analysis mode)" rule.
2. Both engine adapters clamp `MultiPV` to `Math.min(4, multiPv)` (`StockfishEngine.ts:41`, `LC0Engine.ts:65`), so 10+ lines is impossible today.
3. No exploration/novelty options are set; there is no novelty detection or icon.
4. The endgame agent does not yet feed the LLM the engine's numeric line evaluations for result-oriented reasoning.

Constraints from project rules: main process owns classification (PASS 1) and routing; renderer passes FEN and must not duplicate classification; exactly one LLM pipeline per user message; child-appropriate content; relative web asset paths.

## Goals / Non-Goals

**Goals:**
- Reliable intent-based switching across Analysis / Opening / Middlegame / Endgame with a chess-only, age-4–18 guardrail applied to every request.
- Correct chat message assembly per mode.
- Middlegame mode gated to ≥20 plies.
- Engines return ≥10 lines and are tuned for exploration in deep modes.
- Novel lines flagged from a persisted games-database index, built by a background job when needed.
- A stateless line-preview popup (isolated board + eval bar + keyboard nav + LLM critical-move insight balloons).
- Endgame analysis that reasons over numeric line evaluations toward a win, else a draw.

**Non-Goals:**
- No new engines or LLM providers; no new runtime dependencies.
- Not rewriting the existing agents' output schemas or conversation-memory design.
- Not changing ordinary (non-deep) Analysis behavior or its default MultiPV.
- Not building an opening/endgame theory database from scratch — novelty is derived from the already-imported games database.
- The preview popup board is display-only (stateless); it is not a second interactive analysis surface and does not run its own deep analysis.

## Decisions

- **Single source of truth for classification = main process.** Keep the `CLASSIFIER_SYSTEM_PROMPT` in `electron/main.ts`/`agentPrompts.ts` as PASS 1. The renderer's `twoStepLLMProcessing.ts` classifier is aligned to (or defers to) the same category set to avoid divergence; the renderer only sends FEN + message and receives the resolved mode. This honors the "main process owns classification" rule and prevents the keyword-based drift the current renderer prompt has.

- **Guardrail as a shared system-prompt prefix.** A single guardrail block ("only chess; content suitable for ages 4–18; decline/redirect otherwise") is prepended to every agent's system prompt so the constraint cannot be bypassed by any single mode. This is centralized in `agentPrompts.ts` and matches the project-wide 4–18 audience.

- **Chat message assembly.** In Analysis mode, when engine analysis exists for the current FEN, include it as an `assistant` message before the user message (so the LLM answers grounded in the engine's lines); in Opening/Middlegame/Endgame, send only system + user. This matches the requested flow and keeps token usage down off-analysis.

- **Middlegame gate = 20 plies.** Ply count is derived from `playedMoves.length` in the renderer and passed to the classifier/router as context; the classifier may only resolve `MIDDLEGAME_ANALYSIS` when `plies >= 20`, otherwise a middlegame-flavored question resolves to `ANALYSIS`.

- **Raise the MultiPV clamp.** Change both adapters from `Math.min(4, multiPv)` to a higher cap (e.g. `Math.min(32, multiPv)`); both engines document `MultiPV` up to 500, so 32 is a safe, resource-bounded ceiling. Deep/Opening/Endgame modes request ≥10.

- **Per-engine exploration mapping** (from the linked docs). Applied only in deep modes and reset afterward:
  - **Stockfish** (https://official-stockfish.github.io/docs/stockfish-wiki/UCI-&-Commands.html): Stockfish has no "creativity" knob for full-strength play — its variety comes from `MultiPV`. So deep modes raise `MultiPV` (≥10), and optionally set `Hash`/`Threads` higher for depth. We do **not** use `Skill Level`/`UCI_LimitStrength` (those weaken the engine and pick objectively inferior moves — wrong for surfacing *sound* novelties).
  - **Lc0** (https://lczero.org/dev/wiki/lc0-options/): widen the search with `PolicyTemperature` (raise above the 2.20 default so candidate priors flatten) and `CPuct` (raise above 3.0 for more exploration). Do **not** enable `DirichletNoise`/`--noise` or `Temperature` for played analysis — the docs note noise explores known-bad moves and temperature adds randomness, which would surface unsound lines. `VerboseMoveStats` may be enabled to read per-move Q/N/P when needed.

- **Novelty detection = out-of-games-database ∧ engine-approved, via a persisted index.** A line is "novel" when its first move is rarely/never played from the current position in the imported games database (below a frequency threshold) **and** its evaluation is within a threshold of the best line (e.g. ≤ 50 cp, or a small win-probability delta for Lc0). To make this fast, a **novelty index** (position hash → { move → frequency }) is precomputed from the games database and persisted (a new `better-sqlite3` table alongside the games DB). Lookups hit the index, not a full scan.
  - **Background build job.** Novelty requires an imported games database. If the games DB exists but the index has not been built (or is stale relative to the DB), a background job builds it without blocking the UI and reports progress through the existing status-bar background-slot mechanism (like OTB import). If no games DB is imported, novelty is unavailable and no icons show.
  - **Position key.** Use a canonical key (side-to-move-normalized FEN or a Zobrist-style hash) so transpositions match. Frequency threshold and eval threshold are single tunable constants. Rendered with a small icon (e.g. a lightbulb/spark) on the line row, reused across deep/opening/middlegame/endgame.

- **Stateless line-preview popup.** A play icon on each line row opens a modal that renders the line on an isolated board instance seeded from the line's start FEN — it never touches `currentFen`, `playedMoves`, or the selected line. The popup holds its own local move-index state; forward/back arrow keys walk the line (bounded at ends), and an evaluation bar reflects the current position (from the line's engine evals where available, else a light per-position eval). A top instruction line explains arrow-key navigation; an X in the top-right closes it and returns focus to the analysis panel. On open, the full line (UCI + engine output/evals) is sent to the LLM (guardrailed) asking for insights at the *critical* moves that decide the game; the response is a map of move-index → insight. As the user navigates onto a move with an insight, a balloon renders near the board and persists until the next/previous navigation replaces or clears it.

- **Endgame result-oriented prompt.** The endgame agent builds a prompt containing every engine line as `UCI... = <eval>` (centipawns, or `mate N`, plus Lc0 win% when available) and instructs the LLM to (a) interpret the numbers, (b) pick the winning line for the requested side, (c) fall back to the best drawing line if no win exists, and (d) justify by the evaluations. This reuses the existing MultiPV output; the LLM does the selection/teaching, not raw engine choice.

## Risks / Trade-offs

- [Higher MultiPV + exploration slows each search] → Bound MultiPV at 32, keep exploration options to deep modes only, and reset to defaults for ordinary analysis so interactive eval stays fast.
- [Classifier mis-routes borderline questions] → Rely on the existing KEY RULES ("Opening word alone ≠ OPENING_TRAINING", "Who wins this endgame? → ANALYSIS") and add the 20-ply gate; cover the tricky examples from the request as classifier tests.
- [Novelty false positives/negatives depend on games-DB coverage] → Treat novelty as advisory (an icon), gate on both frequency and eval thresholds (single tunable constants), and require a games DB before showing any icon.
- [Novelty index build is expensive over a large games DB] → Run it as a one-time background job with status-bar progress; persist the index so it is not rebuilt each session; skip cleanly when no games DB exists.
- [Lc0 exploration options vary by build/network] → Set them defensively (ignore unsupported options) and revert on mode exit; Stockfish path relies only on the universally-supported `MultiPV`.
- [Preview popup eval bar may need per-position evaluation] → Prefer the line's existing engine evals; only fall back to a light background eval if needed, and never mutate main-board state.

## Open Questions

- Novelty icon: exact glyph/icon and the precise thresholds (frequency floor; 50 cp vs win% delta) — confirm during implementation.
- Position key for the novelty index: normalized FEN vs a Zobrist hash — pick during implementation for transposition matching and index size.
- Middlegame gate: strictly 20 plies, or "20 plies OR the position is materially past the opening" (ECO exhausted)?

## Resolved Decisions

- **Age range: 4–18** across the app (guardrail and agents), consistent with existing project copy.
- **Novelty source: the imported games database** (not ECO-only), via a persisted index built by a background job; unavailable without a games DB.
