import { configureStore } from "@reduxjs/toolkit";
import boardReducer, { setCurrentFen, resetBoard } from "./slices/boardSlice";
import analysisReducer, {
  selectEngineLine,
  deselectEngineLine,
  setCurrentMoveIndex,
  incrementMoveIndex,
} from "./slices/analysisSlice";
import uiReducer, { setAnalysisLoading, setAdvancedAnalysisMode } from "./slices/uiSlice";
import engineReducer, { setEngineStatus, setAnalysisDepth } from "./slices/engineSlice";

describe("Redux Store", () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        board: boardReducer,
        analysis: analysisReducer,
        ui: uiReducer,
        engine: engineReducer,
      },
    });
  });

  describe("Board Slice", () => {
    it("should set current FEN", () => {
      store.dispatch(setCurrentFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"));
      const state = store.getState();
      expect(state.board.currentFen).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
    });

    it("should reset board", () => {
      store.dispatch(setCurrentFen("8/8/8/8/8/8/8/8 w - - 0 1"));
      store.dispatch(resetBoard());
      const state = store.getState();
      expect(state.board.currentFen).toBe("start");
      expect(state.board.moveHistory).toEqual([]);
    });
  });

  describe("Analysis Slice", () => {
    it("should select engine line", () => {
      store.dispatch(selectEngineLine({ index: 0, lineId: "line-1" }));
      const state = store.getState();
      expect(state.analysis.selectedEngineLineIndex).toBe(0);
      expect(state.analysis.selectedAnalysisLineId).toBe("line-1");
      expect(state.analysis.currentMoveIndex).toBe(0);
    });

    it("should deselect engine line", () => {
      store.dispatch(selectEngineLine({ index: 0 }));
      store.dispatch(deselectEngineLine());
      const state = store.getState();
      expect(state.analysis.selectedEngineLineIndex).toBeNull();
      expect(state.analysis.currentMoveIndex).toBe(0);
    });

    it("should increment move index", () => {
      store.dispatch(setCurrentMoveIndex(2));
      store.dispatch(incrementMoveIndex());
      const state = store.getState();
      expect(state.analysis.currentMoveIndex).toBe(3);
    });
  });

  describe("UI Slice", () => {
    it("should set analysis loading", () => {
      store.dispatch(setAnalysisLoading(true));
      let state = store.getState();
      expect(state.ui.analysisLoading).toBe(true);

      store.dispatch(setAnalysisLoading(false));
      state = store.getState();
      expect(state.ui.analysisLoading).toBe(false);
    });

    it("should set advanced analysis mode", () => {
      store.dispatch(setAdvancedAnalysisMode(true));
      const state = store.getState();
      expect(state.ui.advancedAnalysisMode).toBe(true);
    });
  });

  describe("Engine Slice", () => {
    it("should set analysis depth", () => {
      store.dispatch(setAnalysisDepth(20));
      const state = store.getState();
      expect(state.engine.analysisDepth).toBe(20);
    });

    it("should set engine status", () => {
      store.dispatch(setEngineStatus({ ready: true, name: "Stockfish" }));
      const state = store.getState();
      expect(state.engine.status.ready).toBe(true);
      expect(state.engine.status.name).toBe("Stockfish");
    });
  });

  describe("Store Integration", () => {
    it("should maintain all slices independently", () => {
      store.dispatch(setCurrentFen("8/8/8/8/8/8/8/8 w - - 0 1"));
      store.dispatch(selectEngineLine({ index: 1 }));
      store.dispatch(setAnalysisLoading(true));
      store.dispatch(setAnalysisDepth(25));

      const state = store.getState();
      expect(state.board.currentFen).toBe("8/8/8/8/8/8/8/8 w - - 0 1");
      expect(state.analysis.selectedEngineLineIndex).toBe(1);
      expect(state.ui.analysisLoading).toBe(true);
      expect(state.engine.analysisDepth).toBe(25);
    });
  });
});
