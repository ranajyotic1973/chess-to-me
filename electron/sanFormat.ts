import { Chess } from "chess.js";

const WHITE_GLYPHS: Record<string, string> = { N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
const BLACK_GLYPHS: Record<string, string> = { N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };

const uciMoveRegex = /[a-h][1-8][a-h][1-8][qrbn]?/g;

const sanWithGlyph = (san: string, isBlack: boolean): string => {
  const map = isBlack ? BLACK_GLYPHS : WHITE_GLYPHS;
  return san.replace(/^([NBRQK])/, (_, l) => map[l] ?? l);
};

/**
 * Converts a UCI move sequence (e.g. "e2e4 e7e5 g1f3") into a numbered SAN
 * line with piece glyphs (e.g. "1. e4 e5 2. ♘f3"), starting from the given FEN.
 * Falls back to the original input if no moves could be parsed.
 */
export function sanLineWithGlyphs(pv: string, startFen: string): string {
  const board = new Chess();
  try {
    board.load(startFen);
  } catch {
    board.reset();
  }
  const startTurn = board.turn();
  let moveNum = board.moveNumber();
  let blackToMove = startTurn === "b";

  const uciMoves = pv.match(uciMoveRegex) ?? [];
  const parts: string[] = [];

  for (let i = 0; i < uciMoves.length; i++) {
    const uci = uciMoves[i];
    const isBlack = board.turn() === "b";
    let result;
    try {
      result = board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length === 5 ? (uci[4] as "q" | "r" | "b" | "n") : "q"
      });
    } catch {
      break;
    }
    if (!result) break;

    const glyphed = sanWithGlyph(result.san, isBlack);
    if (blackToMove) {
      if (i === 0) parts.push(`${moveNum}…`);
      parts.push(glyphed);
      blackToMove = false;
      moveNum++;
    } else {
      parts.push(`${moveNum}.`);
      parts.push(glyphed);
      blackToMove = true;
    }
  }

  return parts.length ? parts.join(" ") : pv;
}
