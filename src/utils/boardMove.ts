import { Chess } from "chess.js";
import type { AnalysisEntry, Move } from "../types";

export interface MoveMatchResult {
  matched: boolean;
  matchedLineIndex?: number;
  shouldRunAnalysis: boolean;
  newMoveIndex?: number;
}

/**
 * Determine whether a user's move (expressed as the resulting FEN) follows the
 * currently selected engine line.
 *
 * Formerly the `handleBoardMove`/`matchMoveAgainstLine` Redux thunk logic; kept
 * as a pure function so it can be unit-tested and called directly from React
 * state handlers (no Redux).
 *
 * @param userFen        FEN after the user's move.
 * @param selectedLineIndex Index of the selected engine line, or null.
 * @param analysisEntries   Parsed engine lines (each with a `moves` array).
 * @param currentMoveIndex  How many moves of the line have been followed so far.
 * @param currentFen        The FEN before the user's move ("start" for the
 *                          standard initial position).
 */
export function matchMoveAgainstLine(
  userFen: string,
  selectedLineIndex: number | null,
  analysisEntries: AnalysisEntry[],
  currentMoveIndex: number,
  currentFen: string
): MoveMatchResult {
  if (selectedLineIndex === null || !analysisEntries[selectedLineIndex]) {
    return { matched: false, shouldRunAnalysis: true };
  }

  const line = analysisEntries[selectedLineIndex];
  const moves: Move[] = line.moves || [];

  if (currentMoveIndex >= moves.length) {
    // The selected line is exhausted — analyze the new position instead.
    return { matched: false, shouldRunAnalysis: true };
  }

  const chess = new Chess();
  try {
    if (currentFen !== "start") {
      chess.load(currentFen);
    } else {
      chess.reset();
    }

    // Replay the line up to and including the next expected move.
    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = moves[i];
      if (!move) break;
      const result = chess.move({ from: move.from, to: move.to, promotion: "q" });
      if (!result) break;
    }

    const expectedFen = chess.fen();
    const matched = expectedFen === userFen;

    return {
      matched,
      matchedLineIndex: selectedLineIndex,
      shouldRunAnalysis: !matched,
      newMoveIndex: currentMoveIndex + 1,
    };
  } catch {
    return { matched: false, shouldRunAnalysis: true };
  }
}
