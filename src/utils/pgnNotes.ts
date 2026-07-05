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
  // PGN rule: a Black move must carry a "N..." move-number indication when a
  // comment (or any token) interrupts the movetext before it. We therefore track
  // whether the previous move emitted a comment and re-number Black accordingly.
  let prevMoveHadComment = false;

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

    // White moves are always numbered ("N."). Black moves normally follow their
    // White counterpart without a label, but must be re-numbered ("N...") when
    // they start the movetext or a comment interrupted the flow before them.
    if (isWhite) {
      tokens.push(`${numberLabel} ${san}`);
    } else if (idx === 0 || prevMoveHadComment) {
      tokens.push(`${numberLabel} ${san}`);
    } else {
      tokens.push(san);
    }

    const note = moveNotes[idx];
    if (note && note.trim().length > 0) {
      // PGN comments are delimited by "{ }" and cannot contain a brace of either
      // kind (they neither nest nor allow a literal "}"). Substitute parentheses
      // so the movetext stays parseable, and collapse CR/LF pairs to plain "\n".
      const safe = note
        .replace(/\{/g, "(")
        .replace(/\}/g, ")")
        .replace(/\r\n?/g, "\n")
        .trim();
      tokens.push(`{ ${safe} }`);
      prevMoveHadComment = true;
    } else {
      prevMoveHadComment = false;
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
