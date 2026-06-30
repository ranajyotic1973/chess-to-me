# Redux Implementation Checklist

## Phase 1: Store Setup (1–2 days)

### boardSlice
- [ ] Create `src/store/slices/boardSlice.ts`
  - [ ] State: `currentFen`, `selectedSquare`, `moveHistory`
  - [ ] Actions: `setCurrentFen`, `selectSquare`, `addMove`, `resetBoard`, `loadFen`
  - [ ] Selectors: `selectCurrentFen`, `selectSelectedSquare`, `selectMoveCount`, `selectIsStartPosition`
  - [ ] Tests: verify FEN validation, move history append

### analysisSlice
- [ ] Create `src/store/slices/analysisSlice.ts`
  - [ ] State: `lines`, `entries`, `selectedLineIndex`, `selectedLineBaseFen`, `currentMoveIndex`, `explorationStack`, `explanations`, `deepAnalysisResults`
  - [ ] Actions: `setAnalysisLines`, `setAnalysisEntries`, `selectEngineLine`, `deselectEngineLine`, `incrementMoveIndex`, `decrementMoveIndex`, `setMoveIndex`, `pushExplorationFrame`, `popExplorationFrame`, `setLineExplanation`, `setDeepAnalysisResult`, `clearAnalysis`
  - [ ] Selectors: (see architecture doc)
  - [ ] Tests: exploration stack LIFO, explanation caching, move index bounds

### uiSlice
- [ ] Create `src/store/slices/uiSlice.ts`
  - [ ] State: loading flags, navigation, dialogs, messages, window size, logs, agent statuses
  - [ ] Actions: setters for all fields
  - [ ] Selectors: `selectAnalysisLoading`, `selectStatusMessage`, `selectWindowSize`, `selectIsAnyLoading`
  - [ ] Tests: window resize updates, loading flag combinations

### engineSlice
- [ ] Create `src/store/slices/engineSlice.ts`
  - [ ] State: `engineStatus`, `systemStatus`, `availableEngines`, `engineWarming`, `engineAnalyzing`, `appLoading`, `settingsLoaded`
  - [ ] Actions: setters
  - [ ] Selectors: `selectEngineStatus`, `selectIsEngineConfigured`, `selectSelectedEngine`, `selectIsPlatformReady`
  - [ ] Tests: engine status transitions, platform ready logic

### settingsSlice
- [ ] Create `src/store/slices/settingsSlice.ts`
  - [ ] State: `formState`, `llmApiKeyLength`, `settingsSaving`, `conversationHistory`, `gameMemory`
  - [ ] Actions: `setFormField`, `setFormState`, `setConversationHistory`, `setGameMemory`
  - [ ] Selectors: smart selectors like `selectLLMModel(provider)`
  - [ ] Tests: form updates, conversation history management

### puzzleSlice
- [ ] Create `src/store/slices/puzzleSlice.ts`
  - [ ] State: `puzzleStartFen`, `puzzleSolution`, `puzzleSolutionSan`, `puzzleAttemptMoves`, `puzzleNavigationMode`, `puzzleIncorrect`, `showSolution`, `puzzleMeta`, `puzzleExplainLoading`
  - [ ] Actions: `loadPuzzle`, `recordAttemptMove`, `resetAttempt`, `toggleShowSolution`, `clearPuzzle`
  - [ ] Selectors: `selectPuzzleCorrect`, `selectNextExpectedMove`, `selectCurrentPuzzlePosition`
  - [ ] Tests: puzzle load/reset, move validation, navigation mode

### trainingSlice
- [ ] Create `src/store/slices/trainingSlice.ts`
  - [ ] State: `trainingMoves`, `trainingMoveIndex`, `trainingStartFen`, `trainingMoveLabel`
  - [ ] Actions: `loadTraining`, `advanceTrainingMove`, `retreatTrainingMove`, `clearTraining`
  - [ ] Selectors: `selectCurrentTrainingMove`, `selectTrainingPosition`, `selectTrainingProgress`
  - [ ] Tests: move index bounds, FEN derivation

### gameSlice
- [ ] Create `src/store/slices/gameSlice.ts`
  - [ ] State: `gameMode`, `gameList`, `currentGameInfo`, `gamePgnFens`, `gameMoveIndex`, `gameEcoLabel`
  - [ ] Actions: `setGameMode`, `setCurrentGame`, `setGameMoveIndex`, `clearGame`
  - [ ] Selectors: `selectGamePosition`, `selectIsGameLoaded`
  - [ ] Tests: game load, move index bounds

### responseSlice
- [ ] Create `src/store/slices/responseSlice.ts`
  - [ ] State: `responseType`, `responseData`, `questionText`, `questionResponse`, `questionLoading`, `currentOpening`, `analysisEcoLabel`
  - [ ] Actions: `setResponseType`, `setResponseData`, `setQuestionResponse`, `clearResponse`
  - [ ] Selectors: `selectIsAnalysisResponse`, `selectIsPuzzleResponse`, `selectIsTrainingResponse`
  - [ ] Tests: response type validation

### Store Configuration
- [ ] Create `src/store/index.ts`
  - [ ] Import all slices
  - [ ] `configureStore()` with slices and middleware
  - [ ] Export `RootState`, `AppDispatch`, `AppStore` types
  - [ ] Export `setupElectronListeners(store)` function
  - [ ] Tests: store initialization, listener setup

### Custom Hooks
- [ ] Create `src/store/hooks.ts`
  - [ ] `useAppDispatch()` → typed dispatch
  - [ ] `useAppSelector()` → typed selector
  - [ ] `useAppStore()` → typed store access
  - [ ] Tests: hook type safety

### Middleware
- [ ] Create `src/store/middleware/autoDismissMiddleware.ts`
  - [ ] Auto-dismiss `statusMessage` after 2s
  - [ ] Auto-dismiss `analysisStatus` after 2s
  - [ ] Tests: timer firing, message clearing

---

## Phase 2: Async Operations (Thunks) (2–3 days)

### analysisThunks.ts
- [ ] `analyzePositionThunk({engine, fen, depth, multiPv})`
  - [ ] Calls `electronAPI.analyzePosition()`
  - [ ] Validates response
  - [ ] Dispatches `setAnalysisLines` + `setAnalysisEntries`
  - [ ] Handles error → `setAnalysisStatus(error)`
  - [ ] Tests: success path, error handling, aborted request

- [ ] `fetchExplanationsThunk({fen, lines, language, llmProvider, ...})`
  - [ ] Calls `electronAPI.explainLines()`
  - [ ] Dispatches `setLineExplanation` for each line
  - [ ] Tests: batched explanations, partial failures

- [ ] `fetchPerMoveExplanationThunk({lineIndex, line, baseFen, moveIndex, moveSan, ...})`
  - [ ] Single-move explanation for keyboard navigation
  - [ ] Caches result
  - [ ] Tests: caching, explanation text

- [ ] `deepAnalyzeLinesThunk({fen, lines})`
  - [ ] Calls `electronAPI.deepAnalyzeLines()`
  - [ ] Dispatches `setDeepAnalysisResult` for each
  - [ ] Tests: deep analysis parsing

### engineThunks.ts
- [ ] `loadEngineStatusThunk()`
  - [ ] Calls `electronAPI.getEngineStatus()`
  - [ ] Dispatches `setEngineStatus`
  - [ ] Updates `settingsSlice.formState` from loaded settings
  - [ ] Tests: settings hydration

- [ ] `fetchSystemStatusThunk()`
  - [ ] Calls `electronAPI.getSystemStatus()`
  - [ ] Dispatches `setSystemStatus`, `setAvailableEngines`
  - [ ] Tests: engine detection parsing

- [ ] `detectEngineThunk({engine})`
  - [ ] Calls `electronAPI.detectEngine()`
  - [ ] Tests: path validation

- [ ] `browseForEngineThunk({engine})`
  - [ ] Calls `electronAPI.browseForEngine()`
  - [ ] Tests: file selection

- [ ] `setEnginePathThunk({engine, path})`
  - [ ] Calls `electronAPI.setEnginePath()`
  - [ ] Updates `settingsSlice.formState`
  - [ ] Tests: path persistence

- [ ] `detectAllEnginesThunk()`
  - [ ] Detects stockfish + LC0 in parallel
  - [ ] Dispatches `setAvailableEngines`
  - [ ] Tests: parallel detection

### settingsThunks.ts
- [ ] `saveSettingsThunk({...AppSettings})`
  - [ ] Validates LLM config
  - [ ] Calls `electronAPI.setEnginePath()` + `electronAPI.updateAppSettings()`
  - [ ] On success: updates `engineSlice.engineStatus`
  - [ ] On fail: dispatches snackbar error
  - [ ] Tests: validation, persistence, error handling

- [ ] `changeOllamaModelThunk(modelName)`
  - [ ] Calls `electronAPI.setOllamaModel()`
  - [ ] Updates `settingsSlice.formState.ollamaModel`
  - [ ] Tests: model switching

- [ ] `loadConversationHistoryThunk(mode)`
  - [ ] Load from localStorage or IPC
  - [ ] Dispatches `setConversationHistory`
  - [ ] Tests: mode-specific loading

- [ ] `saveConversationHistoryThunk({mode, history})`
  - [ ] Persists to localStorage
  - [ ] Tests: async persistence

- [ ] `loadGameMemoryThunk()`
  - [ ] Dispatches `setGameMemory`

- [ ] `validateLLMSettingsThunk()`
  - [ ] Checks provider, model, API key
  - [ ] Returns `{valid: bool, error?: string}`

### responseThunks.ts
- [ ] `askQuestionThunk({question, fen, lines, language, llmProvider, model, baseUrl, apiKey, ...})`
  - [ ] Dispatches `ui/setQuestionLoading(true)`
  - [ ] Calls `electronAPI.askQuestion()` (PASS 1 + 2)
  - [ ] Parses response type
  - [ ] Based on responseType:
    - [ ] "Puzzle" → dispatches `puzzleSlice.loadPuzzle()`
    - [ ] "Opening/Endgame/Middlegame" → dispatches `trainingSlice.loadTraining()`
    - [ ] "Game/GameList" → dispatches `gameSlice.setCurrentGame()` or `setGameList()`
    - [ ] "Analysis" → dispatches `analyzePositionThunk()` if FEN provided
  - [ ] Dispatches `setResponseData()`, `setQuestionResponse()`, `setResponseType()`
  - [ ] Dispatches `ui/setQuestionLoading(false)`
  - [ ] Tests: all response types, error handling, side effects

- [ ] `ecoLookupThunk(fen)`
  - [ ] Calls `electronAPI.ecoLookupFen()`
  - [ ] Dispatches `setAnalysisEcoLabel()` or `setGameEcoLabel()`
  - [ ] Tests: ECO lookup cache

### puzzleThunks.ts
- [ ] `explainIncorrectMoveThunk({puzzleFen, solutionUci, ..., language, llmProvider, ...})`
  - [ ] Calls `electronAPI.puzzleExplainIncorrect()`
  - [ ] Dispatches `responseSlice.setQuestionResponse(explanation)`
  - [ ] Tests: explanation generation

---

## Phase 3: Refactor App.tsx (2–3 days)

### Selector Integration
- [ ] Replace all `useState` hooks with `useSelector` calls (one slice at a time)
- [ ] Remove Redux-managed props from component signatures
- [ ] Verify selectors return expected data
- [ ] Tests: selector output matches old state values

### Dispatch Integration
- [ ] Replace `setCurrentFen` with `dispatch(board.actions.setCurrentFen(fen))`
- [ ] Replace `runAnalysis()` with `dispatch(analyzePositionThunk(...))`
- [ ] Replace `setFormState()` with `dispatch(settingsSlice.actions.setFormField(...))`
- [ ] Replace manual async chains with thunk dispatch
- [ ] Remove old useCallback chains for async operations
- [ ] Tests: dispatch calls fire correctly

### Effect Cleanup
- [ ] Bootstrap effect: replace with `useEffect` that dispatches `loadEngineStatusThunk()`
- [ ] Ollama warmup: dispatch `askQuestionThunk({question: "Hello"})` on settings change
- [ ] Auto-eval effect: replace with listener in analysisSlice or middleware
- [ ] Conversation/game memory load: dispatch thunks on mount
- [ ] Tests: effects run once, thunks dispatch

### Listener Wiring
- [ ] In `useEffect(() => { setupElectronListeners(store) }, [])` at App mount
- [ ] Verify listeners dispatch correct actions
- [ ] Tests: Electron events update Redux state

### Remove Old Code
- [ ] Delete old callback chains: `handleBoardMove`, `handleSelectEngineLine`, etc.
- [ ] These are now thunks or simple actions
- [ ] Delete manual ref updates (`formStateRef`, `selectedEngineLineIndexRef`, etc.)
- [ ] These are now in Redux
- [ ] Tests: no console warnings about old code

---

## Phase 4: Component Refactoring (1–2 days)

### AnalysisBoard
- [ ] Remove props: `currentFen` (use selector), `setCurrentFen` (use dispatch)
- [ ] Remove props: `selectedSquare` (use selector)
- [ ] Keep local state: square highlight, drag preview (UI-only)
- [ ] `onBoardMove` callback dispatches `analyzePositionThunk()`
- [ ] `onMoveAttempt` dispatches `puzzleSlice.recordAttemptMove()`
- [ ] Tests: piece drag, move validation, puzzle mode drag-disable

### ChatPanel
- [ ] Remove props: `analysisLines`, `selectedEngineLineIndex`, etc. (use selectors)
- [ ] `onSelectEngineLine` dispatches `analysis.actions.selectEngineLine()`
- [ ] `onAskQuestion` dispatches `askQuestionThunk()`
- [ ] Keep local state: chat input text (or move to Redux if needed)
- [ ] Tests: line selection, question submission, response display

### SettingsPanel
- [ ] `formState` from selector
- [ ] `handleFormChange` dispatches `settingsSlice.actions.setFormField()`
- [ ] `handleSaveSettings` dispatches `saveSettingsThunk()`
- [ ] Tests: form updates, settings persistence

### Other Components
- [ ] SelectedLineDetail: use selectors for line data
- [ ] PositionNotesPanel: dispatch `analysisSlice.setLineExplanation()` if needed
- [ ] ProfileIcon: use selector for user profile
- [ ] EvalBar: use selectors for top line score
- [ ] Tests: each component uses Redux correctly

---

## Phase 5: Optimization & Polish (1 day)

### Selector Memoization
- [ ] Wrap complex selectors with `reselect` to prevent unnecessary re-renders
- [ ] Example: `selectBoardState`, `selectIsAnyLoading`, `selectAnalysisListItems`
- [ ] Tests: memoized selectors don't change on unrelated updates

### Remove Dead Code
- [ ] Old callback functions that are now thunks
- [ ] Old state variables that are now in Redux
- [ ] Old prop types in component interfaces
- [ ] Tests: app still runs without old code

### Performance Check
- [ ] Redux DevTools extension integration (if browser dev mode)
- [ ] Action dispatch logging (in dev, not prod)
- [ ] Verify no accidental re-renders from selector changes
- [ ] Tests: performance metrics stable

### Final Regression Testing
- [ ] [ ] Manual test: load position → analyze → select line → navigate with arrows
- [ ] [ ] Manual test: puzzle mode → make move → incorrect → reveal solution
- [ ] [ ] Manual test: open/endgame training → step through moves
- [ ] [ ] Manual test: browse games → select game → arrow key through moves
- [ ] [ ] Manual test: settings change → engine switch → restart analysis
- [ ] [ ] Manual test: window resize → board resizes, window size in Redux updates
- [ ] [ ] Unit tests: all thunks, all selectors, all actions
- [ ] [ ] Integration test: full flow from position to analysis to line nav

---

## Key Implementation Details

### Avoiding Stale Closures
**Old approach** (App.tsx):
```ts
const formStateRef = useRef(formState);
useEffect(() => {
  formStateRef.current = formState;
}, []); // No deps!

const runAnalysis = useCallback(() => {
  const fs = formStateRef.current; // Always latest
}, []); // Empty deps
```

**New approach** (Redux):
```ts
const selectLLMProvider = (state) => state.settings.formState.llmProvider;

const analyzePositionThunk = (args) => async (dispatch, getState) => {
  const state = getState();
  const provider = selectLLMProvider(state); // Always latest
  // ...
};
```

### Auto-Dismissing Messages
**Old approach** (App.tsx):
```ts
useEffect(() => {
  if (!statusMessage) return;
  const t = setTimeout(() => setStatusMessage(""), 2000);
  return () => clearTimeout(t);
}, [statusMessage]); // Fires on every message change
```

**New approach** (Middleware):
```ts
const autoDismissMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type === "ui/setStatusMessage") {
    setTimeout(() => {
      store.dispatch(ui.actions.dismissStatusMessage());
    }, 2000);
  }
  return result;
};
```

### Two-Pass LLM Pipeline
**Old approach** (App.tsx):
```ts
setQuestionLoading(true);
// User called askQuestion, manually orchestrate PASS 1 + 2
const classifyRes = await electronAPI.askQuestion({...});
if (classifyRes.response_type === "Puzzle") {
  setCurrentResponseType("Puzzle");
  setPuzzleSolution(classifyRes.solution);
  // ...
}
setQuestionLoading(false);
```

**New approach** (thunk):
```ts
export const askQuestionThunk = (args) => async (dispatch) => {
  dispatch(ui.actions.setQuestionLoading(true));
  try {
    const res = await electronAPI.askQuestion(args);
    const type = res.response_type as ResponseType;
    dispatch(response.actions.setResponseType(type));
    
    // Dispatch to correct slice based on type
    if (type === "Puzzle") {
      dispatch(puzzle.actions.loadPuzzle({
        fen: res.fen,
        solution: res.solution,
        // ...
      }));
    } else if (type === "Opening") {
      dispatch(training.actions.loadTraining({...}));
    }
    // ...
    
    dispatch(response.actions.setQuestionResponse(res.answer || ""));
  } finally {
    dispatch(ui.actions.setQuestionLoading(false));
  }
};
```

---

## Testing Strategy

### Unit Tests (for each slice)
- Actions produce correct state mutations
- Selectors return expected shape
- Thunks dispatch correct sequence of actions

### Integration Tests
- Full user flow: position load → analysis → line nav → solution
- Puzzle flow: load puzzle → make moves → incorrect → show solution
- Settings flow: change engine → restart analysis with new engine

### E2E Tests (if Cypress available)
- Manual flows in real app
- Window resize, keyboard nav, drag-drop

---

## Git Commit Strategy

```
1. chore: setup Redux store structure with all slices
2. feat: implement analysis thunks (analyzePosition, fetchExplanations)
3. feat: implement engine thunks (loadEngineStatus, detectEngine)
4. feat: implement response thunks (askQuestion, ecoLookup)
5. feat: refactor App.tsx to use Redux selectors and dispatch
6. refactor: simplify AnalysisBoard, ChatPanel, SettingsPanel
7. perf: add reselect memoization for complex selectors
8. test: add integration tests for thunks and selectors
9. test: manual regression testing checklist
```

---

## Rollback Plan

If issues arise during refactoring:

1. **Branch strategy**: Create `feature/redux-refactor` off `main`
2. **Checkpoint commits**: Commit after each phase (Phase 1, 2, 3, etc.)
3. **Revert to previous**: If Phase 4 breaks components, revert Phase 4 only, keep Phase 1–3
4. **Test in isolation**: Each thunk tested independently before component integration

---

## Success Criteria

- [ ] All 60+ `useState` calls in App.tsx removed
- [ ] No prop drilling (all state via selectors)
- [ ] No manual sync bugs (Redux is source of truth)
- [ ] All thunks tested
- [ ] All regressions fixed
- [ ] App starts in < 2s (same as before)
- [ ] No extra renders (check React DevTools)
- [ ] All existing features work identically to before refactor

