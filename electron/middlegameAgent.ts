import { Chess } from "chess.js";
import type { ConversationMessage, TrainingMove } from "../src/types";
import { withGuardrail } from "./agentPrompts";

export type LlmCaller = (params: {
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
  responseFormat?: Record<string, any>;
}) => Promise<string>;

export interface MiddlegameAgentResponse {
  ok: boolean;
  answer?: string;
  error?: string;
}

const MIDDLEGAME_SYSTEM_PROMPT = `You are a friendly chess middlegame coach for children aged 4–18.
Your job is to explain middlegame strategy, plans, and ideas in a fun and encouraging way.

Use simple, exciting language. Introduce technical terms (like "outpost", "pawn structure", "open file", "piece activity",
"king safety", "initiative", "weak square", "bishop pair") with a brief definition the first time you use them.
When you know a famous player or game that illustrates the concept, mention the real name, year, and tournament.

The user may provide a current board position (FEN) — if so, analyse THAT position specifically.
If no position is given, create a clear model middlegame position that best illustrates the requested concept.

You MUST respond with a valid JSON object in this exact format:
{
  "response_type": "Middlegame",
  "title": "<Short descriptive title, e.g. 'Isolated Queen's Pawn — Active Piece Play'>",
  "fen": "<A legal FEN representing the starting position for this lesson>",
  "theme": "<One primary theme, e.g. 'Pawn Structure' | 'King Safety' | 'Piece Activity' | 'Open Files' | 'Outposts' | 'Attack and Defence' | 'Piece Coordination'>",
  "moves": [
    { "uci": "<UCI move like d4d5>", "san": "<SAN move like d5>", "commentary": "<2–4 sentences of child-friendly explanation of WHY this is the right plan>" },
    ...
  ],
  "story": "<Optional real-world reference: player, year, tournament, what happened — omit if unsure>",
  "explanation": "<A welcoming 1–2 sentence intro describing the position and the main topic>"
}

Rules:
- The "fen" field MUST be a valid chess position. If a current FEN was provided by the user, use it exactly.
- Include 6–16 moves illustrating the key strategic ideas for BOTH sides.
- Each "commentary" must be 2–4 encouraging sentences explaining the PLAN behind the move, not just the move itself.
  Introduce technical terms inline with brief definitions (e.g. "outpost — a square your opponent cannot attack with a pawn!").
- Focus on PLANS and IDEAS, not just the best engine move. Show why certain squares, files, and piece placements matter.
- The "story" should reference a real famous game if possible — name the players, event, and year. Omit the field rather than inventing details.
- All language must be child-appropriate — encouraging, clear, and never discouraging.
- Do not include any text outside the JSON object.`;

function parseMiddlegameResponse(raw: string): {
  response_type: string;
  title?: string;
  fen?: string;
  theme?: string;
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
      try { return JSON.parse(jsonMatch[0]); } catch { return null; }
    }
    return null;
  }
}

function validateFen(fen: string): boolean {
  try { new Chess(fen); return true; } catch { return false; }
}

function validateUciMoves(moves: TrainingMove[], startFen: string): TrainingMove[] {
  const chess = new Chess();
  try { chess.load(startFen); } catch { return []; }
  const valid: TrainingMove[] = [];
  for (const m of moves) {
    if (!m.uci || typeof m.uci !== "string" || m.uci.length < 4) {
      console.warn(`[Middlegame] Skipping invalid UCI: ${JSON.stringify(m.uci)}`);
      continue;
    }
    try {
      const result = chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
      if (result) {
        valid.push({ uci: m.uci, san: m.san || result.san, commentary: m.commentary || "" });
      } else {
        console.warn(`[Middlegame] Illegal move skipped: ${m.uci}`);
      }
    } catch {
      console.warn(`[Middlegame] Move error skipped: ${m.uci}`);
    }
  }
  return valid;
}

export async function handleMiddlegameRequest(
  question: string,
  conversationHistory: ConversationMessage[],
  currentFen: string | undefined,
  runLlm: LlmCaller
): Promise<MiddlegameAgentResponse> {
  console.log(`[Middlegame] Request: "${question.substring(0, 60)}"`);

  const recentHistory = conversationHistory.slice(-6).map(h => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.message
  }));

  // Inject the current board position so the agent can focus on it
  const fenContext = currentFen && currentFen !== "start"
    ? `\n\nCurrent board position (FEN): ${currentFen}`
    : "";

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: withGuardrail(MIDDLEGAME_SYSTEM_PROMPT) },
    ...recentHistory,
    { role: "user", content: question + fenContext }
  ];

  try {
    const raw = await runLlm({ messages });
    const parsed = parseMiddlegameResponse(raw);

    if (!parsed || parsed.response_type !== "Middlegame") {
      console.error("[Middlegame] Invalid response structure");
      return { ok: false, error: "Middlegame agent returned an unexpected response. Please try again!" };
    }

    // Prefer the current board FEN if valid; fall back to what the LLM provided
    const startFen = (currentFen && currentFen !== "start" && validateFen(currentFen))
      ? currentFen
      : (parsed.fen && validateFen(parsed.fen) ? parsed.fen : null);

    if (!startFen) {
      console.error(`[Middlegame] Invalid FEN: ${parsed.fen}`);
      return { ok: false, error: "Invalid position received — please try again!" };
    }

    const rawMoves = Array.isArray(parsed.moves) ? parsed.moves : [];
    const validMoves = validateUciMoves(rawMoves.slice(0, 16), startFen);

    const answer = JSON.stringify({
      response_type: "Middlegame",
      title: parsed.title || "Middlegame Study",
      fen: startFen,
      theme: parsed.theme || "",
      moves: validMoves,
      story: parsed.story || "",
      explanation: parsed.explanation || ""
    });

    console.log(`[Middlegame] ✓ "${parsed.title}" | theme: ${parsed.theme} | ${validMoves.length} moves`);
    return { ok: true, answer };
  } catch (err) {
    const msg = (err as Error)?.message || "Middlegame agent failed.";
    console.error(`[Middlegame] ✗ ${msg}`);
    return { ok: false, error: msg };
  }
}
