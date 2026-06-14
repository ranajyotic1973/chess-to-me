import { Chess } from "chess.js";
import type { ConversationMessage, TrainingMove } from "../src/types";

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
  runLlm: LlmCaller
): Promise<EndgameAgentResponse> {
  console.log(`[Endgame] Request: "${question.substring(0, 60)}"`);

  const recentHistory = conversationHistory.slice(-6).map(h => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.message
  }));

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: ENDGAME_SYSTEM_PROMPT },
    ...recentHistory,
    { role: "user", content: question }
  ];

  try {
    const raw = await runLlm({ messages });
    const parsed = parseEndgameResponse(raw);

    if (!parsed || parsed.response_type !== "Endgame") {
      console.error("[Endgame] Invalid response structure");
      return { ok: false, error: "Endgame agent returned an unexpected response. Please try again!" };
    }

    if (!parsed.fen || !validateFen(parsed.fen)) {
      console.error(`[Endgame] Invalid FEN: ${parsed.fen}`);
      return {
        ok: false,
        error: "Invalid endgame position received — please try again! 🙂"
      };
    }

    const rawMoves = Array.isArray(parsed.moves) ? parsed.moves : [];
    const validMoves = validateUciMoves(rawMoves.slice(0, 20), parsed.fen);

    const answer = JSON.stringify({
      response_type: "Endgame",
      title: parsed.title || "Endgame Practice",
      fen: parsed.fen,
      moves: validMoves,
      story: parsed.story || "",
      explanation: parsed.explanation || ""
    });

    console.log(`[Endgame] ✓ "${parsed.title}" | FEN: ${parsed.fen} | ${validMoves.length} moves`);
    return { ok: true, answer };
  } catch (err) {
    const msg = (err as Error)?.message || "Endgame agent failed.";
    console.error(`[Endgame] ✗ ${msg}`);
    return { ok: false, error: msg };
  }
}
