# Redux Architecture Design — Complete Package

This package contains a comprehensive Redux refactor design for the Chess To Me application. It consolidates 60+ scattered `useState` calls and complex prop drilling into a clean, centralized state management system.

## 📚 Documents Included

### 1. **REDUX_ARCHITECTURE.md** — Core Design Document
**Best for:** Understanding the overall architecture, what goes in each slice, and why.

**Contains:**
- Executive summary of problems and solutions
- Complete store shape (all 9 slices)
- Detailed slice definitions with actions, thunks, and selectors
- Middleware and utility setup
- Key design decisions and rationale
- File structure proposal

**Key sections:**
- Store Shape (full JSON structure)
- Slice Definitions (boardSlice, analysisSlice, uiSlice, engineSlice, settingsSlice, puzzleSlice, trainingSlice, gameSlice, responseSlice)
- Thunks (analyzePosition, askQuestion, saveSettings, etc.)
- Selectors (80+ selectors with memoization)
- Middleware (auto-dismiss messages)
- Component integration examples (Before/After)
- Summary table of all slices

**Read this first** to understand the "what" and "why".

---

### 2. **IMPLEMENTATION_CHECKLIST.md** — Step-by-Step Tasks
**Best for:** Executing the refactor. Use as a checklist to track progress.

**Contains:**
- 5 phases of migration (1–5 days each)
- Detailed task list for each slice (create file, define state, actions, selectors, tests)
- Phase-by-phase breakdown:
  - Phase 1: Store setup (boardSlice, analysisSlice, etc.)
  - Phase 2: Async operations (thunks for analysis, engine, settings, response, puzzle)
  - Phase 3: Refactor App.tsx (remove useState, add dispatch/selector)
  - Phase 4: Simplify child components (AnalysisBoard, ChatPanel, etc.)
  - Phase 5: Optimize and test
- Testing strategy (unit, integration, E2E)
- Git commit strategy (9 commits)
- Rollback plan
- Success criteria checklist

**Read this** when actually implementing — use it as your task tracker.

---

### 3. **ACTION_REFERENCE.md** — Quick Lookup Guide
**Best for:** Fast reference while coding. Lists all actions, thunks, and selectors.

**Contains:**
- All 9 slices with:
  - Action signatures and usage examples
  - Selector signatures and return types
  - Thunk signatures with parameters and dispatch effects
- Common usage patterns (analyzing, drilling, navigation, etc.)
- Notes on best practices

**Keep this open** during development for quick copy-paste of action/selector names.

---

### 4. **VISUAL_OVERVIEW.md** — Diagrams and Flow Charts
**Best for:** Visual learners and architecture review meetings.

**Contains:**
- Store shape at a glance (ASCII tree)
- Data flow diagram (Redux, components, listeners)
- Component interaction before/after Redux
- Action dispatch sequence examples (3 detailed flows)
- Slice dependencies diagram
- Loading state combinations
- Response type → slice dispatch mapping
- File organization tree
- Migration impact table
- Testing pyramid

**Share this** with the team to align on architecture.

---

## 🎯 How to Use This Package

### Scenario 1: "I'm starting the refactor"
1. Read **REDUX_ARCHITECTURE.md** (30 min) — Understand the design
2. Skim **VISUAL_OVERVIEW.md** (15 min) — See the diagrams
3. Start Phase 1 in **IMPLEMENTATION_CHECKLIST.md**
4. Keep **ACTION_REFERENCE.md** bookmarked

### Scenario 2: "I'm implementing Phase N"
1. Go to the phase section in **IMPLEMENTATION_CHECKLIST.md**
2. Copy the task list into your ticket/PR
3. Use **ACTION_REFERENCE.md** to look up action names
4. Reference examples in **REDUX_ARCHITECTURE.md** if unsure

### Scenario 3: "I'm reviewing the design"
1. Read **REDUX_ARCHITECTURE.md** for rationale
2. Look at **VISUAL_OVERVIEW.md** for diagrams
3. Check **IMPLEMENTATION_CHECKLIST.md** for effort estimate
4. Use **ACTION_REFERENCE.md** to verify completeness

### Scenario 4: "Someone is asking how Redux is structured"
1. Show them **VISUAL_OVERVIEW.md** (store shape tree, diagrams)
2. Show them **REDUX_ARCHITECTURE.md** (slice table)
3. Share **ACTION_REFERENCE.md** for details

---

## 📊 High-Level Summary

### What Problem Does This Solve?

**Current State (App.tsx):**
```
60+ useState calls scattered across 1700 lines
20+ props drilled to child components
Manual sync bugs (setCurrentFen + setAnalysisLines separate)
Stale closures (need 5 refs to access latest state)
Hard to test (components tightly coupled via props)
```

**With Redux:**
```
1 centralized store (single source of truth)
0 prop drilling (components use selectors)
Automatic sync (one action updates related state)
No refs needed (thunks use getState)
Easy to test (dispatch actions, check state)
```

### The 9 Slices

| Slice | Purpose | Key State |
|-------|---------|-----------|
| **board** | Board position & selection | `currentFen`, `selectedSquare`, `moveHistory` |
| **analysis** | Engine lines & navigation | `lines`, `entries`, `selectedLineIndex`, `currentMoveIndex`, `explorationStack` |
| **ui** | Loading states & dialogs | `analysisLoading`, `statusMessage`, `snackbar`, `windowSize`, `logEntries` |
| **engine** | Engine config & status | `engineStatus`, `systemStatus`, `availableEngines`, `appLoading` |
| **settings** | User preferences & caches | `formState`, `conversationHistory`, `gameMemory` |
| **puzzle** | Puzzle mode state | `puzzleStartFen`, `puzzleSolution`, `puzzleAttemptMoves` |
| **training** | Opening/Endgame training | `trainingMoves`, `trainingMoveIndex`, `trainingStartFen` |
| **game** | Game browsing mode | `gameMode`, `gameList`, `currentGameInfo`, `gamePgnFens` |
| **response** | LLM responses | `responseType`, `responseData`, `questionResponse`, `currentOpening` |

### Key Actions (Examples)

```
board.setCurrentFen(fen)                    // Update position
analysis.selectEngineLine({idx, fen})       // Select line → triggers analysis
analysis.incrementMoveIndex()               // Arrow right → update board
puzzle.loadPuzzle({fen, solution, ...})     // Load puzzle from LLM
response.setResponseType(type)              // Update LLM response type
engine.setEngineStatus(status)              // Update engine config
settings.setFormField({key, value})         // Update setting
ui.setStatusMessage(msg)                    // Show message (auto-dismisses 2s)
```

### Key Thunks (Examples)

```
analyzePositionThunk({engine, fen, depth, multiPv})
  → Calls engine, dispatches setAnalysisLines + setAnalysisEntries

askQuestionThunk({question, fen, language, ...})
  → Two-pass LLM pipeline, dispatches to correct slice based on responseType
  → "Puzzle" → puzzle.loadPuzzle()
  → "Opening" → training.loadTraining()
  → "Game" → game.setCurrentGame()

fetchExplanationsThunk({fen, lines, ...})
  → Get LLM explanations for each line

saveSettingsThunk({...AppSettings})
  → Validate and persist user settings

loadEngineStatusThunk()
  → Bootstrap: load engine config on app init
```

### Data Flow

```
User Action (click, keyboard, drag)
         ↓
dispatch(action or thunk)
         ↓
Redux Store (updated state)
         ↓
Selectors read new state
         ↓
Components re-render with new data
```

---

## 🚀 Quick Start

1. **Understand the Design** (1 hour)
   - Read REDUX_ARCHITECTURE.md (the big picture)
   - Glance at VISUAL_OVERVIEW.md (the diagrams)

2. **Plan the Work** (30 min)
   - Break IMPLEMENTATION_CHECKLIST.md into PRs
   - Estimate: ~2–3 weeks for 1 developer, 5 phases

3. **Start Phase 1** (1–2 days)
   - Create src/store/slices/ directory
   - Create each slice file with actions, reducers, selectors
   - Create store/index.ts with configureStore()
   - Wire up in App.tsx (useEffect that calls setupElectronListeners)

4. **Implement Thunks** (2–3 days)
   - Create src/store/thunks/ directory
   - Export each thunk (analyzePosition, askQuestion, saveSettings, etc.)
   - Test each thunk independently

5. **Refactor Components** (2–3 days)
   - Remove useState calls one slice at a time
   - Replace with useSelector + useDispatch
   - Remove prop drilling
   - Test components still work

6. **Optimize & Polish** (1 day)
   - Add reselect memoization
   - Fix performance issues
   - Run full regression test

---

## 💡 Key Design Decisions

### Why 9 slices, not fewer?
Each slice corresponds to a conceptual domain (board, analysis, ui, etc.). This makes it easier to find code and reduces reducer complexity.

### Why thunks for async, not listeners?
Thunks are the Redux Toolkit standard for async. They give us access to `dispatch` and `getState`, making it easy to chain operations.

### Why auto-dismiss middleware?
Transient messages (status, analysis status) appear for 2s then vanish. Middleware centralizes this logic instead of scattering `useEffect` timers in components.

### Why are puzzle/training/game separate slices?
These are exclusive modes — you're either in puzzle mode, training, or game browsing. Separate slices make mode logic clearer.

### Why cache conversationHistory in Redux?
It's loaded once on app init and rarely changes size. Redux keeps it in memory, avoiding disk I/O on every message.

### Why keep selectedSquare in boardSlice, not uiSlice?
Square highlighting is semantically board state, not UI state. It conceptually belongs with the FEN.

### Why clearAnalysis() on position change?
When the user makes a real board move, the old engine lines become stale. Clear them so stale data doesn't linger.

---

## 📈 Effort Estimate

- **Phase 1** (Store Setup): 1–2 days (8 slice files, ~100 lines each)
- **Phase 2** (Thunks): 2–3 days (5 thunk files, ~50–200 lines each)
- **Phase 3** (Refactor App.tsx): 2–3 days (remove 60+ useState, wire selectors/dispatch)
- **Phase 4** (Simplify Components): 1–2 days (AnalysisBoard, ChatPanel, SettingsPanel)
- **Phase 5** (Optimize): 1 day (memoization, testing, polish)

**Total: ~2–3 weeks (1 developer, full-time)**

---

## ✅ Success Criteria

After migration, verify:
- [ ] All 60+ `useState` calls removed from App.tsx
- [ ] No prop drilling (components use selectors)
- [ ] No manual state sync bugs (Redux is source of truth)
- [ ] All thunks tested (unit tests)
- [ ] All selectors tested (unit tests)
- [ ] Full regression testing passed (manual test all features)
- [ ] App startup time same as before (<2s)
- [ ] No unexpected re-renders (React DevTools profiler)
- [ ] All existing features work identically

---

## 🔗 Reference

### Redux Toolkit Docs
- https://redux-toolkit.js.org/
- https://redux.js.org/

### Related Patterns in This Design
- **Normalized state** (analysis.entries mirrors analysis.lines)
- **Exploration stack** (breadcrumb trail for drilling into lines)
- **Derived state** (selectors compute FEN from moves + startFen)
- **Thunk caching** (explanationCache ref in closure)
- **Middleware** (autoDismiss for messages)

---

## 📝 Notes for the Team

1. **This is a refactor, not a feature** — Behavior stays identical, code structure improves.

2. **Start small** — Migrate one slice at a time, test at each step. Don't try to do all 9 at once.

3. **Test often** — Each phase should pass unit tests before moving to the next.

4. **Use DevTools** — Redux DevTools extension helps visualize actions and state.

5. **Ask questions** — If a slice design is unclear, refer to VISUAL_OVERVIEW.md or post in team chat.

6. **Parallel work** — Phases are mostly sequential, but Phase 1 (slices) and Phase 2 (thunks) could be worked on by different people.

---

## 📞 Questions?

If you get stuck:

1. **"What actions does X slice have?"** → Check ACTION_REFERENCE.md
2. **"How do thunks work?"** → See "Async Thunks if any" sections in REDUX_ARCHITECTURE.md
3. **"What's the data flow?"** → Look at diagrams in VISUAL_OVERVIEW.md
4. **"What's my next task?"** → Open IMPLEMENTATION_CHECKLIST.md and check the current phase
5. **"Why is Y in Z slice?"** → See "Key Design Decisions" in REDUX_ARCHITECTURE.md

---

## 📄 Document Map

```
README.md (you are here)
  ├─ REDUX_ARCHITECTURE.md ← Start here: understand the design
  ├─ IMPLEMENTATION_CHECKLIST.md ← Use this: execute the refactor
  ├─ ACTION_REFERENCE.md ← Keep handy: quick lookup while coding
  └─ VISUAL_OVERVIEW.md ← Share with team: diagrams & examples
```

---

## Version & Date

- **Version:** 1.0 (Complete Design)
- **Date:** June 30, 2026
- **Status:** Ready for implementation
- **Effort:** ~2–3 weeks (1 developer, full-time)
- **Risk:** Low (refactor only, no behavior change)

---

Good luck with the refactor! 🚀

