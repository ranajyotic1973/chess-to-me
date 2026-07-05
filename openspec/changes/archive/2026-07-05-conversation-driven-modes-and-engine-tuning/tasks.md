## 1. Conversation mode detection & guardrails

- [x] 1.1 Add a shared chess-only, age-4–18 guardrail block and prepend it to every agent system prompt (`electron/agentPrompts.ts` `CHILD_SAFE_GUARDRAIL`/`withGuardrail`; applied in opening/middlegame/endgame agents)
- [x] 1.2 PASS 1 classification (main process) resolves Analysis/Opening/Middlegame/Endgame from intent and now applies ply-gated `resolveMode` (`electron/main.ts`, `electron/modeRouting.ts`); renderer defers to the main-process classifier
- [~] 1.3 Assemble the LLM request per mode: always system + user; analysis path passes engine `lines` as context, agents send only system + user. (Existing analysis handler includes lines; strict "assistant message" restructure deferred — behavior satisfies the intent.)
- [x] 1.4 Resolved mode flows to app state via each handler's `response_type`, which `AppStatusBar` already renders (verified existing wiring)
- [~] 1.5 Classifier intent is LLM-driven (covered by integration mock); the deterministic gating logic is unit-tested in `electron/modeRouting.test.ts`

## 2. Middlegame mode (20-ply gate)

- [x] 2.1 Compute ply count (`pliesFromFen`) and gate `MIDDLEGAME_ANALYSIS` to ≥20 plies via `resolveMode` (`electron/main.ts`, `electron/modeRouting.ts`, `src/App.tsx` passes `plies`)
- [x] 2.2 Middlegame questions route to `electron/middlegameAgent.ts` with the guardrail prompt
- [x] 2.3 Unit tests: middlegame resolves to Analysis before 20 plies and Middlegame at/after 20 (`electron/modeRouting.test.ts`, 4 tests)

## 3. Engine tuning: MultiPV + exploration

- [x] 3.1 Raise the MultiPV clamp from max 4 to max 32 in both adapters (`electron/engines/StockfishEngine.ts`, `electron/engines/LC0Engine.ts`) — via pure `electron/engines/engineTuning.ts` (`clampMultiPv`, `MAX_MULTIPV=32`)
- [x] 3.2 Request MultiPV ≥ 10 + `explore` in deep analysis; keep the small default for ordinary Analysis. Fixed the second hard clamp in `performAnalysis` (main.ts:1586 `min(4,…)` → `clampMultiPv`) that capped lines before the engine; threaded `explore` through `analyzePosition`→`performAnalysis`→`ProcessManager.analyze`→engine; App passes `explore: advanced||deep`
- [x] 3.3 Apply per-engine exploration options in deep modes and reset them on exit — Lc0: raise `PolicyTemperature`/`CPuct` (no DirichletNoise/Temperature); Stockfish: MultiPV-only (`electron/engines/*`, `electron/engines/IChessEngine.ts`) — engine layer done via `explorationOptions` + new `explore` param on `AnalysisParams`; caller passes the flag in the mode-routing slice
- [x] 3.4 Unit tests: clamp allows ≥10; exploration options are set in deep modes and reverted for plain analysis (`electron/engines/engineTuning.test.ts`, 8 tests)

## 4. Novelty detection from the games database

- [x] 4.1 Persisted **opening-line index** (`opening_lines` table: `line_hash → plies, freq, eco, name`) in `electron/noveltyIndex.ts`. Each game's opening (up to `NOVELTY_MAX_PLIES=40` plies) is walked and every move-prefix is SHA-1 hashed (`hashLine`) so a candidate line matches in O(1) instead of move-by-move. Openings identified via the bundled `eco.json` (`lookupOpeningByFen`, injected).
- [x] 4.2 **Non-blocking** build: `buildOpeningIndex` runs in-process but cooperatively — commits small (250-game) batches and `await`s `setImmediate` between them so the UI/engine IPC stay responsive. Fired by `maybeBuildNoveltyIndex` (`main.ts`) on games import and at startup when missing/stale; progress streamed to `db:progress` (phase `novelty`). Skips entirely when no games DB exists. (An Electron `utilityProcess` was tried first but the native SQLite addon cannot be `dlopen`'d in a child process — `ERR_DLOPEN_FAILED` — so the build stays in the main process where better-sqlite3 already loads.)
- [x] 4.3 Pure predicate `isNovelLine(lineFreq, evalLossCp)` — rare (below `NOVELTY_FREQ_FLOOR`) AND sound (within `NOVELTY_EVAL_CP` of best) (`electron/noveltyIndex.ts`)
- [x] 4.4 `novel?: boolean` on `AnalysisLine` (`src/types/index.ts`); `tagNovelLines(db, playedMoves, lines)` keys novelty on the **played-move path + candidate first move** and is applied in `performAnalysis`. `playedMoves` threaded renderer→IPC (`analyzePosition` payload, `App.tsx` `playedMovesRef`).
- [x] 4.5 Spark icon (`data-testid="novelty-icon"`) rendered on novel lines via the `SelectableList` badge in `ChatPanel.tsx` (reused across all modes that list engine lines)
- [x] 4.6 Unit tests (`electron/noveltyIndex.test.ts`, 16 tests): `hashLine` stability/prefix-sensitivity, predicate (frequent=not novel, rare+sound=novel, rare+unsound=not novel), line-prefix build/frequency, ECO labelling, played-path keying, past-opening-window, and novelty unavailable without a built index / games DB. Integration: `tests/integration/novelty-icon.spec.ts`.

## 4b. Line preview popup

- [x] 4b.1 Play icon (`data-testid="preview-line"`) added at the end of each engine line row via the `SelectableList` badge (`ChatPanel.tsx`, `onPreviewLine`)
- [x] 4b.2 Stateless preview popup `LinePreviewPopup.tsx`: isolated read-only board (`MiniBoard.tsx`, seeded from the line start), `EvalBar`, top instruction text, X close button; opens via App state and never mutates `currentFen`/`playedMoves`/selected line
- [x] 4b.3 Keyboard-only forward/back navigation bounded at both ends (no dragging/editing); positions from pure `src/utils/linePreview.ts` (unit-tested)
- [x] 4b.4 On open, sends the full line (UCI + eval) to the LLM (guardrailed `LINE_INSIGHTS_SYSTEM_PROMPT`) via new `llm:line-insights` IPC (`main.ts`, `preload.ts`, types) requesting critical-move insights keyed by move index
- [x] 4b.5 Insights render as a move-anchored balloon (`data-testid="preview-insight"`) shown while that move is displayed and replaced/cleared on navigation
- [x] 4b.6 Integration test `tests/integration/line-preview.spec.ts`: preview opens, arrow keys navigate, main board unchanged, X closes

## 5. Endgame result-oriented analysis

- [x] 5.1 Result-oriented `ENDGAME_RESULT_SYSTEM_PROMPT` + `formatEndgameLines` render every engine line as `UCI... = <eval>` (cp / mate / win%) and instruct win-for-requested-side, else best draw, justified by evals (`electron/endgameAgent.ts`)
- [x] 5.2 `handleEndgameRequest` takes an `EndgameContext` (fen, side, lines); both call sites in `electron/main.ts` (classifier `ENDGAME_TRAINING` and `endgame:ask`) pass the current FEN + MultiPV lines and derive the side via `sideToMoveFromFen`. Caller FEN is trusted over the model's echo.
- [x] 5.3 Unit tests (`electron/endgameAgent.test.ts`, +9 tests): prompt includes lines+evals; `selectEndgameLine` prefers a winning line (white/black) and falls back to the best drawing line when no win exists

## 6. Verification

- [x] 6.1 `npm test` passes (unit) — 36 suites, 625 tests
- [x] 6.2 `npm run test:integration` passes — 32 tests; added `tests/integration/novelty-icon.spec.ts` (novel flag → spark icon display); mode-switch/status coverage in `mode-response-render.spec.ts`
- [x] 6.3 `npm run build` succeeds (vite + electron tsc; utility-process worker `openingIndexWorker.js` compiled + flattened into `electron/dist/`)
- [x] 6.4 `graphify update .` refreshed the graph (4928 nodes, 5207 edges)
