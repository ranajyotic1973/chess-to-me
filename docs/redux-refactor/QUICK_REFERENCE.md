# Redux Quick Reference Card

Print this and keep it on your desk during implementation.

---

## Store Structure (One-Liner for Each Slice)

```
board          FEN, square selection, move history
analysis       Engine lines, line navigation, exploration stack
ui             Loading flags, dialogs, messages, window size
engine         Engine config, paths, status, warming/analyzing
settings       Form state, conversation cache, game memory
puzzle         Puzzle position, solution, attempt moves
training       Training moves, current index, position
game           Game mode, game list, current game, move index
response       LLM response type, data, question text, response
```

---

## Action Naming Conventions

```
✓ set<Field>(value)                    // One field
✓ set<Domain>State({...})              // Multiple fields
✓ <verb><Noun>()                       // Actions with side effects
✓ <verb><Noun>Thunk({...})             // Async operations

Examples:
• board.setCurrentFen(fen)
• analysis.selectEngineLine({idx, fen})
• ui.setStatusMessage(msg)
• engine.setEngineStatus(status)
• analyzePositionThunk({...})
• askQuestionThunk({...})
```

---

## Selector Naming Conventions

```
selectXxx(state)                        // Boolean
selectCurrentXxx(state)                 // Current item
selectXxxList(state)                    // Array
selectXxxById(state, id)                // Lookup by id
selectIsXxxLoading(state)               // Loading flag
selectCanXxx(state)                     // Permission/capability
selectXxxOrDefault(state)               // With fallback

Examples:
• selectCurrentFen(state)
• selectAnalysisLines(state)
• selectIsAnalysisLoading(state)
• selectCanGoBack(state)
```

---

## Thunk Naming Conventions

```
<verb><Noun>Thunk({args})               // Async action

Examples:
• analyzePositionThunk({engine, fen, depth})
• askQuestionThunk({question, fen, ...})
• saveSettingsThunk({...settings})
• fetchExplanationsThunk({fen, lines})
• loadEngineStatusThunk()
```

---

## When to Use What

| Need | Use |
|------|-----|
| Update one field | `action: setField(value)` |
| Update multiple fields | `action: setSliceState({...})` |
| Async operation | `thunk: operationThunk({...})` |
| Read state in component | `useSelector(selectXxx)` |
| Dispatch from component | `useDispatch()` then `dispatch(...)` |
| Access state in thunk | `getState()` |
| Side effect after action | Listener (redux-toolkit addListener) |
| Timer-based cleanup | Middleware |

---

## Common Patterns

### Get Latest State in Thunk
```ts
const thunk = (args) => async (dispatch, getState) => {
  const state = getState();
  const currentFen = selectCurrentFen(state);
  // ... use currentFen
};
```

### Dispatch After State Update
```ts
const thunk = async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const result = await fetchData();
    dispatch(setData(result));
  } finally {
    dispatch(setLoading(false));
  }
};
```

### Chain Multiple Thunks
```ts
dispatch(thunk1()).then(() => {
  dispatch(thunk2());
});

// Or in a listener:
store.addListener({
  predicate: (action) => action.type === "slice/action",
  effect: (action, {dispatch}) => {
    dispatch(thunk());
  }
});
```

### Memoized Selector (with reselect)
```ts
import { createSelector } from '@reduxjs/toolkit';

export const selectAnalysisLinesWithMemo = createSelector(
  [state => state.analysis.lines],
  (lines) => lines  // Only runs if lines ref changed
);
```

---

## Quick Lookup

### Board State
```
selectCurrentFen(state)
selectSelectedSquare(state)
selectMoveHistory(state)
selectIsStartPosition(state)
```

### Analysis State
```
selectAnalysisLines(state)
selectSelectedLineIndex(state)
selectCurrentMoveIndex(state)
selectLineExplanation(state, idx)
selectCanGoBack(state)
```

### UI State
```
selectAnalysisLoading(state)
selectStatusMessage(state)
selectViewMode(state)
selectWindowSize(state)
selectIsAnyLoading(state)
```

### Engine State
```
selectEngineStatus(state)
selectIsEngineConfigured(state)
selectSelectedEngine(state)
selectIsPlatformReady(state)
```

### Settings State
```
selectFormState(state)
selectLLMProvider(state)
selectAnalysisDepth(state)
selectIsLLMValid(state)
```

### Puzzle State
```
selectPuzzleStartFen(state)
selectPuzzleSolution(state)
selectPuzzleAttemptMoves(state)
selectPuzzleCorrect(state)
selectIsInPuzzleMode(state)
```

### Training State
```
selectTrainingMoveIndex(state)
selectTrainingMoves(state)
selectCurrentTrainingMove(state)
selectIsTrainingActive(state)
```

### Game State
```
selectGameMode(state)
selectGameList(state)
selectGameMoveIndex(state)
selectIsGameLoaded(state)
```

### Response State
```
selectResponseType(state)
selectQuestionResponse(state)
selectIsPuzzleResponse(state)
selectIsTrainingResponse(state)
```

---

## Thunk Quick Lookup

```
analyzePositionThunk({engine, fen, depth, multiPv})
  ↓ Calls electronAPI.analyzePosition()
  ↓ Dispatches: setAnalysisLines, setAnalysisEntries

askQuestionThunk({question, fen, lines, language, llmProvider, ...})
  ↓ Calls electronAPI.askQuestion() [PASS 1 + 2]
  ↓ Routes to correct slice based on responseType
  ↓ Dispatches: setResponseType, setResponseData, loadPuzzle/loadTraining/setCurrentGame/etc.

fetchExplanationsThunk({fen, lines, language, llmProvider, ...})
  ↓ Calls electronAPI.explainLines()
  ↓ Dispatches: setLineExplanation for each line

saveSettingsThunk({...AppSettings})
  ↓ Calls electronAPI.setEnginePath() + electronAPI.updateAppSettings()
  ↓ Dispatches: setEngineStatus

loadEngineStatusThunk()
  ↓ Calls electronAPI.getEngineStatus()
  ↓ Dispatches: setEngineStatus

fetchSystemStatusThunk()
  ↓ Calls electronAPI.getSystemStatus()
  ↓ Dispatches: setSystemStatus, setAvailableEngines
```

---

## Redux Files to Create

### Phase 1
```
src/store/
├── slices/
│   ├── boardSlice.ts          (state, actions, selectors)
│   ├── analysisSlice.ts       (state, actions, selectors)
│   ├── uiSlice.ts             (state, actions, selectors)
│   ├── engineSlice.ts         (state, actions, selectors)
│   ├── settingsSlice.ts       (state, actions, selectors)
│   ├── puzzleSlice.ts         (state, actions, selectors)
│   ├── trainingSlice.ts       (state, actions, selectors)
│   ├── gameSlice.ts           (state, actions, selectors)
│   └── responseSlice.ts       (state, actions, selectors)
├── index.ts                   (configureStore)
└── hooks.ts                   (useAppDispatch, useAppSelector)
```

### Phase 2
```
src/store/
├── thunks/
│   ├── analysisThunks.ts      (analyzePosition, fetchExplanations, etc.)
│   ├── engineThunks.ts        (loadEngineStatus, detectEngine, etc.)
│   ├── settingsThunks.ts      (saveSettings, changeOllamaModel, etc.)
│   ├── responseThunks.ts      (askQuestion, ecoLookup)
│   └── puzzleThunks.ts        (explainIncorrectMove)
└── middleware/
    └── autoDismissMiddleware.ts
```

---

## Testing Checklist

### Unit Tests
```
☐ Each action produces correct state
☐ Each selector returns expected shape
☐ Thunks dispatch correct sequence
☐ Thunks handle errors
☐ Selectors are memoized (with reselect)
```

### Integration Tests
```
☐ analyzePositionThunk flow works end-to-end
☐ askQuestionThunk routes correctly based on responseType
☐ selectEngineLine triggers analysis & explanation
☐ keyboard navigation updates board & cache
☐ puzzle flow: load → attempt → incorrect → solution
```

### Manual Tests
```
☐ Load position & analyze (board + lines show)
☐ Select engine line (board plays move, new lines show)
☐ Arrow keys navigate (board moves, explanation updates)
☐ Puzzle mode (no dragging, type moves, solution reveal)
☐ Settings change (engine switch, analysis depth)
☐ Window resize (board resizes, window size updates)
```

---

## Debugging Tips

```
Redux DevTools Extension:
  - Install browser extension for Chrome/Firefox
  - See all dispatched actions
  - Time-travel debug (rewind actions)
  - Watch state changes

Console Logging:
  - Add logger middleware to see action flow
  - dispatch(setDebug(true)) to enable debug logging

State Inspection:
  - In browser DevTools: store.getState()
  - Print state at breakpoint
  - Use Redux DevTools to inspect state tree

Thunk Issues:
  - Check getState() returns expected data
  - Verify dispatch() calls are correct
  - Look for race conditions (multiple requests in flight)

Selector Issues:
  - Test selector in isolation: selectXxx(state)
  - Check return type matches component expectation
  - Verify reselect memoization not cached incorrectly
```

---

## Common Mistakes to Avoid

```
❌ Modifying state directly in reducer
   ✓ Redux Toolkit (immer) handles it, but don't rely on it

❌ Keeping async logic out of thunks
   ✓ Always move API calls into thunks

❌ Over-nesting state
   ✓ Keep structure flat; use selectors for derived data

❌ Forgetting to dispatch setLoading(false)
   ✓ Use try/finally to ensure cleanup

❌ Using state in component closure
   ✓ Use getState() in thunks, never capture in ref

❌ Thunk returns old state
   ✓ Thunks don't return state; they dispatch actions

❌ Selector not memoized (causes re-renders)
   ✓ Use createSelector for complex selectors

❌ Props still drilled after Redux migration
   ✓ Remove all props from parent component; use selectors
```

---

## File Size Guide

```
Typical Slice File:
  - State definition: 20 lines
  - Actions: 40 lines
  - Selectors: 60 lines
  Total: ~120 lines per slice

Typical Thunk File:
  - 3–5 thunks, 50–100 lines each
  Total: ~250 lines per thunk file

Store Index:
  - configureStore: 30 lines
  - setupElectronListeners: 50 lines
  Total: ~100 lines
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/store/index.ts` | Store config, listener setup |
| `src/store/hooks.ts` | Typed useAppDispatch, useAppSelector |
| `src/store/slices/*.ts` | One slice per domain (9 files) |
| `src/store/thunks/*.ts` | Async operations (5 files) |
| `src/store/middleware/*.ts` | Middleware (autoDismiss) |
| `src/types/index.ts` | Existing type defs (use as-is) |

---

## Redux Toolkit Essentials

```ts
import { createSlice, createAsyncThunk, configureStore, createSelector } from '@reduxjs/toolkit';

// Slice
const slice = createSlice({
  name: 'domain',
  initialState: {...},
  reducers: {
    action: (state, action) => { state.field = action.payload; }
  }
});
export const { action } = slice.actions;
export default slice.reducer;

// Thunk
export const thunk = createAsyncThunk('domain/thunk', 
  async (args, { dispatch, getState }) => {
    const state = getState();
    // ...
    return result;
  }
);

// Selector
export const selectField = (state) => state.domain.field;
export const selectMemo = createSelector(
  [state => state.domain.field],
  (field) => field  // computed value
);

// Store
const store = configureStore({
  reducer: { domain1: slice1, domain2: slice2 }
});

// Type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T) => useSelector(selector);
```

---

## Slice Template

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface DomainState {
  field1: string;
  field2: number;
}

const initialState: DomainState = {
  field1: '',
  field2: 0
};

const domainSlice = createSlice({
  name: 'domain',
  initialState,
  reducers: {
    setField1: (state, action: PayloadAction<string>) => {
      state.field1 = action.payload;
    },
    setField2: (state, action: PayloadAction<number>) => {
      state.field2 = action.payload;
    }
  }
});

export const { setField1, setField2 } = domainSlice.actions;

export const selectField1 = (state: RootState) => state.domain.field1;
export const selectField2 = (state: RootState) => state.domain.field2;

export default domainSlice.reducer;
```

---

That's it! Print this, bookmark the full docs, and start building. 🚀

