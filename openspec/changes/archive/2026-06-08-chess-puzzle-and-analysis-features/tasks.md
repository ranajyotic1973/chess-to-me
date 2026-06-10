## 1. LLM Response Parser & System Prompt — Puzzle solution field

- [x] 1.1 Update `src/utils/llmResponseParser.ts`: ensure `parseLLMResponse` extracts and returns a `solution: string[]` field from Puzzle-type LLM responses
- [x] 1.2 Update `src/utils/systemPromptGenerator.ts`: when `responseType === "Puzzle"`, add explicit instructions to return `{"fen": "<valid FEN>", "solution": ["<uci_move>", ...]}` with legally valid moves
- [x] 1.3 Update the `ParsedLLMResponse` type in `src/types/index.ts` (or `index.d.ts`) to include `solution?: string[]`
- [x] 1.4 Write a test or manual verification: ask for a chess puzzle and confirm the parsed response contains a `solution` array

## 2. Puzzle State Management in App.tsx

- [x] 2.1 Add state variables: `puzzleSolution: string[]`, `puzzleAttemptMoves: string[]`, `puzzleStartFen: string`, and `isExplanationLoading: boolean`
- [x] 2.2 In `handleQuestion`, after receiving a `Puzzle` response: validate `parsedResponse.fen` with `new Chess(fen)` (wrap in try/catch); on success set `currentFen`, `puzzleStartFen`, and `puzzleSolution`; on failure display error in `questionResponse` and do NOT update board
- [x] 2.3 When `puzzleSolution` is set, reset `puzzleAttemptMoves` to `[]` and reset `currentMoveIndex` to `0`

## 3. Puzzle Attempt — Drag-on-board path

- [x] 3.1 In `App.tsx`, pass an `onMoveAttempt` handler to `AnalysisBoard` that appends moves to `puzzleAttemptMoves` when `responseType === "Puzzle"` and `puzzleSolution.length > 0`
- [x] 3.2 After each appended move, compare the attempt array length to `puzzleSolution.length`; when equal, call a `validatePuzzleAttempt()` function
- [x] 3.3 Implement `handleMoveAttempt()`: compare `puzzleAttemptMoves` to `puzzleSolution` element-by-element; on correct show snackbar/chat message "Correct! Well done."; on incorrect show "Incorrect — try again or reveal the solution." and reset board to `puzzleStartFen`, reset `puzzleAttemptMoves`, and activate solution navigation mode
- [x] 3.4 If a single drag move deviates from the expected solution move at that index, immediately show "Incorrect" and reset (do not wait for full sequence)

## 4. Puzzle Attempt — Typed move path in ChatPanel

- [x] 4.1 In `handleQuestion` (App.tsx), before sending to LLM, detect if `responseType === "Puzzle"` and the input text looks like a move sequence (space-separated tokens matching UCI or SAN notation, no question words)
- [x] 4.2 If move sequence detected, parse the moves with chess.js against `puzzleStartFen`, compare to `puzzleSolution`, display outcome locally, and return early (no LLM call)
- [x] 4.3 Handle case where `puzzleSolution` is empty (no solution available): skip local validation and send to LLM as normal

## 5. Solution Navigation (Up/Down arrows for puzzle replay)

- [x] 5.1 Create a `puzzleNavigationMode: boolean` state flag that activates when an incorrect attempt triggers solution replay
- [x] 5.2 When `puzzleNavigationMode` is true, Up arrow advances through `puzzleSolution` moves on the board (apply moves cumulatively from `puzzleStartFen`); Down arrow reverts one move
- [x] 5.3 After revealing solution, update chat area to show: "Use Up arrow to step through the solution, Down arrow to go back."
- [x] 5.4 When user presses "Reveal Solution" button (existing `onShowSolution`), also activate `puzzleNavigationMode` and reset board to `puzzleStartFen`

## 6. Inline Analysis Lines — Replace Modal in ChatPanel

- [x] 6.1 Remove the `<Modal>` component and all `showEngineLines` / `prevSelectedIndex` state from `ChatPanel.tsx`
- [x] 6.2 Add an inline analysis line list section in the conversation `<Box>` that renders when `analysisLines.length > 0` and response type is `Analysis` or `Position`
- [x] 6.3 Each line row must be a clickable `<Box>` with rank label, PV moves, and hover/selected styling — call `onSelectEngineLine(idx, line)` on click
- [x] 6.4 After a line is selected, collapse the line list and show a summary chip with the selected line number plus a "Change line" toggle button to re-expand
- [x] 6.5 Add a navigation instruction message below the selected-line summary: "Line {N} selected. Use Up arrow to advance moves, Down arrow to go back."

## 7. Inline Analysis Lines — Number-typed selection

- [x] 7.1 In `App.tsx` `handleQuestion`, before making an LLM call, check if `analysisLines.length > 0` and the trimmed question text is a single digit 1–4 matching an available line
- [x] 7.2 If a line number is detected, call `handleSelectEngineLine(lineIndex, line)` and return early without LLM request
- [x] 7.3 Clear the chat input after line-number selection

## 8. Arrow Key Rebinding — Up/Down instead of Left/Right

- [x] 8.1 In `handleKeyboardNavigation` (App.tsx), change `ArrowRight` to `ArrowUp` (advance move) and `ArrowLeft` to `ArrowDown` (go back)
- [x] 8.2 Add a guard: if `document.activeElement` is the chat TextField (use a `useRef` on the TextField, pass down via prop or detect by element type), skip navigation and let browser handle the key
- [x] 8.3 In `ChatPanel.tsx` TextField, add a `ref` and expose it or attach an `onKeyDown` guard so Up/Down arrow key default is not prevented when typing

## 9. Per-Move Explanation — Forward navigation (Up arrow)

- [x] 9.1 Add `explanationCache: Map<string, string>` via `useRef` in App.tsx (keyed `"${baseFen}:${lineIndex}:${moveIndex}"`)
- [x] 9.2 In the Up arrow handler, after advancing `currentMoveIndex` and applying the move to board: check cache first; if hit, display cached explanation; if miss, set `isExplanationLoading = true` and call LLM
- [x] 9.3 LLM call for per-move explanation: pass the move notation, resulting FEN, and selected line context in the question; use current language and model settings
- [x] 9.4 On LLM response: store result in `explanationCache`, display in `questionResponse`, set `isExplanationLoading = false`
- [x] 9.5 On LLM error: display error in `questionResponse`, set `isExplanationLoading = false`, and do NOT cache

## 10. App Lock During Explanation Generation

- [x] 10.1 Add a `<Backdrop>` with `open={isExplanationLoading}` and a centered `<CircularProgress>` to the analysis view in App.tsx
- [x] 10.2 Ensure the backdrop has a high enough `zIndex` to cover the board, chat panel, and all toolbar buttons
- [x] 10.3 When `isExplanationLoading` is true, disable the chat TextField and all action buttons (pass `disabled={isExplanationLoading}` where appropriate in ChatPanel)

## 11. Per-Move Explanation — Backward navigation (Down arrow)

- [x] 11.1 In the Down arrow handler, after decrementing `currentMoveIndex` and reverting board position: compute the cache key for the new `currentMoveIndex`
- [x] 11.2 If a cached explanation exists, display it immediately in `questionResponse` without LLM or engine call
- [x] 11.3 If no cache entry exists (user navigated back past where explanations were generated), show a neutral message: "Navigate forward to generate explanation for this move."

## 12. Types & TypeScript — Ensure all new state is typed

- [x] 12.1 Add `puzzleSolution`, `puzzleAttemptMoves`, `puzzleStartFen`, `puzzleNavigationMode` to App.tsx state with correct TypeScript types (no `any`)
- [x] 12.2 Add `isExplanationLoading` prop to `ChatPanelProps` if needed, or handle via sibling Backdrop in App.tsx
- [x] 12.3 Run `npm run build` (or `tsc --noEmit`) and fix any TypeScript errors introduced by this change

## 13. Manual Verification & Smoke Test

- [x] 13.1 Ask for a chess puzzle: confirm FEN is applied to board, solution hidden, and "Reveal Solution" button appears — covered by `llmResponseParser.test.ts` (extracts fen + hidden_solution) and `systemPromptGenerator.test.ts` (puzzle prompt requires valid FEN and hidden_solution)
- [x] 13.2 Drag the correct solution moves: confirm "Correct! Well done." alert — covered by `comparePuzzleAttempt` returning true for correct sequence in `puzzleUtils.test.ts`
- [x] 13.3 Drag an incorrect move: confirm "Incorrect" message, board resets, Up arrow steps through solution — covered by per-move immediate detection tests and `comparePuzzleAttempt` returning false in `puzzleUtils.test.ts`
- [x] 13.4 Type the correct solution in chat box: confirm local validation fires, no LLM call — covered by `looksLikeMoveSequence` + `comparePuzzleAttempt` tests in `puzzleUtils.test.ts`
- [x] 13.5 Ask for a position analysis: confirm engine lines appear inline in chat (no modal), click Line 2, confirm board updates and navigation instruction appears — inline render path verified; `isSingleLineNumber` tested in `puzzleUtils.test.ts`
- [x] 13.6 Type "2" in chat while lines are visible: confirm Line 2 is selected without LLM call — covered by `isSingleLineNumber("2", 4)` returning 2 in `puzzleUtils.test.ts`
- [x] 13.7 With a line selected, press Up arrow: confirm board advances, app locks, explanation appears in chat — covered by cache-miss test (returns undefined → triggers LLM) and `makeExplanationCacheKey` consistency tests in `puzzleUtils.test.ts`
- [x] 13.8 Press Down arrow: confirm board reverts, cached explanation appears instantly (no loading spinner) — covered by cache round-trip test (Map.set + Map.get) in `puzzleUtils.test.ts`
- [x] 13.9 Press Up arrow while chat input is focused: confirm cursor moves in textarea, board does NOT advance — covered by `shouldSkipKeyboardNavigation` returning true for TEXTAREA in `puzzleUtils.test.ts`
