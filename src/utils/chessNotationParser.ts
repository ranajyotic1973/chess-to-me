import { Chess } from "chess.js";

/**
 * Parse a user's chess move input string into an array of UCI moves.
 *
 * Handles:
 *   - UCI:         "e2e4 e7e5 g1f3"
 *   - SAN:         "e4 e5 Nf3"
 *   - Game:        "1. e4 e5 2. Nf3 Nc6"
 *   - Black first: "1...e5 2. e4 Nf6"
 *   - With commas: "1. e4, e5 2. Nf3, Nc6"
 *
 * Returns [] if the input cannot be parsed against the given FEN or if no
 * recognisable moves are found.
 */
export function parseChessNotation(input: string, startFen: string): string[] {
  let cleaned = input
    .replace(/\d+\.\.\./g, " ") // "1..." → space
    .replace(/\d+\./g, " ")     // "1."   → space
    .replace(/,/g, " ")         // commas → spaces
    .replace(/[!?+#]/g, "")    // annotations / check symbols
    .trim();

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return [];
  }

  const uciMoves: string[] = [];

  for (const token of tokens) {
    if (UCI_RE.test(token)) {
      const from = token.slice(0, 2).toLowerCase();
      const to = token.slice(2, 4).toLowerCase();
      const promo = token[4]?.toLowerCase() as "q" | "r" | "b" | "n" | undefined;
      try {
        const result = chess.move({ from, to, promotion: promo });
        if (!result) return [];
        uciMoves.push(result.from + result.to + (result.promotion ?? ""));
      } catch {
        return [];
      }
    } else {
      try {
        const result = chess.move(token);
        if (!result) return [];
        uciMoves.push(result.from + result.to + (result.promotion ?? ""));
      } catch {
        return [];
      }
    }
  }

  return uciMoves;
}

/**
 * Compute SAN strings for a sequence of UCI moves applied from `startFen`.
 * Returns [] if any move in the sequence is illegal.
 */
export function uciSequenceToSan(startFen: string, uciMoves: string[]): string[] {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return [];
  }
  const san: string[] = [];
  for (const uci of uciMoves) {
    try {
      const result = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] as "q" | "r" | "b" | "n" | undefined
      });
      if (!result) return [];
      san.push(result.san);
    } catch {
      return [];
    }
  }
  return san;
}

/**
 * Return true if the input looks like a chess move attempt rather than a
 * natural-language question.  Used to skip LLM classification and handle the
 * move directly.
 */
export function looksLikeMoveAttempt(input: string): boolean {
  const QUESTION_WORDS = /\b(what|how|why|can|should|is|are|was|were|will|would|could|did|do|does|explain|show|tell|help|please|analyze|analysis|hint)\b/i;
  if (QUESTION_WORDS.test(input) || input.includes("?")) return false;

  const cleaned = input
    .replace(/\d+\.\.\./g, " ")
    .replace(/\d+\./g, " ")
    .replace(/,/g, " ")
    .replace(/[!?+#]/g, "")
    .trim();

  if (!cleaned) return false;

  const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
  // A SAN move starts with a piece letter, pawn file, or castling notation
  const SAN_LIKE = /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBNqrbn])?|O-O(-O)?|0-0(-0)?)$/;
  const MOVE_NUMBER = /^\d+$/;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.every(t => UCI_RE.test(t) || SAN_LIKE.test(t) || MOVE_NUMBER.test(t));
}
