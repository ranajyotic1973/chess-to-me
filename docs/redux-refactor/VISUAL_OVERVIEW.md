# Redux Architecture — Visual Overview

## Store Shape at a Glance

```
RootState = {
  ┌─ board                    ← Board position & square selection
  │  ├─ currentFen: "rnbqkb..."
  │  ├─ selectedSquare: "e4" | null
  │  └─ moveHistory: ["e2e4", ...]
  │
  ├─ analysis                 ← Engine analysis (top lines, navigation)
  │  ├─ lines: AnalysisLine[]
  │  ├─ entries: AnalysisEntry[]
  │  ├─ selectedLineIndex: 2 | null
  │  ├─ currentMoveIndex: 0
  │  ├─ explorationStack: [{fen, lines, entries, listResponse}, ...]
  │  ├─ explanations: {0: "Best move is...", 1: "..."}
  │  └─ deepAnalysisResults: {0: {strategy, proscons, ...}, ...}
  │
  ├─ ui                       ← Loading states, dialogs, messages, window
  │  ├─ analysisLoading: false
  │  ├─ analysisStatus: ""
  │  ├─ deepAnalysisLoading: false
  │  ├─ isDrillLoading: false
  │  ├─ viewMode: "analysis" | "settings"
  │  ├─ advancedAnalysisMode: false
  │  ├─ statusMessage: ""
  │  ├─ snackbarOpen: false
  │  ├─ snackbarMessage: ""
  │  ├─ windowSize: {width, height}
  │  ├─ agentStatuses: [...]
  │  └─ logEntries: {stockfish: [], ollama: []}
  │
  ├─ engine                   ← Engine configuration & status
  │  ├─ engineStatus: {configured, selectedEngine, ...}
  │  ├─ systemStatus: {stockfishFound, lc0Found, ...}
  │  ├─ availableEngines: [{name: "stockfish", path, status}, ...]
  │  ├─ engineWarming: false
  │  ├─ engineAnalyzing: false
  │  ├─ appLoading: true
  │  └─ settingsLoaded: false
  │
  ├─ settings                 ← User preferences & configuration
  │  ├─ formState: {selectedEngine, analysisDepth, llmProvider, ...}
  │  ├─ llmApiKeyLength: 48
  │  ├─ settingsSaving: false
  │  ├─ conversationHistory: [{role, message, timestamp}, ...]
  │  └─ gameMemory: [{pgn, annotations, timestamp}, ...]
  │
  ├─ puzzle                   ← Puzzle mode state
  │  ├─ puzzleStartFen: "r1bqkb1r..."
  │  ├─ puzzleSolution: ["e2e4", "c7c5", ...]
  │  ├─ puzzleSolutionSan: ["e4", "c5", ...]
  │  ├─ puzzleAttemptMoves: ["e2e4"]  ← User's moves so far
  │  ├─ puzzleNavigationMode: false
  │  ├─ puzzleIncorrect: false
  │  ├─ showSolution: false
  │  ├─ puzzleMeta: {themes, difficulty, rating}
  │  └─ puzzleExplainLoading: false
  │
  ├─ training                 ← Opening/Endgame training mode
  │  ├─ trainingMoves: [{uci: "e2e4", san: "e4", commentary: "..."}, ...]
  │  ├─ trainingMoveIndex: 2
  │  ├─ trainingStartFen: "rnbqkbnr/..."
  │  └─ trainingMoveLabel: "3. ♘f3"
  │
  ├─ game                     ← Game browsing mode
  │  ├─ gameMode: false
  │  ├─ gameList: [{id, white, black, result}, ...] | null
  │  ├─ currentGameInfo: {white, black, whiteElo, blackElo}
  │  ├─ gamePgnFens: ["rnbq...", "rnbq..."]
  │  ├─ gameMoveIndex: 0
  │  └─ gameEcoLabel: "Sicilian Defense (B26)"
  │
  └─ response                 ← LLM responses & conversation
     ├─ responseType: "Analysis" | "Puzzle" | "Game" | "Opening" | ...
     ├─ responseData: {fen, solution, moves, ...}
     ├─ questionText: "Analyze this position"
     ├─ questionResponse: "White has several candidate moves..."
     ├─ questionLoading: false
     ├─ currentOpening: {name: "Ruy Lopez", eco: "C65"} | null
     └─ analysisEcoLabel: "Ruy Lopez (C60)"
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Redux Store (Single Source of Truth)            │
└─────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ (selectors)
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        │                                                             │
    ┌───┴─────┐                                                  ┌───┴─────┐
    │Components│                                                │Listeners│
    │(React)  │                                                │(Electron)
    └───┬─────┘                                                └───┬─────┘
        │ (dispatch)                                               │ (listen)
        │                                                          │
        │  ┌────────────────────────────────────────────┐         │
        │  │          Middleware Layer                   │         │
        │  ├────────────────────────────────────────────┤         │
        │  │ • autoDismissMiddleware (status messages)  │         │
        │  │ • logger (Redux DevTools)                  │         │
        │  │ • thunk (async operations)                 │         │
        │  └────────────────────────────────────────────┘         │
        │                    ▲                                     │
        │                    │                                     │
        └────────────────────┼─────────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      │  Action     │ ◄─ electronAPI event
                      │  {type, ..} │
                      └──────▲──────┘
                             │
                    ┌────────┴────────┐
                    │ Thunks/Reducers  │
                    │ (side effects)   │
                    └──────────────────┘
```

---

## Component Interaction Diagram

### Before Redux (Current — Scattered State)

```
App.tsx (60+ useState)
├── currentFen, selectedFen, moveHistory
├── analysisLines, analysisEntries, selectedLineIndex
├── formState, engineStatus
├── puzzleSolution, puzzleStartFen
├── conversationHistory, gameMemory
└── ... 40 more state variables

    ↓ prop drilling (20+ props)

┌─────────────────┬──────────────────┬──────────────────┐
│  AnalysisBoard  │   ChatPanel      │  SettingsPanel   │
│                 │                  │                  │
│ recv: currentFen│ recv: analysisLines│ recv: formState
│        selectedFen
│        onBoardMove│        selectedIdx
│        onMoveAttempt│ dispatch: onSelectLine
│        ...       │        onAskQuestion
│                 │        ...
└─────────────────┴──────────────────┴──────────────────┘

PROBLEMS:
✗ Prop drilling hell (20+ props to 3 components)
✗ Manual sync (setCurrentFen + setAnalysisLines separate)
✗ State scattered across files
✗ Stale closures (need refs)
✗ Hard to test (props everywhere)
```

### After Redux (Centralized State)

```
                        Redux Store
                    (9 slices, 1 source of truth)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────┴───┐          ┌────┴───┐         ┌────┴──┐
   │  board │          │analysis │         │   ui  │
   │ engine │          │ settings│         │ puzzle│
   │ response          │ game    │         │others │
   └────────┘          └─────────┘         └───────┘

        ↓ selectors (no drilling)
   
┌─────────────────┬──────────────────┬──────────────────┐
│  AnalysisBoard  │   ChatPanel      │  SettingsPanel   │
│                 │                  │                  │
│ useSelector:    │ useSelector:     │ useSelector:     │
│  - currentFen   │  - analysisLines │  - formState     │
│  - selectedSq   │  - selectedIdx   │  - settingsSaving│
│ useDispatch:    │ useDispatch:     │ useDispatch:     │
│  - handleDrop   │  - selectLine    │  - saveSettings  │
│                 │  - askQuestion   │                  │
└─────────────────┴──────────────────┴──────────────────┘

BENEFITS:
✓ No prop drilling
✓ Each component takes only what it needs
✓ Single source of truth (no manual sync)
✓ Selectors prevent unnecessary re-renders
✓ Easy to test (dispatch actions, check state)
✓ Side effects in thunks (not scattered in effects)
```

---

## Action Dispatch Sequence — Example Flow

### User Loads a Position

```
1. User types FEN in ChatPanel
   └─ dispatch(askQuestionThunk({question, fen, ...}))

2. Thunk starts
   ├─ dispatch(ui.setQuestionLoading(true))
   ├─ Calls electronAPI.askQuestion() [PASS 1 + 2]
   └─ Receives response {response_type: "Position", fen, answer}

3. Thunk routes based on response_type
   ├─ response.setResponseType("Position")
   ├─ response.setResponseData({fen, ...})
   ├─ board.setCurrentFen(fen)
   └─ dispatch(analyzePositionThunk({engine, fen, depth, multiPv}))

4. analyzePositionThunk starts
   ├─ dispatch(ui.setAnalysisLoading(true))
   ├─ Calls electronAPI.analyzePosition()
   └─ Receives {analysis: {lines: [...]}}

5. Thunk updates analysis slice
   ├─ analysis.setAnalysisLines(lines)
   ├─ analysis.setAnalysisEntries(entries)
   ├─ dispatch(fetchExplanationsThunk({fen, lines, ...}))
   └─ dispatch(ui.setAnalysisLoading(false))

6. Components re-render
   ├─ AnalysisBoard: useSelector(selectCurrentFen) → updates board
   ├─ ChatPanel: useSelector(selectAnalysisLines) → shows lines
   └─ EvalBar: useSelector(selectAnalysisLines[0]) → shows eval
```

### User Selects an Engine Line

```
1. User clicks line in ChatPanel
   └─ dispatch(analysis.selectEngineLine({lineIndex: 2, baseFen}))

2. Reducer updates state
   ├─ analysis.selectedLineIndex = 2
   ├─ analysis.selectedLineBaseFen = baseFen
   └─ analysis.currentMoveIndex = 0

3. Listener detects selectEngineLine action
   ├─ Derives first move from line
   ├─ dispatch(board.setCurrentFen(newFen))  // Play first move
   ├─ dispatch(analyzePositionThunk({...}))  // Analyze new pos
   └─ dispatch(fetchPerMoveExplanationThunk({...}))  // Explain move

4. Components re-render
   ├─ AnalysisBoard: board moves automatically
   ├─ ChatPanel: shows explanation text
   └─ EvalBar: shows candidate lines from new position
```

### User Presses Arrow Key (Navigation)

```
1. Document.keydown event handler
   └─ dispatch(analysis.incrementMoveIndex())  // arrow right

2. Reducer updates
   ├─ analysis.currentMoveIndex += 1
   └─ State now reflects move 2 of the line

3. Listener watches currentMoveIndex change
   ├─ Derives FEN for move 2 from line pv
   ├─ dispatch(board.setCurrentFen(fen))  // Board updates
   ├─ Check explanation cache
   └─ If not cached: dispatch(fetchPerMoveExplanationThunk({...}))

4. Components re-render
   ├─ AnalysisBoard: position updates
   ├─ ChatPanel: explanation appears (or loads)
   └─ UI shows "Move 2 of N"
```

---

## Slice Dependencies

```
        ┌─────────────────────┐
        │   boardSlice        │  ← Base
        │ (FEN, move history) │
        └──────────┬──────────┘
                   │ reads
       ┌───────────┼───────────┐
       ▼           ▼           ▼
    ┌──────┐  ┌────────┐  ┌─────────┐
    │puzzle│  │training│  │ analysis│
    └──────┘  └────────┘  └─────────┘
       │          │           │
       └──────────┼───────────┘ reads
                  ▼
        ┌─────────────────────┐
        │   responseSlice     │  ← Orchestrator
        │ (LLM responses,     │
        │  auto-dispatch to   │
        │  other slices)      │
        └─────────────────────┘

┌──────────────────────────────────────────┐
│  Independent Slices (no deps)            │
├──────────────────────────────────────────┤
│ • uiSlice (loading flags, messages)      │
│ • engineSlice (engine config)            │
│ • settingsSlice (form state, caches)     │
│ • gameSlice (game browsing)              │
└──────────────────────────────────────────┘
```

---

## Loading State Combinations

```
Simple Analysis:
┌──────────────────────────────────┐
│ analysisLoading = true           │
│ deepAnalysisLoading = false      │
│ isDrillLoading = false           │
└──────────────────────────────────┘
    ↓ Engine running

Advanced Analysis:
┌──────────────────────────────────┐
│ analysisLoading = true           │
│ deepAnalysisLoading = true       │  ← LLM also running
│ isDrillLoading = false           │
└──────────────────────────────────┘

Drill Down (Line Selection):
┌──────────────────────────────────┐
│ analysisLoading = false          │
│ deepAnalysisLoading = false      │
│ isDrillLoading = true            │  ← Analyzing new position
│ isExplanationLoading = true      │  ← Fetching explanation
└──────────────────────────────────┘

Combo selector:
selectIsAnyLoading = () => 
  analysisLoading || deepAnalysisLoading || 
  isDrillLoading || isExplanationLoading
```

---

## Response Type → Slice Dispatch Mapping

```
askQuestionThunk receives response from LLM
                    │
        ┌───────────┴───────────┐
        │ response.response_type │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────────────────┐
        │                                   │
   "Analysis"                         "Puzzle"
        │                                   │
   ├─ analysis.clearAnalysis()         ├─ puzzle.loadPuzzle()
   ├─ analyzePositionThunk()           ├─ board.setCurrentFen()
   └─ fetchExplanationsThunk()         └─ (drag moves disabled)
                                       
  "Opening" / "Endgame" / "Middlegame"     "Game" / "GameList"
        │                                   │
   ├─ training.loadTraining()           ├─ game.setCurrentGame() 
   ├─ board.setCurrentFen()             ├─ board.setCurrentFen()
   └─ (arrow keys step moves)           └─ (arrow keys browse game)

  "Position"
        │
   ├─ board.setCurrentFen()
   ├─ analyzePositionThunk()
   └─ fetchExplanationsThunk()
```

---

## File Organization

```
src/store/
├── index.ts                          (configureStore, setupListeners)
├── hooks.ts                          (useAppDispatch, useAppSelector)
│
├── slices/                           (9 slices)
│   ├── boardSlice.ts
│   ├── analysisSlice.ts
│   ├── uiSlice.ts
│   ├── engineSlice.ts
│   ├── settingsSlice.ts
│   ├── puzzleSlice.ts
│   ├── trainingSlice.ts
│   ├── gameSlice.ts
│   └── responseSlice.ts
│
├── middleware/
│   └── autoDismissMiddleware.ts
│
└── thunks/                           (organized by domain)
    ├── analysisThunks.ts             (5 thunks)
    ├── engineThunks.ts               (6 thunks)
    ├── settingsThunks.ts             (6 thunks)
    ├── responseThunks.ts             (1 main thunk)
    └── puzzleThunks.ts               (1 thunk)

Total: 9 slices, 19 thunks, 80+ selectors
Reduces: 60+ useState hooks to 1 Redux store
```

---

## Key Redux Concepts Used

| Concept | Usage |
|---------|-------|
| **Slices** | One for each domain (board, analysis, ui, etc.) |
| **Actions** | Synchronous state updates (setText, setLoading, etc.) |
| **Reducers** | Pure functions that update slice state |
| **Selectors** | Pure functions to extract data (useSelector) |
| **Thunks** | Async operations (API calls, side effects) |
| **Listeners** | React to specific actions (selectEngineLine → analyze) |
| **Middleware** | Auto-dismiss messages after 2s |
| **createSelector** | Memoized selectors to prevent re-renders |

---

## Migration Impact

| Aspect | Before | After |
|--------|--------|-------|
| **State variables** | 60+ useState | 1 Redux store |
| **Prop drilling** | 20+ props to components | 0 props (selectors) |
| **Manual sync** | Multiple setters in one effect | 1 dispatch, Redux handles sync |
| **Testing** | Mock components + props | Dispatch actions, check state |
| **Callback deps** | 15+ items | 0 (thunks don't close over state) |
| **Ref updates** | 5 refs (formStateRef, etc.) | 0 (use getState in thunks) |
| **Stale data bugs** | Common (wrong FEN, old lines) | 0 (single source of truth) |

---

## Performance Considerations

```
Selector Memoization:
┌─────────────────────────────────────────────┐
│ Without reselect:                           │
│ selectAnalysisLines(state) returns new []   │
│   even if lines didn't change               │
│   → component re-renders unnecessarily      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ With reselect:                              │
│ selectAnalysisLines(state) returns same []  │
│   reference if lines didn't change          │
│   → component doesn't re-render             │
└─────────────────────────────────────────────┘

Example:
const selectAnalysisLinesWithMemo = createSelector(
  [state => state.analysis.lines],
  lines => lines  // Only runs if lines reference changed
);
```

---

## Testing Pyramid

```
                   ▲
                  ╱ ╲
                 ╱   ╲ E2E Tests
                ╱ (1) ╲ (Manual or Cypress)
               ╱───────╲
              ╱         ╲
             ╱           ╲
            ╱ Integration  ╲ (Thunks, full flows)
           ╱  Tests (10)   ╲
          ╱─────────────────╲
         ╱                   ╲
        ╱  Unit Tests (50)    ╲ (Slices, selectors, thunks)
       ╱───────────────────────╲
      ╱─────────────────────────╲
     ╱_____________________________╲

Unit Test Examples:
✓ board.setCurrentFen() produces correct state
✓ analysis.selectEngineLine() clears moveIndex
✓ selectIsAnyLoading returns true iff any flag is true

Integration Test Examples:
✓ analyzePositionThunk dispatches setAnalysisLines
✓ askQuestionThunk with "Puzzle" response calls puzzle.loadPuzzle()
✓ selectEngineLine triggers analyzePositionThunk

E2E Test Examples:
✓ Load position → analyze → select line → arrow keys navigate
✓ Load puzzle → make moves → incorrect → show solution
```

