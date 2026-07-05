import { Chess } from "chess.js";
import { normalizeStartingPosition } from "../constants/chess";

export interface PreviewPly {
  /** UCI move token (e.g. "e2e4"). */
  uci: string;
  /** SAN for display (e.g. "e4"). */
  san: string;
  /** FEN after this move. */
  fen: string;
}

export interface LinePreview {
  /** The starting position (normalized FEN). */
  startFen: string;
  /** Position FENs: fens[0] = start, fens[i] = after i plies. Length = plies + 1. */
  fens: string[];
  /** One entry per applied ply. */
  plies: PreviewPly[];
}

/**
 * Expand an engine line into a navigable sequence of positions. Pure and
 * side-effect-free so the preview popup can step through a line without any
 * board/engine state. Stops at the first illegal/unparseable move so a partly
 * valid line still previews as far as it is legal.
 *
 * @param startFen the position the line starts from ("start" accepted)
 * @param pv       space-separated UCI moves (the line's principal variation)
 */
export function buildLinePreview(startFen: string, pv: string): LinePreview {
  const chess = new Chess();
  try {
    chess.load(normalizeStartingPosition(startFen));
  } catch {
    // Leave chess at the default initial position if the FEN won't load.
  }

  const fens: string[] = [chess.fen()];
  const plies: PreviewPly[] = [];
  const moves = String(pv || "").trim().split(/\s+/).filter(Boolean);

  for (const uci of moves) {
    if (uci.length < 4) break;
    try {
      const res = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: (uci[4] as any) || undefined,
      });
      if (!res) break;
      const fen = chess.fen();
      plies.push({ uci, san: res.san, fen });
      fens.push(fen);
    } catch {
      break;
    }
  }

  return { startFen: fens[0], fens, plies };
}
