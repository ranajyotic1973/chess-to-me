// Store
export { store } from "./store";
export type { RootState, AppDispatch } from "./store";

// Hooks
export { useAppDispatch, useAppSelector } from "./hooks";

// Slices
export {
  setCurrentFen,
  addToMoveHistory,
  resetMoveHistory,
  setSelectedSquare,
  resetBoard,
} from "./slices/boardSlice";

export {
  setAnalysisLines,
  setAnalysisEntries,
  selectEngineLine,
  deselectEngineLine,
  incrementMoveIndex,
  decrementMoveIndex,
  setCurrentMoveIndex,
  setDeepAnalysisResults,
  setDeepAnalysisLoading,
  resetAnalysis,
} from "./slices/analysisSlice";

export {
  setAnalysisLoading,
  setAnalysisStatus,
  setAdvancedAnalysisMode,
  setPuzzleMode,
  setViewMode,
} from "./slices/uiSlice";

export {
  setEngineStatus,
  setSelectedEngine,
  setAnalysisDepth,
  setEngineReady,
  setEngineError,
} from "./slices/engineSlice";

// Thunks
export {
  analyzePosition,
  fetchExplanations,
  fetchPerMoveExplanation,
  deepAnalyzeLine,
} from "./thunks/analysisThunks";

export { handleBoardMove, selectEngineLine as selectEngineLineThunk } from "./thunks/boardThunks";

// Selectors
export {
  selectCurrentFen,
  selectMoveHistory,
  selectSelectedSquare,
  selectAnalysisLines,
  selectAnalysisEntries,
  selectSelectedEngineLineIndex,
  selectCurrentMoveIndex,
  selectDeepAnalysisResults,
  selectDeepAnalysisLoading,
  selectSelectedAnalysisLineId,
  selectSelectedLineEntry,
  selectSelectedLineMoves,
  selectAnalysisLoading,
  selectAnalysisStatus,
  selectAdvancedAnalysisMode,
  selectPuzzleMode,
  selectViewMode,
  selectEngineStatus,
  selectEngineReady,
  selectEngineError,
  selectSelectedEngine,
  selectAnalysisDepth,
  selectAnalysisState,
  selectBoardState,
  selectEngineConfig,
} from "./selectors";

// Middleware
export { autoDismissStatusMiddleware, debugMiddleware } from "./middleware";
