import { configureStore } from "@reduxjs/toolkit";
import boardReducer, { setCurrentFen, resetBoard } from "./slices/boardSlice";
import analysisReducer, {
  selectEngineLine,
  deselectEngineLine,
  setCurrentMoveIndex,
  incrementMoveIndex,
  setAnalysisEntries,
} from "./slices/analysisSlice";
import uiReducer, { setAnalysisLoading, setAdvancedAnalysisMode } from "./slices/uiSlice";
import engineReducer, { setEngineStatus, setAnalysisDepth } from "./slices/engineSlice";
import { handleBoardMove, selectEngineLine as selectEngineLineThunk } from "./thunks/boardThunks";
import type { AnalysisEntry, Move } from "../types";

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

  describe("Board Move Thunk", () => {
    it("should dispatch handleBoardMove thunk and update FEN when move matches line", async () => {
      const { Chess } = require("chess.js");
      const chess = new Chess();
      const startFen = chess.fen();

      // Calculate the actual FEN after e2e4
      chess.move({ from: "e2", to: "e4", promotion: "q" });
      const newFen = chess.fen();

      // Create moves array for the analysis entry
      const moves: Move[] = [
        { from: "e2", to: "e4", promotion: undefined },
      ];

      const analysisEntry: AnalysisEntry = {
        rank: 1,
        score: 50,
        depth: 10,
        moves,
        line: "e2e4",
        pv: "e2e4",
        explanation: undefined,
      };

      // Set up initial state
      store.dispatch(setCurrentFen(startFen));
      store.dispatch(setAnalysisEntries([analysisEntry]));
      store.dispatch(selectEngineLine({ index: 0 }));

      // Dispatch handleBoardMove thunk
      const result = await store.dispatch(
        handleBoardMove({
          newFen,
          currentFen: startFen,
          selectedEngineLineIndex: 0,
          analysisLines: [],
          analysisEntries: [analysisEntry],
          currentMoveIndex: 0,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      const state = store.getState();
      expect(result.payload.fen).toBe(newFen);
      expect(result.payload.moveMatched).toBe(true);
      expect(result.payload.shouldAnalyze).toBe(false);
      // The thunk result shows move matched, so currentMoveIndex should update
      expect(result.payload.newMoveIndex).toBe(1);
    });

    it("should trigger analysis when move doesn't match any line", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const newFen = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1"; // d4 move (different from e4)

      const analysisEntry: AnalysisEntry = {
        rank: 1,
        score: 50,
        depth: 10,
        moves: [{ from: "e2", to: "e4", promotion: undefined }],
        line: "e2e4",
        pv: "e2e4",
        explanation: undefined,
      };

      store.dispatch(setCurrentFen(startFen));
      store.dispatch(setAnalysisEntries([analysisEntry]));
      store.dispatch(selectEngineLine({ index: 0 }));

      const result = await store.dispatch(
        handleBoardMove({
          newFen,
          currentFen: startFen,
          selectedEngineLineIndex: 0,
          analysisLines: [],
          analysisEntries: [analysisEntry],
          currentMoveIndex: 0,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      expect(result.payload.fen).toBe(newFen);
      expect(result.payload.moveMatched).toBe(false);
      expect(result.payload.shouldAnalyze).toBe(true);
    });

    it("should trigger analysis when no line is selected", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

      const result = await store.dispatch(
        handleBoardMove({
          newFen,
          currentFen: startFen,
          selectedEngineLineIndex: null,
          analysisLines: [],
          analysisEntries: [],
          currentMoveIndex: 0,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      expect(result.payload.fen).toBe(newFen);
      expect(result.payload.moveMatched).toBe(false);
      expect(result.payload.shouldAnalyze).toBe(true);
    });
  });

  describe("Select Engine Line Thunk", () => {
    it("should dispatch selectEngineLine thunk and update selected line state", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      const moves: Move[] = [
        { from: "e2", to: "e4", promotion: undefined },
        { from: "c7", to: "c5", promotion: undefined },
      ];

      const analysisEntry: AnalysisEntry = {
        rank: 1,
        score: 50,
        depth: 10,
        moves,
        line: "e2e4 c7c5",
        pv: "e2e4 c7c5",
        explanation: undefined,
      };

      const result = await store.dispatch(
        selectEngineLineThunk({
          lineIndex: 0,
          analysisEntries: [analysisEntry],
          currentFen: startFen,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      expect(result.payload.selectedIndex).toBe(0);
      expect(result.payload.moveIndex).toBe(0);
      // Resulting FEN should be after e2e4
      expect(result.payload.fen).not.toBe(startFen);
      expect(result.payload.triggerAnalysis).toBe(true);
    });

    it("should handle line with no moves", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      const analysisEntry: AnalysisEntry = {
        rank: 1,
        score: 50,
        depth: 10,
        moves: [],
        line: "",
        pv: "",
        explanation: undefined,
      };

      const result = await store.dispatch(
        selectEngineLineThunk({
          lineIndex: 0,
          analysisEntries: [analysisEntry],
          currentFen: startFen,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      expect(result.payload.selectedIndex).toBe(0);
      expect(result.payload.fen).toBe(startFen);
      expect(result.payload.moveIndex).toBe(0);
    });

    it("should return current FEN for invalid line index", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      const result = await store.dispatch(
        selectEngineLineThunk({
          lineIndex: 5,
          analysisEntries: [],
          currentFen: startFen,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      expect(result.payload.fen).toBe(startFen);
      expect(result.payload.moveIndex).toBe(0);
    });
  });

  describe("Thunk Integration with Reducers", () => {
    it("should update board FEN when handleBoardMove thunk completes", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

      store.dispatch(setCurrentFen(startFen));

      await store.dispatch(
        handleBoardMove({
          newFen,
          currentFen: startFen,
          selectedEngineLineIndex: null,
          analysisLines: [],
          analysisEntries: [],
          currentMoveIndex: 0,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      const state = store.getState();
      expect(state.board.currentFen).toBe(newFen);
    });

    it("should update analysis state when selectEngineLine thunk completes", async () => {
      const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      const moves: Move[] = [
        { from: "e2", to: "e4", promotion: undefined },
      ];

      const analysisEntry: AnalysisEntry = {
        rank: 1,
        score: 50,
        depth: 10,
        moves,
        line: "e2e4",
        pv: "e2e4",
        explanation: undefined,
      };

      store.dispatch(setAnalysisEntries([analysisEntry]));

      await store.dispatch(
        selectEngineLineThunk({
          lineIndex: 0,
          analysisEntries: [analysisEntry],
          currentFen: startFen,
          electronAPI: null,
          formState: {},
          advancedAnalysisMode: false,
          llmProvider: "openai",
        })
      );

      const state = store.getState();
      expect(state.analysis.selectedEngineLineIndex).toBe(0);
      expect(state.analysis.currentMoveIndex).toBe(0);
    });
  });
});
