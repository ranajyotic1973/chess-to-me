# Redux Migration Plan

## Overview
Migrate from scattered component state to centralized Redux store to eliminate state sync issues.

## Phase 1: Infrastructure (DONE ✅)
- [x] Install @reduxjs/toolkit and react-redux
- [x] Create store configuration
- [x] Define all slices (board, analysis, ui, engine)
- [x] Create custom hooks (useAppDispatch, useAppSelector)
- [x] Wrap app with Redux Provider

## Phase 2: Create Async Thunks
Create thunks for side effects (API calls, engine analysis):
- [ ] `analyzePositionThunk` - Call engine, dispatch analysis lines
- [ ] `fetchExplanationThunk` - Call LLM for explanations
- [ ] `fetchPerMoveExplanationThunk` - Call LLM for move explanations
- [ ] `loadEngineStatusThunk` - Initialize engine

## Phase 3: Migrate App.tsx
Priority: HIGH (manages most state)

**Current state to migrate:**
- currentFen → board.currentFen
- currentMoveIndex → analysis.currentMoveIndex
- selectedEngineLineIndex → analysis.selectedEngineLineIndex
- analysisLines → analysis.analysisLines
- analysisEntries → analysis.analysisEntries
- analysisLoading → ui.analysisLoading
- advancedAnalysisMode → ui.advancedAnalysisMode
- selectedAnalysisLineId → analysis.selectedAnalysisLineId
- deepAnalysisResults → analysis.deepAnalysisResults

**Current callbacks to convert to dispatches:**
- setCurrentFen → dispatch(setCurrentFen())
- setCurrentMoveIndex → dispatch(setCurrentMoveIndex())
- handleSelectEngineLine → dispatch(selectEngineLine())
- handleBoardMove → dispatch actions for move matching
- runAnalysis → dispatch(analyzePositionThunk())

## Phase 4: Migrate AnalysisBoard
Priority: MEDIUM

**Current state/props:**
- currentFen (prop) → useAppSelector(state => state.board.currentFen)
- setCurrentFen (callback) → useAppDispatch for setCurrentFen
- onBoardMove (callback) → dispatch move handling logic

## Phase 5: Migrate ChatPanel
Priority: MEDIUM

**Current props to convert to selectors:**
- selectedEngineLineIndex → useAppSelector
- currentMoveIndex → useAppSelector
- analysisEntries → useAppSelector
- analysisLines → useAppSelector
- advancedAnalysisMode → useAppSelector

## Phase 6: Migrate Other Components
- SelectableList - may need minimal changes
- SelectedLineDetail - convert to use Redux selectors
- Smaller components - check prop drilling

## Benefits
- ✅ Eliminate state sync bugs (like the highlighting issue)
- ✅ Clear action flow - easier to debug with Redux DevTools
- ✅ Single source of truth - no duplicate state
- ✅ Easier to add features - just dispatch actions
- ✅ Better testability - reducers are pure functions

## Current Issues Fixed by Redux
1. **State sync in AnalysisBoard** - chess.current falling out of sync with visual board
2. **Move highlighting** - currentMoveIndex not updating on board moves
3. **Analysis re-triggering** - can be controlled more precisely with actions
4. **Prop-drilling** - no need to pass callbacks through many layers

## Testing Strategy
1. Create Redux tests for each slice
2. Create integration tests for thunks
3. Keep component tests focused on rendering/UI logic
4. Use Redux DevTools to verify action dispatch order
