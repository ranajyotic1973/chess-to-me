import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AnalysisLine, AnalysisEntry } from "../../types";
import {
  analyzePosition,
  fetchExplanations,
  fetchPerMoveExplanation,
  deepAnalyzeLine,
} from "../thunks/analysisThunks";
import {
  handleBoardMove,
  selectEngineLine as selectEngineLineThunk,
} from "../thunks/boardThunks";

interface DeepAnalysisResult {
  [key: string]: Record<string, string>;
}

interface AnalysisState {
  analysisLines: AnalysisLine[];
  analysisEntries: AnalysisEntry[];
  selectedEngineLineIndex: number | null;
  currentMoveIndex: number;
  deepAnalysisResults: DeepAnalysisResult;
  deepAnalysisLoading: boolean;
  selectedAnalysisLineId: string | null;
}

const initialState: AnalysisState = {
  analysisLines: [],
  analysisEntries: [],
  selectedEngineLineIndex: null,
  currentMoveIndex: 0,
  deepAnalysisResults: {},
  deepAnalysisLoading: false,
  selectedAnalysisLineId: null,
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    setAnalysisLoading: (state, action: PayloadAction<boolean>) => {
      state.deepAnalysisLoading = action.payload;
    },
    setAnalysisLines: (state, action: PayloadAction<AnalysisLine[]>) => {
      state.analysisLines = action.payload;
    },
    setAnalysisEntries: (state, action: PayloadAction<AnalysisEntry[]>) => {
      state.analysisEntries = action.payload;
    },
    selectEngineLine: (
      state,
      action: PayloadAction<{ index: number; lineId?: string }>
    ) => {
      state.selectedEngineLineIndex = action.payload.index;
      state.currentMoveIndex = 0;
      if (action.payload.lineId) {
        state.selectedAnalysisLineId = action.payload.lineId;
      }
    },
    deselectEngineLine: (state) => {
      state.selectedEngineLineIndex = null;
      state.currentMoveIndex = 0;
      state.selectedAnalysisLineId = null;
    },
    incrementMoveIndex: (state) => {
      state.currentMoveIndex += 1;
    },
    decrementMoveIndex: (state) => {
      if (state.currentMoveIndex > 0) {
        state.currentMoveIndex -= 1;
      }
    },
    setCurrentMoveIndex: (state, action: PayloadAction<number>) => {
      state.currentMoveIndex = Math.max(0, action.payload);
    },
    setDeepAnalysisResults: (
      state,
      action: PayloadAction<{ lineIndex: number; results: Record<string, string> }>
    ) => {
      state.deepAnalysisResults[action.payload.lineIndex] = action.payload.results;
    },
    setDeepAnalysisLoading: (state, action: PayloadAction<boolean>) => {
      state.deepAnalysisLoading = action.payload;
    },
    resetAnalysis: (state) => {
      state.analysisLines = [];
      state.analysisEntries = [];
      state.selectedEngineLineIndex = null;
      state.currentMoveIndex = 0;
      state.deepAnalysisResults = {};
      state.deepAnalysisLoading = false;
      state.selectedAnalysisLineId = null;
    },
  },
  extraReducers: (builder) => {
    // analyzePosition thunk
    builder
      .addCase(analyzePosition.fulfilled, (state, action) => {
        state.analysisLines = action.payload.lines;
        state.analysisEntries = action.payload.entries;
      })
      .addCase(analyzePosition.rejected, (state) => {
        state.analysisLines = [];
        state.analysisEntries = [];
      });

    // fetchPerMoveExplanation thunk
    builder.addCase(fetchPerMoveExplanation.fulfilled, (state, action) => {
      const { lineIndex, explanation } = action.payload;
      if (state.analysisEntries[lineIndex]) {
        state.analysisEntries[lineIndex].explanation = explanation;
      }
    });

    // deepAnalyzeLine thunk
    builder.addCase(deepAnalyzeLine.fulfilled, (state, action) => {
      const { lineIndex, results } = action.payload;
      state.deepAnalysisResults[lineIndex] = results;
      state.deepAnalysisLoading = false;
    });

    // selectEngineLine thunk
    builder.addCase(selectEngineLineThunk.fulfilled, (state, action) => {
      state.selectedEngineLineIndex = action.payload.selectedIndex;
      state.currentMoveIndex = action.payload.moveIndex || 0;
    });

    // handleBoardMove thunk
    builder.addCase(handleBoardMove.fulfilled, (state, action) => {
      if (action.payload.moveMatched) {
        state.currentMoveIndex = action.payload.newMoveIndex || 0;
      }
    });
  },
});

export const {
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
} = analysisSlice.actions;

export default analysisSlice.reducer;
