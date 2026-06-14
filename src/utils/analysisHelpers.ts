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

const sanWithGlyph = (san: string, isBlack: boolean): string => {
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
