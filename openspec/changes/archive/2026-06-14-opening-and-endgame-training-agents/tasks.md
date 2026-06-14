## 1. Package and Type Setup

- [x] 1.1 Install `@chess-openings/eco.json` via npm and add to `package.json` dependencies
- [x] 1.2 Verify the package is included in `electron-builder` files / extraResources so it bundles into the Electron app
- [x] 1.3 Add `"Opening"` and `"Endgame"` to the `ResponseType` union in `src/types/index.ts`
- [x] 1.4 Add `"opening"` and `"endgame"` as valid mode keys in the conversation memory type definitions
- [x] 1.5 Add IPC channel types for `"opening:ask"` and `"endgame:ask"` to `IpcPayloads` and `IpcResponses` in `src/types/index.ts`

## 2. ECO Library Integration (Main Process)

- [x] 2.1 Add a try/catch startup import of `@chess-openings/eco.json` in `electron/main.ts`; log a warning and set a `null` fallback if the package is missing
- [x] 2.2 Implement `lookupOpeningByFen(fen: string): { eco: string; name: string } | null` helper using the loaded `findOpening` function
- [x] 2.3 Implement `lookupOpeningByMoves(moves: string[], startFen?: string): { eco: string; name: string } | null` helper using `chess.js` and repeated `lookupOpeningByFen` calls
- [x] 2.4 Write unit tests for both helpers in `electron/ecoLookup.test.ts` covering: known opening FEN, unknown FEN, multi-move progressive lookup, empty moves array, and graceful null when package is unavailable

## 3. Opening Training Agent

- [x] 3.1 Create `electron/openingAgent.ts` with `handleOpeningRequest(message, provider, model, conversationHistory)` function
- [x] 3.2 Write the opening-agent system prompt: children's coach persona, structured JSON response format (`moves`, `eco_code`, `opening_name`, `story`, `explanation`), 2–4 sentences per move, 15-move cap, famous-game story requirement
- [x] 3.3 Call `lookupOpeningByMoves` for the requested opening's first few moves and inject the resolved ECO code and name into the LLM prompt
- [x] 3.4 Parse and validate the LLM response: ensure `moves` is an array; validate each UCI move with `chess.js`; skip invalid moves with a warning log
- [x] 3.5 Register `ipcMain.handle("opening:ask", ...)` in `electron/main.ts` that calls `handleOpeningRequest` with provider + timeout rules (300 s reasoning / 120 s cloud / 60 s Ollama)
- [x] 3.6 Expose `openingAsk` on the preload bridge in `electron/preload.ts`
- [x] 3.7 Write unit tests in `electron/openingAgent.test.ts`: system prompt includes ECO context, JSON is validated, invalid UCI moves are skipped, ECO null case degrades gracefully

## 4. Endgame Training Agent

- [x] 4.1 Create `electron/endgameAgent.ts` with `handleEndgameRequest(message, provider, model, conversationHistory)` function
- [x] 4.2 Write the endgame-agent system prompt: children's coach persona, position-generation instructions, structured JSON response format (`fen`, `moves`, `story`, `explanation`), zugzwang/opposition/key-square vocabulary, named endgame principles
- [x] 4.3 Validate the `fen` field in the LLM response using `chess.js` before use; return an error payload if the FEN is invalid
- [x] 4.4 Validate each UCI move in the `moves` array against the generated FEN using `chess.js`; skip invalid moves
- [x] 4.5 Register `ipcMain.handle("endgame:ask", ...)` in `electron/main.ts` with the same provider + timeout rules
- [x] 4.6 Expose `endgameAsk` on the preload bridge in `electron/preload.ts`
- [x] 4.7 Write unit tests in `electron/endgameAgent.test.ts`: FEN validation rejects invalid FEN, invalid UCI moves are skipped, story field is present in system prompt instructions

## 5. PASS 1 Classifier Extension

- [x] 5.1 Add regex pre-screen heuristics for `opening_training` and `endgame_training` intents in `electron/main.ts` (runs before LLM PASS 1 call for clear-signal messages)
- [x] 5.2 Extend the LLM PASS 1 classifier prompt to include `"opening_training"` and `"endgame_training"` as explicit candidate labels for ambiguous messages
- [x] 5.3 Add routing branches in the main IPC question handler: `"opening_training"` → `handleOpeningRequest`; `"endgame_training"` → `handleEndgameRequest`
- [x] 5.4 Write classifier unit tests in `electron/classifier.test.ts`: 6 test cases covering the two positive intents, negative (analysis), and negative (puzzle) as specified in the analysis-and-llm-guidance spec

## 6. Games Database ECO Annotation

- [x] 6.1 In the game-loading IPC handler in `electron/main.ts`, call `lookupOpeningByMoves` with the game's PGN move list after the game row is fetched from the database
- [x] 6.2 Attach `eco_code` and `opening_name` to the game payload sent to the renderer; fall back to the database `opening` column value if ECO lookup returns null
- [x] 6.3 Display the ECO code and opening name in `src/components/PlayerBar.tsx` or a dedicated game-header row; clear it when the board is reset

## 7. Renderer: trainingMoves State and Navigation

- [x] 7.1 Add `trainingMoves: Array<{ uci: string; san: string; commentary: string }>` and `trainingMoveIndex: number` state to `App.tsx`; initialise to `[]` and `-1`
- [x] 7.2 Add `trainingStartFen: string` state to `App.tsx`; set it when an Opening or Endgame response is received
- [x] 7.3 When an `"Opening"` or `"Endgame"` response is received, populate `trainingMoves`, reset `trainingMoveIndex` to `-1`, and set `trainingStartFen` to the response `fen` (or starting position for Opening)
- [x] 7.4 Extend the keyboard handler in `App.tsx`: when `responseType === "Opening"` or `"Endgame"` and `trainingMoves.length > 0`, route left/right arrow keys to the training navigator instead of puzzle or analysis navigators
- [x] 7.5 Left arrow: increment `trainingMoveIndex`, replay moves 0…index from `trainingStartFen`, display `trainingMoves[index].commentary` in the chat area
- [x] 7.6 Right arrow: decrement `trainingMoveIndex` (floor at -1), revert board to replayed position; at index -1 return to `trainingStartFen`
- [x] 7.7 Ensure training navigation does not fire when the chat input TextField has focus (existing guard should cover this; verify and add if missing)

## 8. Renderer: Conversation Memory for Training Modes

- [x] 8.1 Update `deriveConversationMode` in `App.tsx` to map `"Opening"` → `"opening"` and `"Endgame"` → `"endgame"`
- [x] 8.2 Add a `useEffect` that clears `conversation-opening.json` and resets in-memory history when a new opening training session starts (analogous to the puzzle conversation reset on `puzzleStartFen` change)
- [x] 8.3 Add a `useEffect` that clears `conversation-endgame.json` and resets in-memory history when a new endgame training session starts
- [x] 8.4 Verify that the conversation:load / conversation:save IPC handlers in `electron/main.ts` accept `"opening"` and `"endgame"` as valid mode keys (the sanitise regex `[^a-z0-9-]` already permits them — confirm with a test)

## 9. Preload and ElectronAPI Types

- [x] 9.1 Add `openingAsk` and `endgameAsk` method signatures to the `ElectronAPI` interface in `src/types/index.ts`
- [x] 9.2 Confirm `window.electronAPI.openingAsk` and `endgameAsk` are callable from `App.tsx` without TypeScript errors

## 10. Integration and Manual QA

- [x] 10.1 Test opening training end-to-end: type "Teach me the Ruy Lopez", verify board updates to starting position, ECO label appears, arrow keys step through moves with commentary
- [x] 10.2 Test endgame training end-to-end: type "Show me a King and Pawn endgame", verify board updates to the generated FEN, arrow keys step through the technique with commentary
- [x] 10.3 Test games database ECO annotation: load a game with a known opening (e.g., Ruy Lopez), verify the ECO label appears in the game header
- [x] 10.4 Test conversation memory isolation: ask an analysis question, then start opening training, then return to analysis — each mode should show only its own conversation history
- [x] 10.5 Test provider adherence: with Anthropic configured, verify opening and endgame agents use Anthropic and do not fall back to Ollama
- [x] 10.6 Test invalid FEN handling: simulate an endgame response with a broken FEN — board must not change and an encouraging error message must appear
- [x] 10.7 Verify all new unit tests pass: `ecoLookup.test.ts`, `openingAgent.test.ts`, `endgameAgent.test.ts`, `classifier.test.ts`
