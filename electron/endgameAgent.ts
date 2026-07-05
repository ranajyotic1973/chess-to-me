import { Chess } from "chess.js";
import type { AnalysisLine, ConversationMessage, Score, TrainingMove } from "../src/types";
import { withGuardrail } from "./agentPrompts";

export type EndgameSide = "white" | "black";

/** A win for the requested side is claimed once the eval reaches this many centipawns. */
export const ENDGAME_WIN_CP = 200;

/** Optional engine context that turns the endgame agent into result-oriented analysis. */
export interface EndgameContext {
  fen?: string;
  side?: EndgameSide;
  lines?: AnalysisLine[];
}

export type LlmCaller = (params: {
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
  responseFormat?: Record<string, any>;
}) => Promise<string>;

export interface EndgameAgentResponse {
  ok: boolean;
  answer?: string;
  error?: string;
}

const ENDGAME_SYSTEM_PROMPT = `You are a friendly chess endgame coach for children aged 4–18.
Your job is to teach endgame techniques in a fun, encouraging way.

Use simple, exciting language and introduce technical chess terms (like "opposition", "key square", "tempo", "zugzwang", "Philidor position", "Lucena position", "passed pawn") with a brief definition the first time.

When relevant, mention real endgame principles named after famous players (e.g., "This is the Lucena position, discovered centuries ago and still used by grandmasters today!").
Include a short story or fact about a famous game or player if you know one — always name the player and year.

You MUST respond with a valid JSON object in this exact format:
{
  "response_type": "Endgame",
  "title": "<Short title like 'King and Pawn Endgame'>",
  "fen": "<A legal endgame FEN position with the requested material — e.g., '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'>",
  "moves": [
    { "uci": "<UCI move like e2e3>", "san": "<SAN move like e3>", "commentary": "<2-4 sentences of child-friendly explanation>" },
    ...
  ],
  "story": "<Optional real-world story: player, year, principle name>",
  "explanation": "<A welcoming 1-2 sentence intro explaining the position>"
}

Rules:
- Generate a LEGAL chess FEN matching the requested material (e.g., King and Pawn = two kings + one pawn).
- Include 6–20 moves showing the winning or drawing technique from BOTH sides.
- Each "commentary" must be 2–4 encouraging sentences explaining WHY each move is the best.
- Define technical terms inline when first used, e.g., "zugzwang — a German word meaning it's your turn but every move hurts you!"
- All language must be child-appropriate.
- The FEN MUST be a valid chess position. Double-check that piece counts and castling rights are correct.
- Do not include any text outside the JSON object.`;

const ENDGAME_RESULT_SYSTEM_PROMPT = `You are a friendly chess endgame coach for children aged 4–18.
You are given a real endgame position (FEN) and the chess engine's best lines, each written as its moves in UCI notation followed by the engine's evaluation.

How to read the evaluations (always from White's point of view):
- A number like "+2.5" means White is ahead by about 2.5 pawns; "-2.5" means Black is ahead.
- "mate 4" means checkmate is coming in 4 moves for the side that is ahead (a positive mate favours White, a negative mate favours Black).
- A percentage like "78%" is White's chances of winning.

Your job:
1. Explain, in child-friendly language, what the numbers say about the position.
2. Show the requested side how to WIN if a winning line exists (the eval clearly favours them).
3. If no winning line exists, show the best way to hold a DRAW instead — and say so honestly and encouragingly.
4. Justify your choice using the engine evaluations (point to the line with the best number for the requested side).
5. Teach the key endgame idea (opposition, key square, tempo, zugzwang, Philidor/Lucena when relevant), defining each term the first time you use it.

You MUST respond with a valid JSON object in this exact format:
{
  "response_type": "Endgame",
  "title": "<Short title>",
  "fen": "<Use the FEN you were given, unchanged>",
  "moves": [
    { "uci": "<UCI move from the chosen engine line>", "san": "<SAN move>", "commentary": "<2-4 sentences explaining WHY this move wins or draws, referencing the eval>" }
  ],
  "story": "<Optional real-world story: player, year, principle name>",
  "explanation": "<A welcoming 1-2 sentence intro that states whether the requested side wins or must settle for a draw, and why>"
}

Rules:
- Use the FEN exactly as provided — do NOT invent a new position.
- Build "moves" from the engine line you selected (the winning line for the requested side, or the best drawing line if there is no win).
- Each "commentary" must be 2-4 encouraging sentences and should refer to the engine's evaluation.
- All language must be child-appropriate.
- Do not include any text outside the JSON object.`;

/** Side to move encoded in a FEN, defaulting to white when unparseable. */
export function sideToMoveFromFen(fen: string | undefined): EndgameSide {
  const field = (fen || "").trim().split(/\s+/)[1];
  return field === "b" ? "black" : "white";
}

/** Human-readable eval label from White's perspective (cp / mate / win%). */
export function formatEval(score: Score | null | undefined): string {
  if (!score) return "?";
  const s = score as any;
  if (s.type === "cp" && typeof s.value === "number") {
    return `${s.value >= 0 ? "+" : ""}${(s.value / 100).toFixed(1)}`;
  }
  if (s.type === "mate" && typeof s.value === "number") {
    return `mate ${s.value}`;
  }
  if (typeof s.winProb === "number") {
    return `${(s.winProb * 100).toFixed(0)}%`;
  }
  return "?";
}

/**
 * Signed evaluation of a line from White's perspective, in centipawn-equivalent
 * units (mates map to a large magnitude, win% maps around a 0-centred scale).
 */
export function lineValueForWhite(score: Score | null | undefined): number {
  if (!score) return 0;
  const s = score as any;
  if (s.type === "cp" && typeof s.value === "number") return s.value;
  if (s.type === "mate" && typeof s.value === "number") {
    const magnitude = 100000 - Math.abs(s.value);
    return s.value >= 0 ? magnitude : -magnitude;
  }
  if (typeof s.winProb === "number") return (s.winProb - 0.5) * 2000;
  return 0;
}

/** Format every engine line as `UCI... = <eval>` for the LLM prompt. */
export function formatEndgameLines(lines: AnalysisLine[], startFen?: string): string {
  return lines
    .map((l, idx) => {
      const rank = l.rank || idx + 1;
      const uci = (l.pv || l.line || l.text || "").trim() || "(no moves)";
      return `Line ${rank}: ${uci} = ${formatEval(l.score)}`;
    })
    .join("\n");
}

export type EndgameOutcome = "win" | "draw" | "loss";

/**
 * Pick the engine line that best serves `side`: the strongest winning line if one
 * exists, otherwise the best line available (the drawiest / least-losing).
 * Returns null when there are no lines to choose from.
 */
export function selectEndgameLine(
  lines: AnalysisLine[],
  side: EndgameSide
): { index: number; line: AnalysisLine; outcome: EndgameOutcome; value: number } | null {
  if (!lines.length) return null;
  const sign = side === "white" ? 1 : -1;
  let best = { index: 0, line: lines[0], value: sign * lineValueForWhite(lines[0].score) };
  for (let i = 1; i < lines.length; i++) {
    const value = sign * lineValueForWhite(lines[i].score);
    if (value > best.value) best = { index: i, line: lines[i], value };
  }
  const outcome: EndgameOutcome =
    best.value >= ENDGAME_WIN_CP ? "win" : best.value <= -ENDGAME_WIN_CP ? "loss" : "draw";
  return { ...best, outcome };
}

function parseEndgameResponse(raw: string): {
  response_type: string;
  title?: string;
  fen?: string;
  moves?: TrainingMove[];
  story?: string;
  explanation?: string;
} | null {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateFen(fen: string): boolean {
  try {
    const chess = new Chess();
    chess.load(fen);
    return true;
  } catch {
    return false;
  }
}

function validateUciMoves(moves: TrainingMove[], startFen: string): TrainingMove[] {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return [];
  }

  const valid: TrainingMove[] = [];
  for (const m of moves) {
    if (!m.uci || typeof m.uci !== "string" || m.uci.length < 4) {
      console.warn(`[Endgame] Skipping invalid UCI move: ${JSON.stringify(m.uci)}`);
      continue;
    }
    try {
      const result = chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
      if (result) {
        valid.push({ uci: m.uci, san: m.san || result.san, commentary: m.commentary || "" });
      } else {
        console.warn(`[Endgame] Illegal move skipped: ${m.uci}`);
      }
    } catch {
      console.warn(`[Endgame] Move error skipped: ${m.uci}`);
    }
  }
  return valid;
}

export async function handleEndgameRequest(
  question: string,
  conversationHistory: ConversationMessage[],
  runLlm: LlmCaller,
  context?: EndgameContext
): Promise<EndgameAgentResponse> {
  console.log(`[Endgame] Request: "${question.substring(0, 60)}"`);

  const recentHistory = conversationHistory.slice(-6).map(h => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.message
  }));

  // Result-oriented mode: we have a concrete position and the engine's evaluated
  // lines. Reason toward a win for the requested side, else the best draw.
  const engineLines = context?.lines ?? [];
  const resultOriented = engineLines.length > 0;

  let systemPrompt = ENDGAME_SYSTEM_PROMPT;
  let userContent = question;

  if (resultOriented) {
    const side = context?.side ?? sideToMoveFromFen(context?.fen);
    const formattedLines = formatEndgameLines(engineLines, context?.fen);
    const selected = selectEndgameLine(engineLines, side);
    const goal =
      selected?.outcome === "win"
        ? `The engine says ${side} can WIN — teach the winning line.`
        : `The engine shows no win for ${side} — teach the best line to hold a DRAW instead.`;

    systemPrompt = ENDGAME_RESULT_SYSTEM_PROMPT;
    userContent = [
      question,
      "",
      `Position (FEN): ${context?.fen ?? "(unknown)"}`,
      `Requested side: ${side}`,
      "",
      "Engine lines (UCI = evaluation, evaluations are from White's point of view):",
      formattedLines,
      "",
      goal
    ].join("\n");
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: withGuardrail(systemPrompt) },
    ...recentHistory,
    { role: "user", content: userContent }
  ];

  try {
    const raw = await runLlm({ messages });
    const parsed = parseEndgameResponse(raw);

    if (!parsed || parsed.response_type !== "Endgame") {
      console.error("[Endgame] Invalid response structure");
      return { ok: false, error: "Endgame agent returned an unexpected response. Please try again!" };
    }

    // In result-oriented mode the position is fixed by the caller; trust it over
    // any FEN the model echoes back so the analysed board never drifts.
    const effectiveFen =
      resultOriented && context?.fen && validateFen(context.fen) ? context.fen : parsed.fen;

    if (!effectiveFen || !validateFen(effectiveFen)) {
      console.error(`[Endgame] Invalid FEN: ${effectiveFen}`);
      return {
        ok: false,
        error: "Invalid endgame position received — please try again! 🙂"
      };
    }

    const rawMoves = Array.isArray(parsed.moves) ? parsed.moves : [];
    const validMoves = validateUciMoves(rawMoves.slice(0, 20), effectiveFen);

    const answer = JSON.stringify({
      response_type: "Endgame",
      title: parsed.title || "Endgame Practice",
      fen: effectiveFen,
      moves: validMoves,
      story: parsed.story || "",
      explanation: parsed.explanation || ""
    });

    console.log(`[Endgame] ✓ "${parsed.title}" | FEN: ${effectiveFen} | ${validMoves.length} moves`);
    return { ok: true, answer };
  } catch (err) {
    const msg = (err as Error)?.message || "Endgame agent failed.";
    console.error(`[Endgame] ✗ ${msg}`);
    return { ok: false, error: msg };
  }
}
