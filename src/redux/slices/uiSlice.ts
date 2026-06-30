import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { analyzePosition } from "../thunks/analysisThunks";

interface UIState {
  analysisLoading: boolean;
  analysisStatus: string;
  advancedAnalysisMode: boolean;
  puzzleMode: boolean;
  viewMode: "analysis" | "puzzle";
}

const initialState: UIState = {
  analysisLoading: false,
  analysisStatus: "",
  advancedAnalysisMode: false,
  puzzleMode: false,
  viewMode: "analysis",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setAnalysisLoading: (state, action: PayloadAction<boolean>) => {
      state.analysisLoading = action.payload;
    },
    setAnalysisStatus: (state, action: PayloadAction<string>) => {
      state.analysisStatus = action.payload;
    },
    setAdvancedAnalysisMode: (state, action: PayloadAction<boolean>) => {
      state.advancedAnalysisMode = action.payload;
    },
    setPuzzleMode: (state, action: PayloadAction<boolean>) => {
      state.puzzleMode = action.payload;
    },
    setViewMode: (state, action: PayloadAction<"analysis" | "puzzle">) => {
      state.viewMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePosition.pending, (state) => {
        state.analysisLoading = true;
        state.analysisStatus = "";
      })
      .addCase(analyzePosition.fulfilled, (state) => {
        state.analysisLoading = false;
        state.analysisStatus = "";
      })
      .addCase(analyzePosition.rejected, (state, action) => {
        state.analysisLoading = false;
        state.analysisStatus =
          (action.payload as string) || "Analysis failed";
      });
  },
});

export const {
  setAnalysisLoading,
  setAnalysisStatus,
  setAdvancedAnalysisMode,
  setPuzzleMode,
  setViewMode,
} = uiSlice.actions;

export default uiSlice.reducer;
