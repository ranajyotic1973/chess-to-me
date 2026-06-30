import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface EngineStatus {
  ready: boolean;
  name?: string;
  error?: string;
}

interface EngineState {
  status: EngineStatus;
  selectedEngine: string;
  analysisDepth: number;
}

const initialState: EngineState = {
  status: {
    ready: false,
  },
  selectedEngine: "stockfish",
  analysisDepth: 20,
};

const engineSlice = createSlice({
  name: "engine",
  initialState,
  reducers: {
    setEngineStatus: (state, action: PayloadAction<EngineStatus>) => {
      state.status = action.payload;
    },
    setSelectedEngine: (state, action: PayloadAction<string>) => {
      state.selectedEngine = action.payload;
    },
    setAnalysisDepth: (state, action: PayloadAction<number>) => {
      state.analysisDepth = action.payload;
    },
    setEngineReady: (state, action: PayloadAction<boolean>) => {
      state.status.ready = action.payload;
    },
    setEngineError: (state, action: PayloadAction<string | undefined>) => {
      state.status.error = action.payload;
    },
  },
});

export const {
  setEngineStatus,
  setSelectedEngine,
  setAnalysisDepth,
  setEngineReady,
  setEngineError,
} = engineSlice.actions;

export default engineSlice.reducer;
