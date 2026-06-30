import { createAsyncThunk } from "@reduxjs/toolkit";
import { Chess } from "chess.js";
import type { Move } from "../../types";

interface HandleBoardMovePayload {
  newFen: string;
  currentFen: string;
  selectedEngineLineIndex: number | null;
  analysisLines: any[];
  analysisEntries: any[];
  currentMoveIndex: number;
  electronAPI: any;
  formState: any;
  advancedAnalysisMode: boolean;
  llmProvider: string;
}

interface MoveMatchResult {
  matched: boolean;
  matchedLineIndex?: number;
  shouldRunAnalysis: boolean;
  newMoveIndex?: number;
}

/**
 * Matches user move against selected engine line moves
 */
function matchMoveAgainstLine(
  userFen: string,
  selectedLineIndex: number | null,
  analysisEntries: any[],
  currentMoveIndex: number
): MoveMatchResult {
  if (selectedLineIndex === null || !analysisEntries[selectedLineIndex]) {
    return { matched: false, shouldRunAnalysis: true };
  }

  const line = analysisEntries[selectedLineIndex];
  const moves: Move[] = line.moves || [];

  if (currentMoveIndex >= moves.length) {
    // We've exhausted this line, analyze the new position
    return { matched: false, shouldRunAnalysis: true };
  }

  // Simulate the line moves up to the next move and check if it matches
  const chess = new Chess();
  try {
    if (currentFen !== "start") {
      chess.load(currentFen);
    } else {
      chess.reset();
    }

    // Play moves up to and including the next expected move
    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = moves[i];
      if (!move) break;
      const result = chess.move({ from: move.from, to: move.to, promotion: "q" });
      if (!result) break;
    }

    const expectedFen = chess.fen();
    return {
      matched: expectedFen === userFen,
      matchedLineIndex: selectedLineIndex,
      shouldRunAnalysis: expectedFen !== userFen,
      newMoveIndex: currentMoveIndex + 1,
    };
  } catch {
    return { matched: false, shouldRunAnalysis: true };
  }
}

let currentFen = "start"; // Store for closure

export const handleBoardMove = createAsyncThunk(
  "board/handleBoardMove",
  async (payload: HandleBoardMovePayload) => {
    const {
      newFen,
      selectedEngineLineIndex,
      analysisLines,
      analysisEntries,
      currentMoveIndex,
    } = payload;

    currentFen = payload.currentFen;

    const matchResult = matchMoveAgainstLine(
      newFen,
      selectedEngineLineIndex,
      analysisEntries,
      currentMoveIndex
    );

    return {
      fen: newFen,
      moveMatched: matchResult.matched,
      matchedLineIndex: matchResult.matchedLineIndex,
      newMoveIndex: matchResult.newMoveIndex || 0,
      shouldAnalyze: matchResult.shouldRunAnalysis,
    };
  }
);

interface SelectLinePayload {
  lineIndex: number;
  analysisEntries: any[];
  currentFen: string;
  electronAPI: any;
  formState: any;
  advancedAnalysisMode: boolean;
  llmProvider: string;
}

/**
 * Select an engine line: play first move, analyze resulting position, fetch explanation
 */
export const selectEngineLine = createAsyncThunk(
  "analysis/selectEngineLine",
  async (payload: SelectLinePayload) => {
    const {
      lineIndex,
      analysisEntries,
      currentFen,
      electronAPI,
      formState,
      advancedAnalysisMode,
      llmProvider,
    } = payload;

    if (!analysisEntries[lineIndex]) {
      return {
        selectedIndex: lineIndex,
        fen: currentFen,
        moveIndex: 0,
      };
    }

    const entry = analysisEntries[lineIndex];
    const moves: Move[] = entry.moves || [];

    if (moves.length === 0) {
      return {
        selectedIndex: lineIndex,
        fen: currentFen,
        moveIndex: 0,
      };
    }

    // Play the first move of the line
    const chess = new Chess();
    try {
      if (currentFen !== "start") {
        chess.load(currentFen);
      } else {
        chess.reset();
      }

      const firstMove = moves[0];
      const result = chess.move({
        from: firstMove.from,
        to: firstMove.to,
        promotion: "q",
      });

      if (!result) {
        return {
          selectedIndex: lineIndex,
          fen: currentFen,
          moveIndex: 0,
        };
      }

      const resultingFen = chess.fen();

      // Trigger analysis on resulting position
      const analyzePayload = {
        fen: resultingFen,
        deepMode: false,
        electronAPI,
        formState,
        advancedAnalysisMode,
      };

      // Dispatch analysis separately - return what we know now
      return {
        selectedIndex: lineIndex,
        fen: resultingFen,
        moveIndex: 0,
        triggerAnalysis: true,
        analysisPayload: analyzePayload,
      };
    } catch {
      return {
        selectedIndex: lineIndex,
        fen: currentFen,
        moveIndex: 0,
      };
    }
  }
);
