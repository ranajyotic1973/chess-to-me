import { configureStore } from "@reduxjs/toolkit";
import boardReducer from "./slices/boardSlice";
import analysisReducer from "./slices/analysisSlice";
import uiReducer from "./slices/uiSlice";
import engineReducer from "./slices/engineSlice";

export const store = configureStore({
  reducer: {
    board: boardReducer,
    analysis: analysisReducer,
    ui: uiReducer,
    engine: engineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these actions/paths if they contain non-serializable values
        ignoredActions: ["analysis/setAnalysisLines"],
        ignoredPaths: ["analysis.analysisLines"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
