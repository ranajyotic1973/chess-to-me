# Redux Action Reference — Quick Lookup

This document lists all Redux actions and thunks by slice, with signatures and usage examples.

---

## boardSlice

### Actions

```ts
board.actions.setCurrentFen(fen: string)
// Usage: dispatch(board.actions.setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"))

board.actions.selectSquare(square: string | null)
// Usage: dispatch(board.actions.selectSquare("e4"))

board.actions.addMove(uci: string)
// Usage: dispatch(board.actions.addMove("e2e4"))

board.actions.resetBoard()
// Usage: dispatch(board.actions.resetBoard())

board.actions.loadFen(fen: string)
// Usage: dispatch(board.actions.loadFen(fen))
```

### Selectors

```ts
selectCurrentFen(state)           // string
selectSelectedSquare(state)       // string | null
selectMoveHistory(state)          // string[]
selectMoveCount(state)            // number
selectIsStartPosition(state)      // boolean
```

---

## analysisSlice

### Actions

```ts
analysis.actions.setAnalysisLines(lines: AnalysisLine[])
analysis.actions.setAnalysisEntries(entries: AnalysisEntry[])

analysis.actions.selectEngineLine(payload: {lineIndex: number, baseFen: string})
// Usage: dispatch(analysis.actions.selectEngineLine({lineIndex: 2, baseFen: "..."}))

analysis.actions.deselectEngineLine()

analysis.actions.incrementMoveIndex()
analysis.actions.decrementMoveIndex()
analysis.actions.setMoveIndex(idx: number)

analysis.actions.pushExplorationFrame(payload: {fen, lines, entries, listResponse})
// Used internally by selectEngineLine thunk

analysis.actions.popExplorationFrame()
// Used internally or by handleBackFromLine

analysis.actions.setLineExplanation(payload: {lineIndex: number, text: string})
analysis.actions.setDeepAnalysisResult(payload: {lineIndex: number, analysis: DeepLineAnalysis | null})

analysis.actions.clearAnalysis()
// Resets lines, entries, selections, exploration stack
```

### Selectors

```ts
selectAnalysisLines(state)              // AnalysisLine[]
selectAnalysisEntries(state)            // AnalysisEntry[]
selectSelectedLineIndex(state)          // number | null
selectSelectedLine(state)               // AnalysisLine | null
selectCurrentMoveIndex(state)           // number
selectLineExplanation(state, lineIndex) // string
selectDeepAnalysisResult(state, lineIdx)// DeepLineAnalysis | null
selectExplorationStackSize(state)       // number
selectCanGoBack(state)                  // boolean (stackSize > 0)
selectSelectedLineBaseFen(state)        // string
selectSelectedLineFirstMove(state)      // string | null
selectAnalysisIsEmpty(state)            // boolean (lines.length === 0)
```

### Thunks

```ts
analyzePositionThunk({
  engine: "stockfish" | "lc0",
  fen: string,
  depth?: number,
  multiPv?: number
})
// Dispatches: setAnalysisLines, setAnalysisEntries
// Updates ui slice: setAnalysisLoading, setAnalysisStatus
// Example:
dispatch(analyzePositionThunk({engine: "lc0", fen: currentFen, depth: 10, multiPv: 4}))

fetchExplanationsThunk({
  fen: string,
  lines: AnalysisLine[],
  language: string,
  llmProvider: string,
  model: string,
  baseUrl?: string,
  llmApiKey?: string
})
// Dispatches: setLineExplanation for each line
// Example:
dispatch(fetchExplanationsThunk({fen, lines, language: "English", llmProvider: "ollama", ...}))

fetchPerMoveExplanationThunk({
  lineIndex: number,
  line: AnalysisLine,
  baseFen: string,
  moveIndex: number,
  moveSan: string,
  language: string,
  llmProvider: string,
  model: string,
  baseUrl?: string,
  llmApiKey?: string
})
// Returns: explanation text
// Caches in explanationCache and dispatches setLineExplanation
// Example:
await dispatch(fetchPerMoveExplanationThunk({lineIndex: 0, line, baseFen, moveIndex: 0, ...}))

deepAnalyzeLinesThunk({
  fen: string,
  lines: AnalysisLine[]
})
// Dispatches: setDeepAnalysisResult for each line
// Example:
dispatch(deepAnalyzeLinesThunk({fen, lines}))
```

---

## uiSlice

### Actions

```ts
ui.actions.setAnalysisLoading(bool)
ui.actions.setDeepAnalysisLoading(bool)
ui.actions.setIsDrillLoading(bool)
ui.actions.setIsExplanationLoading(bool)

ui.actions.setAnalysisStatus(status: string)
// Auto-dismisses after 2s via middleware
// Usage: dispatch(ui.actions.setAnalysisStatus("No moves available"))

ui.actions.setStatusMessage(msg: string)
// Auto-dismisses after 2s via middleware
// Usage: dispatch(ui.actions.setStatusMessage("Position loaded"))

ui.actions.dismissStatusMessage()
// Called automatically by middleware, can call manually

ui.actions.setSnackbar(payload: {open: boolean, message: string, severity: "success" | "error" | "info"})
// Usage: dispatch(ui.actions.setSnackbar({open: true, message: "Saved!", severity: "success"}))

ui.actions.setViewMode(mode: "settings" | "analysis")
ui.actions.setAdvancedAnalysisMode(bool)
ui.actions.setAnalysisMode(mode: "main" | "logs")

ui.actions.toggleDialog(payload: {name: string, open: boolean})
// Usage: dispatch(ui.actions.toggleDialog({name: "lineDialog", open: true}))

ui.actions.setAgentStatus(event: AgentProgressEvent)
ui.actions.addLogEntry(payload: {bucket: "stockfish" | "ollama", entry: LogEntry})

ui.actions.setWindowSize(payload: {width: number, height: number})
```

### Selectors

```ts
selectAnalysisLoading(state)        // boolean
selectDeepAnalysisLoading(state)    // boolean
selectIsDrillLoading(state)         // boolean
selectIsExplanationLoading(state)   // boolean
selectAnalysisStatus(state)         // string
selectStatusMessage(state)          // string
selectViewMode(state)               // "settings" | "analysis"
selectAdvancedAnalysisMode(state)   // boolean
selectAnalysisMode(state)           // "main" | "logs"
selectWindowSize(state)             // {width: number, height: number}
selectAgentStatuses(state)          // AgentProgressEvent[]
selectLogEntries(state)             // {stockfish: LogEntry[], ollama: LogEntry[]}
selectIsAnyLoading(state)           // boolean (any of the 4 loading flags)
selectSnackbar(state)               // {open, message, severity}
selectIsDialogOpen(state, name)     // boolean
```

---

## engineSlice

### Actions

```ts
engine.actions.setEngineStatus(status: EngineStatus | null)
engine.actions.setSystemStatus(status: SystemStatus | null)
engine.actions.setAvailableEngines(engines: EngineInfo[])
engine.actions.setEngineWarming(bool)
engine.actions.setEngineAnalyzing(bool)
engine.actions.setAppLoading(bool)
engine.actions.setSettingsLoaded(bool)
```

### Selectors

```ts
selectEngineStatus(state)           // EngineStatus | null
selectIsEngineConfigured(state)     // boolean
selectSelectedEngine(state)         // "stockfish" | "lc0"
selectEngineAnalyzingFlag(state)    // boolean
selectEngineWarming(state)          // boolean
selectSystemStatus(state)           // SystemStatus | null
selectAvailableEngines(state)       // EngineInfo[]
selectAppLoading(state)             // boolean
selectSettingsLoaded(state)         // boolean
selectIsPlatformReady(state)        // boolean (settingsLoaded && configured)
```

### Thunks

```ts
loadEngineStatusThunk()
// Calls electronAPI.getEngineStatus()
// Dispatches: setEngineStatus, updates settingsSlice.formState
// Example: dispatch(loadEngineStatusThunk())

fetchSystemStatusThunk()
// Calls electronAPI.getSystemStatus()
// Dispatches: setSystemStatus, setAvailableEngines
// Example: dispatch(fetchSystemStatusThunk())

detectEngineThunk({engine: "stockfish" | "lc0"})
// Calls electronAPI.detectEngine(engine)
// Returns: {found: boolean, path?: string}
// Example:
const result = await dispatch(detectEngineThunk({engine: "stockfish"}))

browseForEngineThunk({engine: "stockfish" | "lc0"})
// Calls electronAPI.browseForEngine(engine)
// Returns: {selected: boolean, valid: boolean, path?: string}
// Example:
const result = await dispatch(browseForEngineThunk({engine: "lc0"}))

setEnginePathThunk({engine: string, path: string})
// Calls electronAPI.setEnginePath(engine, path)
// Updates settingsSlice.formState
// Example: dispatch(setEnginePathThunk({engine: "stockfish", path: "/path/to/sf"}))

detectAllEnginesThunk()
// Detects both stockfish and lc0 in parallel
// Dispatches: setAvailableEngines
// Example: dispatch(detectAllEnginesThunk())
```

---

## settingsSlice

### Actions

```ts
settings.actions.setFormField(payload: {key: keyof AppSettings, value: any})
// Usage: dispatch(settings.actions.setFormField({key: "analysisDepth", value: 20}))

settings.actions.setFormState(state: AppSettings)
settings.actions.setLlmApiKeyLength(len: number)
settings.actions.setSettingsSaving(bool)
settings.actions.setConversationHistory(history: ConversationMessage[])
settings.actions.setGameMemory(memory: GameMemoryEntry[])
```

### Selectors

```ts
selectFormState(state)              // AppSettings
selectLLMProvider(state)            // "ollama" | "openai" | "anthropic" | ...
selectLLMModel(state)               // string
selectOllamaModel(state)            // string
selectOllamaBaseUrl(state)          // string
selectLLMApiKeyLength(state)        // number
selectSelectedEngine(state)         // "stockfish" | "lc0"
selectAnalysisDepth(state)          // number
selectExplainLanguage(state)        // string
selectPuzzleRatingRange(state)      // {min: number, max: number}
selectSettingsSaving(state)         // boolean
selectConversationHistory(state)    // ConversationMessage[]
selectGameMemory(state)             // GameMemoryEntry[]
selectIsLLMValid(state)             // boolean (checks provider, model, apiKey)
selectLLMModelForProvider(state)    // (provider) => string (smart selector)
```

### Thunks

```ts
saveSettingsThunk({
  selectedEngine: string,
  stockfishPath?: string,
  lc0Path?: string,
  analysisDepth?: number,
  explainLanguage?: string,
  ollamaModel?: string,
  ollamaBaseUrl?: string,
  llmProvider?: string,
  llmModel?: string,
  llmApiKey?: string,
  puzzleRatingMin?: number,
  puzzleRatingMax?: number,
  otbImportDir?: string
})
// Validates and persists all settings
// Calls: electronAPI.setEnginePath(), electronAPI.updateAppSettings()
// Dispatches: setEngineStatus (with new config)
// Example: dispatch(saveSettingsThunk({selectedEngine: "stockfish", analysisDepth: 20}))

changeOllamaModelThunk(modelName: string)
// Calls electronAPI.setOllamaModel(modelName)
// Dispatches: setFormField({key: "ollamaModel", value: modelName})
// Example: dispatch(changeOllamaModelThunk("qwen:7b"))

loadConversationHistoryThunk(mode: "puzzle" | "game" | "analysis" | "opening" | "endgame" | "middlegame")
// Loads from localStorage or file
// Dispatches: setConversationHistory
// Example: dispatch(loadConversationHistoryThunk("analysis"))

saveConversationHistoryThunk({
  mode: string,
  history: ConversationMessage[]
})
// Persists to localStorage
// Example: dispatch(saveConversationHistoryThunk({mode: "puzzle", history: [...]}))

loadGameMemoryThunk()
// Dispatches: setGameMemory
// Example: dispatch(loadGameMemoryThunk())

validateLLMSettingsThunk()
// Returns: {valid: boolean, error?: string}
// Example:
const {valid, error} = await dispatch(validateLLMSettingsThunk())
```

---

## puzzleSlice

### Actions

```ts
puzzle.actions.loadPuzzle(payload: {
  fen: string,
  solution: string[],
  solutionSan: string[],
  meta?: {themes, difficulty, rating}
})
// Usage: dispatch(puzzle.actions.loadPuzzle({fen, solution, solutionSan, meta}))

puzzle.actions.recordAttemptMove(uci: string)
// Usage: dispatch(puzzle.actions.recordAttemptMove("e2e4"))

puzzle.actions.resetAttempt()
// Clears puzzleAttemptMoves but keeps solution

puzzle.actions.toggleShowSolution(bool)
puzzle.actions.setPuzzleIncorrect(bool)
puzzle.actions.setPuzzleNavigationMode(bool)

puzzle.actions.clearPuzzle()
// Resets all puzzle state
```

### Selectors

```ts
selectPuzzleStartFen(state)         // string
selectPuzzleSolution(state)         // string[]
selectPuzzleSolutionSan(state)      // string[]
selectPuzzleAttemptMoves(state)     // string[]
selectPuzzleMeta(state)             // {themes, difficulty, rating} | null
selectIsInPuzzleMode(state)         // boolean (fen !== "")
selectShowSolution(state)           // boolean
selectPuzzleNavigationMode(state)   // boolean
selectPuzzleCorrect(state)          // boolean (attemptLength === solution.length)
selectPuzzleIncorrect(state)        // boolean
selectNextExpectedMove(state)       // string (puzzle.solution[attemptMoves.length])
selectCurrentPuzzlePosition(state)  // string (derives FEN from attemptMoves)
```

### Thunks

```ts
explainIncorrectMoveThunk({
  puzzleFen: string,
  solutionUci: string[],
  solutionSan: string[],
  userMovesUci: string[],
  userMovesSan: string[],
  themes: string,
  difficulty: string,
  rating: number,
  language: string,
  llmProvider: string,
  model: string,
  baseUrl?: string,
  llmApiKey?: string
})
// Calls electronAPI.puzzleExplainIncorrect()
// Dispatches response to response.actions.setQuestionResponse()
// Example:
dispatch(explainIncorrectMoveThunk({puzzleFen, solutionUci, ..., language, llmProvider, ...}))
```

---

## trainingSlice

### Actions

```ts
training.actions.loadTraining(payload: {
  startFen: string,
  moves: Array<{uci, san, commentary}>
})
// Usage: dispatch(training.actions.loadTraining({startFen, moves}))

training.actions.advanceTrainingMove()
training.actions.retreatTrainingMove()
training.actions.setTrainingLabel(label: string)
training.actions.clearTraining()
```

### Selectors

```ts
selectTrainingMoveIndex(state)      // number
selectTrainingMoves(state)          // Array<{uci, san, commentary}>
selectCurrentTrainingMove(state)    // {uci, san, commentary} | null
selectTrainingPosition(state)       // string (derives FEN from moves)
selectIsTrainingActive(state)       // boolean (moves.length > 0)
selectTrainingProgress(state)       // {current: number, total: number}
selectTrainingMoveLabel(state)      // string
```

---

## gameSlice

### Actions

```ts
game.actions.setGameMode(bool)

game.actions.setGameList(list: GameRow[] | null)

game.actions.setCurrentGame(payload: {
  info: GamePlayerInfo,
  pgnFens: string[],
  moveIndex: number
})
// Usage: dispatch(game.actions.setCurrentGame({info, pgnFens, moveIndex}))

game.actions.setGameMoveIndex(idx: number)
game.actions.setGameEcoLabel(label: string)
game.actions.clearGame()
```

### Selectors

```ts
selectGameMode(state)               // boolean
selectGameList(state)               // GameRow[] | null
selectCurrentGameInfo(state)        // GamePlayerInfo | null
selectGameMoveIndex(state)          // number
selectGamePgnFens(state)            // string[]
selectGamePosition(state)           // string (pgnFens[moveIndex])
selectIsGameLoaded(state)          // boolean (gameMode && currentGameInfo !== null)
selectGameEcoLabel(state)           // string
```

---

## responseSlice

### Actions

```ts
response.actions.setResponseType(type: ResponseType)
// "Analysis" | "Puzzle" | "Position" | "Game" | "GameList" | "Opening" | "Middlegame" | "Endgame"

response.actions.setResponseData(data: Record<string, any>)

response.actions.setQuestionText(text: string)
response.actions.setQuestionResponse(response: string)
response.actions.setQuestionLoading(bool)

response.actions.setCurrentOpening(opening: {name: string, eco: string} | null)
response.actions.setAnalysisEcoLabel(label: string)

response.actions.clearResponse()
// Resets type, data, response, loading to defaults
```

### Selectors

```ts
selectResponseType(state)           // ResponseType
selectResponseData(state)           // Record<string, any>
selectQuestionText(state)           // string
selectQuestionResponse(state)       // string
selectQuestionLoading(state)        // boolean
selectCurrentOpening(state)         // {name, eco} | null
selectAnalysisEcoLabel(state)       // string
selectIsAnalysisResponse(state)     // boolean
selectIsPuzzleResponse(state)       // boolean
selectIsTrainingResponse(state)     // boolean
selectIsGameResponse(state)         // boolean
selectIsSingleGameResponse(state)   // boolean
```

### Thunks

```ts
askQuestionThunk({
  question: string,
  fen: string,
  lines: AnalysisLine[],
  language: string,
  llmProvider: string,
  model: string,
  baseUrl?: string,
  llmApiKey?: string
})
// Main orchestrator for two-pass LLM pipeline
// PASS 1: Classification (detect responseType)
// PASS 2: Generation (get answer, solution, etc.)
//
// Dispatches:
//   - ui.actions.setQuestionLoading(true)
//   - response.actions.setResponseType(type)
//   - response.actions.setResponseData(data)
//   - Based on type:
//       - "Puzzle": puzzle.actions.loadPuzzle(...)
//       - "Opening/Endgame/Middlegame": training.actions.loadTraining(...)
//       - "Game": game.actions.setCurrentGame(...)
//       - "GameList": game.actions.setGameList(...)
//       - "Analysis": analysis.actions.clearAnalysis()
//       - "Position": board.actions.setCurrentFen(...) + analyzePositionThunk(...)
//   - response.actions.setQuestionResponse(answer)
//   - ui.actions.setQuestionLoading(false)
//
// Example:
dispatch(askQuestionThunk({
  question: "Analyze this position",
  fen: currentFen,
  lines: analysisLines,
  language: "English",
  llmProvider: "ollama",
  model: "qwen:8b"
}))

ecoLookupThunk(fen: string)
// Calls electronAPI.ecoLookupFen(fen)
// Dispatches: setAnalysisEcoLabel() or setGameEcoLabel()
// Returns: {name, eco} | null
// Example:
const eco = await dispatch(ecoLookupThunk(currentFen))
```

---

## Common Usage Patterns

### Analyzing a Position
```ts
dispatch(ui.actions.setAnalysisLoading(true));
dispatch(analyzePositionThunk({
  engine: selectSelectedEngine(getState()),
  fen: currentFen,
  depth: selectAnalysisDepth(getState()),
  multiPv: 4
})).then(() => {
  dispatch(ui.actions.setAnalysisLoading(false));
});
```

### Selecting a Line & Drilling In
```ts
dispatch(analysis.actions.selectEngineLine({
  lineIndex: 0,
  baseFen: selectCurrentFen(getState())
}));
// Automatically:
//   - Plays first move
//   - Analyzes new position
//   - Fetches explanation
```

### Keyboard Navigation
```ts
if (event.key === "ArrowRight") {
  if (selectSelectedLineIndex(getState()) !== null) {
    dispatch(analysis.actions.incrementMoveIndex());
    // Listener will update FEN and fetch explanation
  }
}
```

### Changing Settings
```ts
dispatch(settings.actions.setFormField({
  key: "analysisDepth",
  value: 20
}));
// When user clicks "Save":
dispatch(saveSettingsThunk({analysisDepth: 20, ...otherSettings}));
```

### Loading a Puzzle
```ts
dispatch(response.actions.setQuestionLoading(true));
dispatch(askQuestionThunk({
  question: "Load puzzle 12345",
  fen: "start",
  lines: [],
  language: "English",
  llmProvider: selectLLMProvider(getState()),
  model: selectLLMModel(getState())
}))
// Thunk sees responseType="Puzzle" and dispatches:
//   - puzzle.actions.loadPuzzle({fen, solution, solutionSan, meta})
//   - board.actions.setCurrentFen(fen)
```

---

## Notes

- All thunks accept `{dispatch, getState}` as second parameter
- All selectors are pure functions: `(state: RootState) => T`
- Selectors can be composed: `selectIsAnyLoading = (s) => selectAnalysisLoading(s) || selectDeepLoading(s) || ...`
- Use `useAppSelector(selectX)` and `useAppDispatch()` in components
- Use `reselect.createSelector()` for complex/memoized selectors
- Thunks can dispatch other thunks: `dispatch(analyzePositionThunk(...)).then(...)`

