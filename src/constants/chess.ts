/**
 * Chess position constants
 */

// Standard starting position in FEN notation
export const CHESS_STARTING_POSITION_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Legacy identifier used throughout the app (for backwards compatibility in checks)
export const CHESS_STARTING_POSITION_KEY = "start";

/**
 * Check if a FEN represents the starting position
 */
export function isStartingPosition(fen: string): boolean {
  return fen === CHESS_STARTING_POSITION_KEY || fen === CHESS_STARTING_POSITION_FEN;
}

/**
 * Normalize any starting position identifier to the full FEN
 */
export function normalizeStartingPosition(fen: string): string {
  if (fen === CHESS_STARTING_POSITION_KEY) {
    return CHESS_STARTING_POSITION_FEN;
  }
  return fen;
}
