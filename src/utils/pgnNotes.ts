import { Chess } from "chess.js";

/**
 * Build a PGN string from a sequence of UCI moves, embedding per-move markdown
 * notes as standard PGN comments (`{ ... }`) immediately after the move.
 *
 * Notes are keyed by the 0-based index of the move within `playedMoves`.
 * Markdown is preserved verbatim inside the comment; any literal `}` in the
 * note is escaped to keep the PGN parseable.
 *
 * @param playedMoves UCI moves in order, e.g. ["e2e4", "e7e5", "g1f3"].
 * @param moveNotes   Map of move index → markdown note.
 * @returns A PGN movetext string (no headers) with embedded note comments.
 */
export function buildPgnWithNotes(
  playedMoves: string[],
  moveNotes: Record<number, string>
): string {
  const chess = new Chess();
  const tokens: string[] = [];

  playedMoves.forEach((uci, idx) => {
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const moveObj: { from: string; to: string; promotion?: string } = { from, to };

    // Auto-queen promotions if a pawn reaches the back rank (UCI without a
    // promotion suffix is treated as a queen promotion).
    const toRank = parseInt(uci[3], 10);
    const piece = chess.get(from as any);
    if (piece && piece.type === "p" && (toRank === 8 || toRank === 1)) {
      moveObj.promotion = (uci[4] as string) || "q";
    } else if (uci.length >= 5) {
      moveObj.promotion = uci[4];
    }

    let san: string;
    try {
      const result = chess.move(moveObj as any);
      san = result?.san ?? uci;
    } catch {
      // Illegal / unparseable move — fall back to the raw UCI token so the
      // caller still gets output rather than throwing.
      san = uci;
    }

    // White moves are prefixed with "N."; black moves with "N...".
    const moveNumber = Math.floor(idx / 2) + 1;
    const isWhite = idx % 2 === 0;
    const numberLabel = isWhite ? `${moveNumber}.` : `${moveNumber}...`;

    // Only emit a "N..." black number label when it starts a line; when the
    // black move immediately follows its white counterpart, no label is needed.
    if (isWhite) {
      tokens.push(`${numberLabel} ${san}`);
    } else if (idx === 0) {
      tokens.push(`${numberLabel} ${san}`);
    } else {
      tokens.push(san);
    }

    const note = moveNotes[idx];
    if (note && note.trim().length > 0) {
      const safe = note.replace(/}/g, ")").trim();
      tokens.push(`{ ${safe} }`);
    }
  });

  return tokens.join(" ").trim();
}

/**
 * True when at least one non-empty note exists in the map.
 */
export function hasAnyNotes(moveNotes: Record<number, string>): boolean {
  return Object.values(moveNotes).some((n) => n && n.trim().length > 0);
}
