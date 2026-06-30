import { Middleware } from "@reduxjs/toolkit";
import type { RootState } from "./store";

/**
 * Middleware to auto-dismiss analysis status messages after a delay
 */
export const autoDismissStatusMiddleware: Middleware<{}, RootState> =
  (store) => (next) => (action) => {
    const result = next(action);

    // If status was set, auto-dismiss after 5 seconds
    if (
      action.type === "ui/setAnalysisStatus" &&
      action.payload &&
      action.payload.length > 0
    ) {
      setTimeout(() => {
        const currentState = store.getState();
        if (currentState.ui.analysisStatus === action.payload) {
          store.dispatch({ type: "ui/setAnalysisStatus", payload: "" });
        }
      }, 5000);
    }

    return result;
  };

/**
 * Middleware to log Redux actions in development
 */
export const debugMiddleware: Middleware<{}, RootState> =
  () => (next) => (action) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Redux Action]", action.type, action.payload);
    }
    return next(action);
  };
