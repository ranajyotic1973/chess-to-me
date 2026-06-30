import type { RootState } from "./store";

// Board selectors
export const selectCurrentFen = (state: RootState) => state.board.currentFen;
export const selectMoveHistory = (state: RootState) => state.board.moveHistory;
export const selectSelectedSquare = (state: RootState) => state.board.selectedSquare;

// Analysis selectors
export const selectAnalysisLines = (state: RootState) => state.analysis.analysisLines;
export const selectAnalysisEntries = (state: RootState) => state.analysis.analysisEntries;
export const selectSelectedEngineLineIndex = (state: RootState) =>
  state.analysis.selectedEngineLineIndex;
export const selectCurrentMoveIndex = (state: RootState) => state.analysis.currentMoveIndex;
export const selectDeepAnalysisResults = (state: RootState) => state.analysis.deepAnalysisResults;
export const selectDeepAnalysisLoading = (state: RootState) => state.analysis.deepAnalysisLoading;
export const selectSelectedAnalysisLineId = (state: RootState) =>
  state.analysis.selectedAnalysisLineId;

// Derived: Get selected line entry
export const selectSelectedLineEntry = (state: RootState) => {
  const idx = state.analysis.selectedEngineLineIndex;
  if (idx === null) return null;
  return state.analysis.analysisEntries[idx] || null;
};

// Derived: Get selected line's moves
export const selectSelectedLineMoves = (state: RootState) => {
  const entry = selectSelectedLineEntry(state);
  return entry?.moves || [];
};

// UI selectors
export const selectAnalysisLoading = (state: RootState) => state.ui.analysisLoading;
export const selectAnalysisStatus = (state: RootState) => state.ui.analysisStatus;
export const selectAdvancedAnalysisMode = (state: RootState) => state.ui.advancedAnalysisMode;
export const selectPuzzleMode = (state: RootState) => state.ui.puzzleMode;
export const selectViewMode = (state: RootState) => state.ui.viewMode;

// Engine selectors
export const selectEngineStatus = (state: RootState) => state.engine.status;
export const selectEngineReady = (state: RootState) => state.engine.status.ready;
export const selectEngineError = (state: RootState) => state.engine.status.error;
export const selectSelectedEngine = (state: RootState) => state.engine.selectedEngine;
export const selectAnalysisDepth = (state: RootState) => state.engine.analysisDepth;

// Combined selectors
export const selectAnalysisState = (state: RootState) => ({
  lines: state.analysis.analysisLines,
  entries: state.analysis.analysisEntries,
  selectedIndex: state.analysis.selectedEngineLineIndex,
  currentMoveIndex: state.analysis.currentMoveIndex,
  loading: state.ui.analysisLoading,
  status: state.ui.analysisStatus,
});

export const selectBoardState = (state: RootState) => ({
  currentFen: state.board.currentFen,
  moveHistory: state.board.moveHistory,
  selectedSquare: state.board.selectedSquare,
});

export const selectEngineConfig = (state: RootState) => ({
  selectedEngine: state.engine.selectedEngine,
  analysisDepth: state.engine.analysisDepth,
  ready: state.engine.status.ready,
});
