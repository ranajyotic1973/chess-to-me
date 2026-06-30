# Redux Architecture Design — Chess To Me

## Executive Summary

This refactor consolidates scattered state across App.tsx (60+ state variables), AnalysisBoard, and ChatPanel into a single Redux store. The design prioritizes:

1. **Single source of truth** — eliminate sync bugs between components
2. **Separation of concerns** — board state, analysis data, UI flags, and engine config each have dedicated slices
3. **Thunk-based async operations** — LLM and engine calls managed centrally with loading states
4. **Minimal payload passing** — components use selectors; parent callbacks become actions

---

## Current State Problems

**App.tsx**: 60+ `useState` calls scattered across rendering logic:
- `currentFen`, `selectedEngineLineIndex`, `currentMoveIndex` (related, often sync'd manually)
- `analysisLines`, `analysisEntries` (derived data, manual sync)
- `formState`, `engineStatus` (settings scattered across two objects)
- `analysisLoading`, `analysisStatus`, `isDrillLoading`, `deepAnalysisLoading` (4 separate loading flags)
- `puzzleSolution`, `puzzleStartFen`, `puzzleAttemptMoves` (local puzzle state)
- `conversationHistory`, `gameMemory` (cached data scattered)

**Sync Issues**:
- Prop drilling through multiple components
- useCallback deps arrays growing to 15+ items
- Manual state updates in multiple places when a move occurs
- No centralized place to orchestrate multi-step operations

---

## Redux Store Shape

```
{
  board: {
    currentFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    selectedSquare: "e4" | null
    moveHistory: ["e2e4", "c7c5", ...]
  }
  
  analysis: {
    lines: AnalysisLine[]
    entries: AnalysisEntry[]
    selectedLineIndex: number | null
    selectedLineBaseFen: string
    currentMoveIndex: number
    explorationStack: Array<{fen, lines, entries, listResponse}>
    explanations: Record<number, string>
    deepAnalysisResults: Record<number, DeepLineAnalysis | null>
  }
  
  ui: {
    // Loading & async states
    analysisLoading: boolean
    analysisStatus: string  // or ""
    deepAnalysisLoading: boolean
    isDrillLoading: boolean
    isExplanationLoading: boolean
    
    // Navigation & mode
    viewMode: "settings" | "analysis"
    advancedAnalysisMode: boolean
    analysisMode: "main" | "logs"
    
    // Dialog / temporary states
    notesConfirmDialogOpen: boolean
    lineDialogOpen: boolean
    moveWarningOpen: boolean
    isPositionEditorOpen: boolean
    
    // Messages
    statusMessage: string
    snackbarOpen: boolean
    snackbarMessage: string
    snackbarSeverity: "success" | "error" | "info"
    
    // Agent progress
    agentStatuses: AgentProgressEvent[]
    logEntries: { stockfish: LogEntry[], ollama: LogEntry[] }
    
    // Window
    windowSize: { width: number, height: number }
  }
  
  engine: {
    engineStatus: EngineStatus | null
    systemStatus: SystemStatus | null
    availableEngines: EngineInfo[]
    engineWarming: boolean
    engineAnalyzing: boolean
    appLoading: boolean
    settingsLoaded: boolean
  }
  
  settings: {
    formState: AppSettings
    llmApiKeyLength: number
    settingsSaving: boolean
    llmSettingsValid: boolean
    
    // Cached conversation & game memory
    conversationHistory: Array<{role, message, timestamp}>
    gameMemory: Array<{pgn, annotations, timestamp}>
  }
  
  puzzle: {
    puzzleStartFen: string
    puzzleSolution: string[]
    puzzleSolutionSan: string[]
    puzzleAttemptMoves: string[]
    puzzleNavigationMode: boolean
    puzzleIncorrect: boolean
    showSolution: boolean
    puzzleMeta: {themes, difficulty, rating} | null
    puzzleExplainLoading: boolean
  }
  
  training: {
    trainingMoves: Array<{uci, san, commentary}>
    trainingMoveIndex: number
    trainingStartFen: string
    trainingMoveLabel: string
  }
  
  game: {
    gameMode: boolean
    gameList: GameRow[] | null
    currentGameInfo: GamePlayerInfo | null
    gamePgnFens: string[]
    gameMoveIndex: number
    gameEcoLabel: string
  }
  
  response: {
    responseType: ResponseType
    responseData: Record<string, any>
    questionText: string
    questionResponse: string
    questionLoading: boolean
    currentOpening: {name, eco} | null
    currentResponseType: ResponseType
    analysisEcoLabel: string
  }
}
```

---

## Slice Definitions

### 1. **boardSlice**

**State:**
```ts
{
  currentFen: string
  selectedSquare: string | null
  moveHistory: string[]  // UCI moves for quick undo/redo
}
```

**Actions:**
- `setCurrentFen(fen: string)` — update board position
- `selectSquare(square: string | null)` — highlight square
- `addMove(uci: string)` — append to move history
- `resetBoard()` — set to start position
- `loadFen(fen: string)` — load custom position

**Selectors:**
```ts
selectCurrentFen
selectSelectedSquare
selectMoveHistory
selectMoveCount
selectIsStartPosition
```

---

### 2. **analysisSlice**

**State:**
```ts
{
  lines: AnalysisLine[]
  entries: AnalysisEntry[]
  selectedLineIndex: number | null
  selectedLineBaseFen: string
  currentMoveIndex: number
  explorationStack: Array<{fen, lines, entries, listResponse}>
  explanations: Record<number, string>
  deepAnalysisResults: Record<number, DeepLineAnalysis | null>
}
```

**Actions:**
- `setAnalysisLines(lines: AnalysisLine[])` — replace top-level lines
- `setAnalysisEntries(entries: AnalysisEntry[])`
- `selectEngineLine({lineIndex, baseFen})` — select line for navigation
- `deselectEngineLine()` — clear selection
- `incrementMoveIndex()` / `decrementMoveIndex()`
- `setMoveIndex(idx: number)`
- `pushExplorationFrame({fen, lines, entries, listResponse})` — drill down
- `popExplorationFrame()` — go back
- `setLineExplanation({lineIndex, text})` — cache explanation
- `setDeepAnalysisResult({lineIndex, analysis})`
- `clearAnalysis()` — reset when position changes

**Async Thunks:**
```ts
analyzePositionThunk({engine, fen, depth, multiPv})
  // Calls electronAPI.analyzePosition, handles response,
  // dispatches setAnalysisLines + setAnalysisEntries
  // Returns action with .payload = {lines, entries}

fetchExplanationsThunk({fen, lines, language, llmProvider, ...})
  // Calls electronAPI.explainLines
  // Dispatches setLineExplanation for each line

fetchPerMoveExplanationThunk({lineIndex, line, baseFen, moveIndex, moveSan})
  // Single move explanation (for keyboard nav)
  // Returns explanation text

deepAnalyzeLinesThunk({fen, lines})
  // Calls electronAPI.deepAnalyzeLines
  // Dispatches setDeepAnalysisResult for each
```

**Selectors:**
```ts
selectAnalysisLines
selectAnalysisEntries
selectSelectedLineIndex
selectSelectedLine
selectCurrentMoveIndex
selectLineExplanation(lineIndex)
selectDeepAnalysisResult(lineIndex)
selectExplorationStackSize
selectCanGoBack
selectSelectedLineFirstMove
```

---

### 3. **uiSlice**

**State:**
```ts
{
  // Loading states
  analysisLoading: boolean
  analysisStatus: string
  deepAnalysisLoading: boolean
  isDrillLoading: boolean
  isExplanationLoading: boolean
  
  // Navigation
  viewMode: "settings" | "analysis"
  advancedAnalysisMode: boolean
  analysisMode: "main" | "logs"
  
  // Dialogs
  notesConfirmDialogOpen: boolean
  lineDialogOpen: boolean
  moveWarningOpen: boolean
  isPositionEditorOpen: boolean
  
  // Messages
  statusMessage: string
  snackbarOpen: boolean
  snackbarMessage: string
  snackbarSeverity: "success" | "error" | "info"
  
  // Debug/monitoring
  agentStatuses: AgentProgressEvent[]
  logEntries: {stockfish: LogEntry[], ollama: LogEntry[]}
  activeLogTab: number
  
  // Window
  windowSize: {width: number, height: number}
}
```

**Actions:**
- `setAnalysisLoading(bool)` / `setDeepAnalysisLoading(bool)` / etc.
- `setAnalysisStatus(status: string)` — brief message (auto-dismisses after 2s via middleware)
- `setStatusMessage(msg: string)` — floating banner
- `setSnackbar({open, message, severity})`
- `dismissStatusMessage()` — manual clear
- `setViewMode(mode)`
- `setAdvancedAnalysisMode(bool)`
- `setAnalysisMode(mode)`
- `toggleDialog(dialogName, bool)`
- `setAgentStatus(event)` — update agent progress
- `addLogEntry({bucket, entry})`
- `setWindowSize({width, height})`

**Async Thunks:**
- None (thunks are in specific slices — engine, settings)

**Selectors:**
```ts
selectAnalysisLoading
selectAnalysisStatus
selectStatusMessage
selectViewMode
selectAdvancedAnalysisMode
selectWindowSize
selectAgentStatuses
selectLogEntries(bucket)
selectIsAnyLoading  // = analysis || deep || drill || explanation
```

---

### 4. **engineSlice**

**State:**
```ts
{
  engineStatus: EngineStatus | null
  systemStatus: SystemStatus | null
  availableEngines: EngineInfo[]
  engineWarming: boolean
  engineAnalyzing: boolean
  appLoading: boolean
  settingsLoaded: boolean
}
```

**Actions:**
- `setEngineStatus(status)` — store engine config from main process
- `setSystemStatus(status)` — store system detection results
- `setAvailableEngines(engines)`
- `setEngineWarming(bool)` — engine warming up
- `setEngineAnalyzing(bool)` — engine actively analyzing
- `setAppLoading(bool)` — initial app bootstrap
- `setSettingsLoaded(bool)` — settings file read

**Async Thunks:**
```ts
loadEngineStatusThunk()
  // Calls electronAPI.getEngineStatus()
  // Dispatches setEngineStatus + updates settings in settingsSlice

fetchSystemStatusThunk()
  // Calls electronAPI.getSystemStatus()
  // Dispatches setSystemStatus + setAvailableEngines

detectEngineThunk({engine: "stockfish" | "lc0"})
  // Calls electronAPI.detectEngine()
  // Returns {found, path}

browseForEngineThunk({engine})
  // Calls electronAPI.browseForEngine()
  // Returns {selected, valid, path}

setEnginePathThunk({engine, path})
  // Validates and persists engine path
  // Calls electronAPI.setEnginePath()

detectAllEnginesThunk()
  // Detects both stockfish and LC0
  // Dispatches setAvailableEngines
```

**Listeners** (middleware):
```ts
engineSlice.addListener({
  predicate: (action) => action.type === "engine/setEngineWarming",
  effect: (action, {dispatch}) => {
    if (action.payload) {
      // Engine warming started
    }
  }
})
```

**Selectors:**
```ts
selectEngineStatus
selectIsEngineConfigured
selectSelectedEngine
selectEngineAnalyzingFlag
selectEngineWarming
selectSystemStatus
selectAvailableEngines
selectAppLoading
selectSettingsLoaded
selectIsPlatformReady  // = settingsLoaded && engineStatus?.configured
```

---

### 5. **settingsSlice**

**State:**
```ts
{
  formState: AppSettings
  llmApiKeyLength: number
  settingsSaving: boolean
  
  // Caches (load once on app init)
  conversationHistory: Array<{role, message, timestamp}>
  gameMemory: Array<{pgn, annotations, timestamp}>
}
```

**Actions:**
- `setFormField({key, value})` — update one setting field
- `setFormState(state: AppSettings)` — replace all
- `setLlmApiKeyLength(len)` — update key length (for display)
- `setSettingsSaving(bool)`
- `setConversationHistory(history)`
- `setGameMemory(memory)`

**Async Thunks:**
```ts
saveSettingsThunk({...AppSettings})
  // Calls electronAPI.setEnginePath() + electronAPI.updateAppSettings()
  // On success: dispatch setEngineStatus + updates
  // On fail: dispatch snackbar error

changeOllamaModelThunk(modelName: string)
  // Calls electronAPI.setOllamaModel(modelName)
  // Updates formState.ollamaModel
  // Shows status message

loadConversationHistoryThunk(mode: string)
  // Loads from localStorage or file
  // Dispatches setConversationHistory

saveConversationHistoryThunk({mode, history})
  // Async persist to localStorage/file

loadGameMemoryThunk()
  // Loads game list from storage
  // Dispatches setGameMemory

validateLLMSettingsThunk()
  // Checks provider, model, api key
  // Returns bool or validation error
```

**Selectors:**
```ts
selectFormState
selectLLMProvider
selectLLMModel
selectOllamaModel
selectOllamaBaseUrl
selectLLMApiKeyLength
selectSelectedEngine
selectAnalysisDepth
selectExplainLanguage
selectPuzzleRatingRange
selectSettingsSaving
selectConversationHistory
selectGameMemory
selectIsLLMValid
selectLLMModel(provider)  // smart: returns appropriate model for provider
```

---

### 6. **puzzleSlice**

**State:**
```ts
{
  puzzleStartFen: string
  puzzleSolution: string[]
  puzzleSolutionSan: string[]
  puzzleAttemptMoves: string[]
  puzzleNavigationMode: boolean
  puzzleIncorrect: boolean
  showSolution: boolean
  puzzleMeta: {themes, difficulty, rating} | null
  puzzleExplainLoading: boolean
}
```

**Actions:**
- `loadPuzzle({fen, solution, solutionSan, meta})` — set puzzle state
- `recordAttemptMove(uci)` — add move to attempts
- `resetAttempt()` — clear attempt moves
- `toggleShowSolution(bool)`
- `setPuzzleIncorrect(bool)`
- `setPuzzleNavigationMode(bool)`
- `clearPuzzle()` — reset all state

**Async Thunks:**
```ts
explainIncorrectMoveThunk({
  puzzleFen, solutionUci, solutionSan, userMovesUci, userMovesSan,
  themes, difficulty, rating, language, llmProvider, model, ...
})
  // Calls electronAPI.puzzleExplainIncorrect()
  // Dispatches response to responseSlice.questionResponse
```

**Selectors:**
```ts
selectPuzzleStartFen
selectPuzzleSolution
selectPuzzleAttemptMoves
selectPuzzleMeta
selectIsInPuzzleMode
selectShowSolution
selectPuzzleNavigationMode
selectPuzzleCorrect  // = attemptLength === solution.length
selectNextExpectedMove
selectCurrentPuzzlePosition  // derives FEN from attemptMoves + startFen
```

---

### 7. **trainingSlice**

**State:**
```ts
{
  trainingMoves: Array<{uci, san, commentary}>
  trainingMoveIndex: number
  trainingStartFen: string
  trainingMoveLabel: string  // "3. ♘f3"
}
```

**Actions:**
- `loadTraining({startFen, moves})` — set training session
- `advanceTrainingMove()` — increment index
- `retreatTrainingMove()` — decrement index
- `setTrainingLabel(label)`
- `clearTraining()` — reset

**Selectors:**
```ts
selectTrainingMoveIndex
selectTrainingMoves
selectCurrentTrainingMove
selectTrainingPosition  // derives FEN from moves + startFen
selectIsTrainingActive
selectTrainingProgress  // {current, total}
```

---

### 8. **gameSlice**

**State:**
```ts
{
  gameMode: boolean
  gameList: GameRow[] | null
  currentGameInfo: GamePlayerInfo | null
  gamePgnFens: string[]
  gameMoveIndex: number
  gameEcoLabel: string
}
```

**Actions:**
- `setGameMode(bool)`
- `setGameList(list)`
- `setCurrentGame({info, pgnFens, moveIndex})`
- `setGameMoveIndex(idx)`
- `setGameEcoLabel(label)`
- `clearGame()` — reset to non-game mode

**Async Thunks:**
- Game loading is typically part of LLM response handling (responseSlice)

**Selectors:**
```ts
selectGameMode
selectGameList
selectCurrentGameInfo
selectGameMoveIndex
selectGamePosition  // derives FEN from pgnFens + index
selectIsGameLoaded
```

---

### 9. **responseSlice**

**State:**
```ts
{
  responseType: ResponseType
  responseData: Record<string, any>
  questionText: string
  questionResponse: string
  questionLoading: boolean
  currentOpening: {name, eco} | null
  analysisEcoLabel: string
}
```

**Actions:**
- `setResponseType(type)`
- `setResponseData(data)`
- `setQuestionText(text)`
- `setQuestionResponse(response)`
- `setQuestionLoading(bool)`
- `setCurrentOpening(opening)`
- `setAnalysisEcoLabel(label)`
- `clearResponse()` — reset when leaving response mode

**Async Thunks:**
```ts
askQuestionThunk({
  question, fen, lines, language, llmProvider, model, baseUrl, apiKey, ...
})
  // Orchestrates the two-pass pipeline:
  // PASS 1: Classification (responseType detection)
  // PASS 2: Generation (get answer, move suggestions, etc.)
  // 
  // Dispatches:
  //   - setQuestionLoading(true)
  //   - setResponseType(...)
  //   - setResponseData(...)
  //   - Based on responseType:
  //       - "Puzzle" → puzzleSlice.loadPuzzle()
  //       - "Opening/Endgame" → trainingSlice.loadTraining()
  //       - "Game" → gameSlice.setCurrentGame()
  //       - "Analysis" → analysisSlice.clearAnalysis()
  //   - setQuestionResponse(answer)
  //   - setQuestionLoading(false)
  //   - dispatch selectEngineLine if needed for auto-select

ecoLookupThunk(fen)
  // Calls electronAPI.ecoLookupFen()
  // Dispatches setAnalysisEcoLabel() or setGameEcoLabel()
```

**Selectors:**
```ts
selectResponseType
selectResponseData
selectQuestionResponse
selectQuestionLoading
selectCurrentOpening
selectIsAnalysisResponse
selectIsPuzzleResponse
selectIsTrainingResponse
selectIsGameResponse
```

---

## Middleware & Utilities

### **Auto-Dismiss Middleware**
```ts
const autoDismissMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  
  if (action.type === "ui/setStatusMessage") {
    setTimeout(() => {
      store.dispatch(ui.actions.dismissStatusMessage());
    }, 2000);
  }
  
  if (action.type === "ui/setAnalysisStatus") {
    setTimeout(() => {
      store.dispatch(ui.actions.setAnalysisStatus(""));
    }, 2000);
  }
  
  return result;
};
```

### **IPC Event Listeners Setup**
```ts
export function setupElectronListeners(store: AppStore) {
  if (!electronAPI) return;
  
  // Engine warming
  electronAPI.onEngineWarmingUp?.(() => {
    store.dispatch(engine.actions.setEngineWarming(true));
  });
  electronAPI.onEngineReady?.(() => {
    store.dispatch(engine.actions.setEngineWarming(false));
  });
  
  // Engine analysis
  electronAPI.onEngineAnalysisStart?.(() => {
    store.dispatch(engine.actions.setEngineAnalyzing(true));
  });
  electronAPI.onEngineAnalysisDone?.(() => {
    store.dispatch(engine.actions.setEngineAnalyzing(false));
  });
  
  // Agent progress
  electronAPI.onAgentProgress?.((event) => {
    store.dispatch(ui.actions.setAgentStatus(event));
  });
  
  // Log entries
  electronAPI.onLogEntry?.(({bucket, entry}) => {
    store.dispatch(ui.actions.addLogEntry({bucket, entry}));
  });
}
```

### **Derived Selectors**
```ts
// Create these with reselect to avoid unnecessary re-renders
export const selectIsAnyLoading = (state) => 
  selectAnalysisLoading(state) ||
  selectDeepAnalysisLoading(state) ||
  selectIsDrillLoading(state) ||
  selectIsExplanationLoading(state);

export const selectBoardState = (state) => ({
  fen: selectCurrentFen(state),
  selectedSquare: selectSelectedSquare(state),
});

export const selectActiveMode = (state) => {
  const responseType = selectResponseType(state);
  if (responseType === "Puzzle") return "puzzle";
  if (responseType === "Opening" || responseType === "Endgame" || responseType === "Middlegame") return "training";
  if (selectGameMode(state)) return "game";
  return "analysis";
};
```

---

## Component Integration Examples

### **Before (App.tsx) — Prop Drilling**
```tsx
<AnalysisBoard
  currentFen={currentFen}
  setCurrentFen={setCurrentFen}
  selectedSquare={selectedSquare}  // wasn't even exposed!
  onBoardMove={handleBoardMove}
  // ...20+ props
/>
```

### **After (App.tsx) — Redux Selectors**
```tsx
const dispatch = useDispatch();
const fen = useSelector(selectCurrentFen);
const selectedSquare = useSelector(selectSelectedSquare);

const handleBoardMove = (newFen) => {
  dispatch(board.actions.setCurrentFen(newFen));
  dispatch(analyzePositionThunk({engine: "stockfish", fen: newFen, depth: 5}));
};

<AnalysisBoard
  // Pass dispatch & selectors only; parent doesn't own the state
  onFenChange={(fen) => dispatch(board.actions.setCurrentFen(fen))}
  onBoardMove={handleBoardMove}
/>
```

### **AnalysisBoard (simplified)**
```tsx
function AnalysisBoard({ onFenChange, onBoardMove }) {
  const fen = useSelector(selectCurrentFen);
  const selectedSquare = useSelector(selectSelectedSquare);
  
  // Local UI-only state (board square highlight, drag preview)
  // stays here — Redux is not for transient UI state
  
  const handleDrop = (from, to) => {
    const chess = new Chess();
    chess.load(fen);
    const move = chess.move({from, to, promotion: "q"});
    if (move) {
      const newFen = chess.fen();
      onFenChange(newFen);
      onBoardMove(newFen);
    }
  };
  
  return <Chessboard onDrop={handleDrop} />;
}
```

### **ChatPanel (simplified)**
```tsx
function ChatPanel({ onAskQuestion, onSelectEngineLine, onDeselectLine }) {
  const dispatch = useDispatch();
  const lines = useSelector(selectAnalysisLines);
  const selectedIdx = useSelector(selectSelectedLineIndex);
  const explanations = useSelector(selectLineExplanations);
  
  const handleSelectLine = (idx, line) => {
    dispatch(analysis.actions.selectEngineLine({
      lineIndex: idx,
      baseFen: selectCurrentFen(store.getState())
    }));
    // Further logic moved to selectEngineLine listener if needed
  };
  
  return (
    <SelectableList
      items={lines.map((line, i) => ({
        id: `line-${i}`,
        label: line.pv || "",
        sublabel: explanations[i] || ""
      }))}
      onSelect={(id, idx) => handleSelectLine(idx, lines[idx])}
    />
  );
}
```

---

## Action Dispatch Flow Examples

### **Example 1: User Loads a Position**

```ts
// ChatPanel: user pastes FEN
dispatch(
  askQuestionThunk({
    question: "[FEN: ...]",
    language: selectExplainLanguage(state),
    llmProvider: selectLLMProvider(state),
    // ...
  })
);

// In thunk:
//   - Calls electronAPI.askQuestion() (PASS 1 + 2)
//   - Sees responseType = "Position"
//   - Parses FEN from response
//   - dispatch(board.actions.setCurrentFen(fen))
//   - dispatch(analyzePositionThunk(...))  // auto-analyze
//   - dispatch(response.actions.setResponseData({fen, ...}))
//   - dispatch(response.actions.setQuestionResponse(answer))
```

### **Example 2: User Selects an Engine Line**

```ts
// ChatPanel: user clicks line
dispatch(
  analysis.actions.selectEngineLine({
    lineIndex: 2,
    baseFen: currentFen
  })
);

// Listener in analysisSlice catches selectEngineLine:
//   - Play first move: dispatch(board.actions.setCurrentFen(newFen))
//   - dispatch(analyzePositionThunk(...))  // analyze new position
//   - dispatch(ui.actions.setStatusMessage("Line selected"))
```

### **Example 3: Keyboard Navigation (Arrow Right)**

```ts
// AnalysisBoard or root handleKeyboardNavigation:
dispatch(analysis.actions.incrementMoveIndex());

// Listener in analysisSlice:
//   - Gets selectedLineIndex + currentMoveIndex
//   - Derives new position from move sequence
//   - dispatch(board.actions.setCurrentFen(newFen))
//   - Checks cache: dispatch(response.actions.setQuestionResponse(cached))
//   - Or: dispatch(fetchPerMoveExplanationThunk(...))
```

---

## Migration Path

1. **Phase 1: Create store structure** (1–2 days)
   - Define all slices with basic actions
   - Export selectors
   - Wire `configureStore()`

2. **Phase 2: Migrate async operations** (2–3 days)
   - Implement thunks (analyzePosition, askQuestion, etc.)
   - Set up electronAPI event listeners
   - Replace useCallback chains with thunks

3. **Phase 3: Refactor App.tsx** (2–3 days)
   - Remove useState calls one slice at a time
   - Wire selectors and dispatch calls
   - Test each piece

4. **Phase 4: Simplify child components** (1–2 days)
   - Remove prop drilling
   - AnalysisBoard, ChatPanel use selectors directly
   - Verify no regressions in keyboard nav, puzzle mode, etc.

5. **Phase 5: Clean up & optimize** (1 day)
   - Add reselect memoization
   - Remove unused code
   - Final regression testing

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Split analysis ≠ response** | Analysis is engine state; response is LLM output. Keeps concerns separate. |
| **board.selectedSquare (UI-only)** | Square highlighting is local UI state; doesn't need Redux. |
| **Thunks for async, not listeners** | Async side effects belong in thunks; listeners used only for Electron IPC push events. |
| **formState in settings, not separate** | Settings are a cohesive unit; no reason to split. |
| **Selectors use reselect** | Prevents component re-renders when unrelated state changes. |
| **clearAnalysis() on new position** | When user makes a real move, clear old lines. Prevents stale data on board. |
| **Auto-dismiss middleware** | Consistent UX for transient messages; eliminates repetitive timer logic in components. |
| **conversationHistory cached in Redux** | Loaded once on init, kept in memory. Faster than disk on every message. |

---

## File Structure

```
src/
├── store/
│   ├── index.ts              // configureStore, setupElectronListeners
│   ├── slices/
│   │   ├── boardSlice.ts
│   │   ├── analysisSlice.ts
│   │   ├── uiSlice.ts
│   │   ├── engineSlice.ts
│   │   ├── settingsSlice.ts
│   │   ├── puzzleSlice.ts
│   │   ├── trainingSlice.ts
│   │   ├── gameSlice.ts
│   │   └── responseSlice.ts
│   ├── middleware/
│   │   └── autoDismissMiddleware.ts
│   ├── thunks/
│   │   ├── analysisThunks.ts
│   │   ├── engineThunks.ts
│   │   ├── settingsThunks.ts
│   │   ├── responseThunks.ts
│   │   └── puzzleThunks.ts
│   └── hooks.ts              // useAppDispatch, useAppSelector, useAppStore
├── App.tsx                   // Drastically simplified
└── components/
    └── (all simplified; no prop drilling)
```

---

## Summary Table

| Slice | Primary Use | Size | Deps | Async? |
|-------|-------------|------|------|--------|
| board | FEN, move tracking | 3 fields | None | No |
| analysis | Engine lines, navigation | 8 fields | board (FEN) | Yes (engine) |
| ui | Loading, dialogs, messages | 15 fields | None | Middleware only |
| engine | Engine config, status | 6 fields | None | Yes (Electron) |
| settings | App config, caches | 3 fields | None | Yes (file/IPC) |
| puzzle | Puzzle state | 8 fields | board (FEN) | Yes (LLM) |
| training | Opening/endgame training | 4 fields | board (FEN) | No |
| game | Game browsing | 5 fields | board (FEN) | No |
| response | LLM responses | 5 fields | All others | Yes (LLM) |

