import { Chess } from "chess.js";
import type { AnalysisLine, AnalysisEntry, Move } from "../types";

const uciMoveRegex = /[a-h][1-8][a-h][1-8][qrbn]?/g;

const pieceNames: Record<string, string> = {
  p: "Pawn",
  r: "Rook",
  n: "Knight",
  b: "Bishop",
  q: "Queen",
  k: "King"
};
const colorNames: Record<string, string> = {
  w: "White",
  b: "Black"
};

const WHITE_GLYPHS: Record<string, string> = { N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
const BLACK_GLYPHS: Record<string, string> = { N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };

export const sanWithGlyph = (san: string, isBlack: boolean): string => {
  const map = isBlack ? BLACK_GLYPHS : WHITE_GLYPHS;
  return san.replace(/^([NBRQK])/, (_, l) => map[l] ?? l);
};

const loadBoard = (fen: string): Chess => {
  const board = new Chess();
  if (fen && fen !== "start") {
    try { board.load(fen); } catch { board.reset(); }
  } else {
    board.reset();
  }
  return board;
};

const formatSanLine = (glyphedMoves: string[], startTurn: "w" | "b", startMoveNum: number): string => {
  if (!glyphedMoves.length) return "No moves";
  const parts: string[] = [];
  let moveNum = startMoveNum;
  let blackToMove = startTurn === "b";

  for (let i = 0; i < glyphedMoves.length; i++) {
    if (blackToMove) {
      if (i === 0) parts.push(`${moveNum}…`);
      parts.push(glyphedMoves[i]);
      blackToMove = false;
      moveNum++;
    } else {
      parts.push(`${moveNum}.`);
      parts.push(glyphedMoves[i]);
      blackToMove = true;
    }
  }
  return parts.join(" ");
};

const formatUciLine = (uciMoves: string[]): string => {
  if (!uciMoves.length) return "No moves";
  return uciMoves.join(" ");
};

const cleanNoise = (text: string | null | undefined): string => {
  if (!text) {
    return "";
  }
  return text
    .replace(/Line\s*\d+,?\s*/gi, "")
    .replace(/CP\s*-?\d+/gi, "")
    .replace(/#/g, "")
    .replace(/\s+/g, " ")
    .trim();
};


const describeMovesForLlm = ({
  moves,
  startingFen = "start"
}: {
  moves: Move[];
  startingFen?: string;
}): string => {
  const board = new Chess();
  if (startingFen && startingFen !== "start") {
    try {
      board.load(startingFen);
    } catch {
      board.reset();
    }
  } else {
    board.reset();
  }
  const attackColor = board.turn() === "w" ? "White" : "Black";
  const defenderColor = attackColor === "White" ? "Black" : "White";
  const moveDetails: Array<{
    colorName: string;
    pieceName: string;
    from: string;
    to: string;
    san: string;
    isCapture: boolean;
  }> = [];

  for (const move of moves || []) {
    try {
      const moveResult = board.move({ from: move.from, to: move.to, promotion: "q" });
      if (!moveResult) break;
      moveDetails.push({
        colorName: colorNames[moveResult.color] || "Both sides",
        pieceName: pieceNames[moveResult.piece] || "piece",
        from: move.from,
        to: move.to,
        san: moveResult.san || `${move.from}${move.to}`,
        isCapture: (moveResult.flags || "").includes("c")
      });
    } catch {
      break;
    }
  }

  const movesLine = (moves || []).map((move) => `${move.from}${move.to}`).join(" ") || "none";
  const first = moveDetails[0];
  const riskText = first
    ? `${first.colorName} must guard ${first.from} after moving the ${first.pieceName.toLowerCase()}, while ${defenderColor} can look to pressure ${first.to}.`
    : `${attackColor} and ${defenderColor} must stay alert to the center tension.`;
  const attackText = first
    ? `${attackColor} attacks by bringing the ${first.pieceName.toLowerCase()} to ${first.to} and keeping ${first.to} under watch.`
    : `${attackColor} wants to improve piece placement before executing a concrete threat.`;
  const opponentIdea = first
    ? `${defenderColor} should reply by contesting ${first.to} or reinforcing the ${first.to} square with another piece.`
    : `${defenderColor} should finish development and challenge the newly opened files.`;

  return [
    `Position FEN: ${startingFen}`,
    `Moves: ${movesLine}`,
    `Risks: ${riskText}`,
    `Attack: ${attackText}`,
    `Opponent idea: ${opponentIdea}`
  ].join("\n");
};

export const parseStockfishLine = (
  line: AnalysisLine,
  fallbackRank: number = 1,
  startingFen: string = "start"
): AnalysisEntry => {
  const rawPv = Array.isArray(line.pv) ? line.pv.join(" ") : line.pv || "";
  const rawLine = (line.line || line.text || rawPv || "").trim();
  const cleaned = cleanNoise(rawLine);

  // Prefer pv field for UCI moves; fall back to line/text when pv is absent
  const pvSource = rawPv || rawLine;
  const uciMoves = pvSource.match(uciMoveRegex) ?? [];

  const board = loadBoard(startingFen);
  const startTurn = board.turn() as "w" | "b";
  const startMoveNum = board.moveNumber();

  const moves: Move[] = [];
  const glyphedMoves: string[] = [];
  const processedUciMoves: string[] = [];

  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5 ? (uci[4] as "q" | "r" | "b" | "n") : "q";
    const isBlack = board.turn() === "b";
    try {
      const result = board.move({ from, to, promotion });
      if (!result) break;
      moves.push({ from, to });
      glyphedMoves.push(sanWithGlyph(result.san, isBlack));
      processedUciMoves.push(uci);
    } catch {
      break;
    }
  }

  let scoreValue: string | number | undefined = undefined;
  if (line.score) {
    if ("type" in line.score && line.score.type === "mate" && "value" in line.score) {
      scoreValue = `Mate ${line.score.value}`;
    } else if ("value" in line.score && line.score.value !== undefined) {
      scoreValue = line.score.value;
    }
  }
  const scoreLabel: string | null = typeof scoreValue === "string"
    ? scoreValue
    : typeof scoreValue === "number"
    ? `CP ${scoreValue}`
    : null;
  const llmUserMessage = describeMovesForLlm({ moves, startingFen });

  return {
    id: line.id ?? `stockfish-line-${fallbackRank}`,
    rank: line.rank ?? fallbackRank,
    rawText: rawLine || cleaned || "No data",
    cleanText: cleaned || "No data",
    moves,
    scoreLabel,
    description: formatSanLine(glyphedMoves, startTurn, startMoveNum),
    uciDescription: formatUciLine(processedUciMoves),
    llmUserMessage
  };
};

export const deriveFenSequence = (
  moves: Move[],
  startingFen: string = "start"
): string[] => {
  const board = new Chess();
  if (startingFen && startingFen !== "start") {
    try {
      board.load(startingFen);
    } catch (err) {
      board.reset();
    }
  } else {
    board.reset();
  }
  const initialFen = startingFen === "start" ? board.fen() : startingFen;
  const sequence: string[] = [initialFen];

  for (const move of moves || []) {
    try {
      const nextMove = board.move({ from: move.from, to: move.to, promotion: "q" });
      if (!nextMove) break;
      sequence.push(board.fen());
    } catch {
      break;
    }
  }
  return sequence;
};

const parseFenString = (input: string): string[] | null => {
  const chess = new Chess();
  try {
    chess.load(input);
    return [input];
  } catch {
    return null;
  }
};

const parsePgn = (input: string): string[] | null => {
  const parser = new Chess();
  try {
    parser.loadPgn(input);
  } catch {
    return null;
  }
  const moves = parser.history();
  const board = new Chess();
  const positions: string[] = [board.fen()];

  for (const san of moves) {
    const result = board.move(san, { strict: false });
    if (!result) {
      break;
    }
    positions.push(board.fen());
  }
  return positions;
};

/**
 * Converts a score to a comparable numeric value for sorting.
 * Higher values = better for white.
 * Used to sort engine analysis lines by quality.
 */
const scoreToComparable = (score: AnalysisLine["score"]): number => {
  if (!score) return -Infinity;

  // Centipawn score
  if ("value" in score && score.type === "cp") {
    return score.value;
  }

  // Mate score - convert to large value (mate in 1 is best)
  if ("value" in score && score.type === "mate") {
    const mateValue = score.value;
    // Positive = white mates, negative = black mates
    // Mate in 1 for white = 100000 points
    // Mate in 10 for white = 99000 points
    // etc.
    return mateValue > 0 ? 100000 - (mateValue * 100) : -100000 + (Math.abs(mateValue) * 100);
  }

  // Win probability score
  if ("winProb" in score) {
    return score.winProb * 10000;
  }

  return 0;
};

const firstMoveOf = (line: AnalysisLine): string =>
  (line.pv || line.line || "").trim().split(/\s+/)[0] || "";

/**
 * Sorts analysis lines by their engine multipv ranking (from "rank" field).
 * The engine's multipv number (1 = best, 2 = 2nd best, etc.) is stored in rank.
 *
 * When the engine reports a `bestMove` (and optionally a `ponderMove`), those
 * take priority over the multipv ranking: the line whose first move matches
 * `bestMove` is placed first, the line matching `ponderMove` second, and the
 * remaining lines keep the existing rank/score ordering. This matters because an
 * engine's chosen bestmove/ponder can differ from the raw multipv order (notably
 * for LC0).
 */
export const sortLinesByScore = (
  lines: AnalysisLine[],
  bestMove?: string,
  ponderMove?: string
): AnalysisLine[] => {
  const byRank = [...lines].sort((a, b) => {
    // Sort by rank (multipv ranking) - lower rank = better evaluation
    const rankA = a.rank ?? Infinity;
    const rankB = b.rank ?? Infinity;

    if (rankA !== rankB) {
      return rankA - rankB; // Ascending order by rank (1 < 2 < 3 < 4)
    }

    // Fallback: sort by score if ranks are equal
    const scoreA = scoreToComparable(a.score);
    const scoreB = scoreToComparable(b.score);
    return scoreB - scoreA; // Descending order (best first)
  });

  if (!bestMove && !ponderMove) return byRank;

  const prioritized: AnalysisLine[] = [];
  const used = new Set<AnalysisLine>();
  // Order matters: bestMove first, then ponderMove. Skip a move that matches no
  // line, and never place the same line twice (e.g. best === ponder).
  for (const move of [bestMove, ponderMove]) {
    if (!move) continue;
    const match = byRank.find((line) => !used.has(line) && firstMoveOf(line) === move);
    if (match) {
      prioritized.push(match);
      used.add(match);
    }
  }
  const rest = byRank.filter((line) => !used.has(line));
  return [...prioritized, ...rest];
};

export const parseFenOrPgnInput = (
  input: string
): { positions: string[] } | { error: string } => {
  if (!input) {
    return { error: "No input provided." };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "No input provided." };
  }
  const fenParts = trimmed.split(/\s+/);
  const maybeFen = fenParts.length === 6 && trimmed.includes("/");

  if (maybeFen) {
    const fenResult = parseFenString(trimmed);
    if (fenResult) {
      return { positions: fenResult };
    }
  }

  const pgnPositions = parsePgn(trimmed);
  if (pgnPositions) {
    return { positions: pgnPositions };
  }
  return { error: "Unable to parse input. Provide a valid FEN or PGN string." };
};

/**
 * Number of half-moves (plies) played to reach a position, derived from the FEN's
 * fullmove counter and side-to-move. Start = 0 plies; after 1.e4 = 1; after
 * 1.e4 e5 = 2; after 1.e4 e5 2.Nf3 = 3, etc. Used to hold the auto LLM
 * explanation until enough of the opening is on the board to be identifiable.
 */
export const pliesFromFen = (fen: string): number => {
  const parts = fen.split(/\s+/);
  if (parts.length < 6) return 0;
  const fullmove = parseInt(parts[5], 10);
  if (!Number.isFinite(fullmove) || fullmove < 1) return 0;
  const blackToMove = parts[1] === "b";
  return (fullmove - 1) * 2 + (blackToMove ? 1 : 0);
};

/**
 * SAN move sequence (with move numbers) for a selected engine line, sourced from
 * the already-parsed entry's `description`. Returns "" when there is no entry or
 * the line has no moves, so the "Moves of selected line" control can hide itself.
 * `parseStockfishLine` guarantees `description` only contains legal, parsed moves,
 * so this never surfaces a raw/unparseable token.
 */
export const selectedLineMovesText = (entry: AnalysisEntry | null | undefined): string =>
  entry && entry.moves.length > 0 ? entry.description || "" : "";
