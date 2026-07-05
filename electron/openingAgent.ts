import { Chess } from "chess.js";
import { lookupOpeningByMoves } from "./ecoLookup";
import type { ConversationMessage, TrainingMove } from "../src/types";
import { withGuardrail } from "./agentPrompts";

export type LlmCaller = (params: {
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
  responseFormat?: Record<string, any>;
}) => Promise<string>;

export interface OpeningAgentResponse {
  ok: boolean;
  answer?: string;
  error?: string;
}

const OPENING_SYSTEM_PROMPT = `You are a friendly chess opening coach for children aged 4–18.
Your job is to teach chess openings in a fun, encouraging way using simple language.
You should use chess technical terms (like "development", "center control", "tempo", "initiative") but always give a short definition the first time you use them.
When you know a famous game or player story related to the opening, include it — mention the real player name, year, and tournament.

You MUST respond with a valid JSON object in this exact format:
{
  "response_type": "Opening",
  "opening_name": "<full opening name including variation>",
  "eco_code": "<ECO code like B90>",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [
    { "uci": "<UCI move like e2e4>", "san": "<SAN move like e4>", "commentary": "<2-4 sentences of child-friendly explanation>" },
    ...
  ],
  "story": "<An optional real-world story about this opening: player, year, tournament, what happened>",
  "explanation": "<A welcoming 1-2 sentence intro shown before the first move>"
}

Rules:
- The "fen" field is ALWAYS the standard starting position FEN (openings start from the beginning).
- Include 5–15 moves covering the main line.
- Each "commentary" must be 2–4 encouraging sentences for a child. Introduce technical terms with brief definitions.
- The "story" should reference real players, years, and tournaments. If unsure, say so rather than inventing details.
- All language must be child-appropriate — no adult themes, no discouraging words.
- Do NOT include ECO codes in your response. Leave the eco_code field empty or omit it.
- Do not include any text outside the JSON object.`;

function parseOpeningResponse(raw: string): {
  response_type: string;
  opening_name?: string;
  eco_code?: string;
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
      console.warn(`[Opening] Skipping invalid UCI move: ${JSON.stringify(m.uci)}`);
      continue;
    }
    try {
      const result = chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
      if (result) {
        valid.push({ uci: m.uci, san: m.san || result.san, commentary: m.commentary || "" });
      } else {
        console.warn(`[Opening] Illegal move skipped: ${m.uci}`);
      }
    } catch {
      console.warn(`[Opening] Move error skipped: ${m.uci}`);
    }
  }
  return valid;
}

export async function handleOpeningRequest(
  question: string,
  conversationHistory: ConversationMessage[],
  runLlm: LlmCaller
): Promise<OpeningAgentResponse> {
  console.log(`[Opening] Request: "${question.substring(0, 60)}"`);

  // Try to resolve ECO context to inject into prompt
  const ecoContextParts: string[] = [];
  const ecoMatch = lookupOpeningByMoves(["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"]);
  if (ecoMatch) {
    // We'll inject ECO context based on what the LLM identifies — it's in the user message
    // The actual lookup happens after the LLM tells us which opening
  }

  const recentHistory = conversationHistory.slice(-6).map(h => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.message
  }));

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: withGuardrail(OPENING_SYSTEM_PROMPT) },
    ...recentHistory,
    { role: "user", content: question }
  ];

  try {
    const raw = await runLlm({ messages });
    const parsed = parseOpeningResponse(raw);

    if (!parsed || parsed.response_type !== "Opening") {
      console.error("[Opening] Invalid response structure");
      return { ok: false, error: "Opening agent returned an unexpected response. Please try again!" };
    }

    const startFen = parsed.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const rawMoves = Array.isArray(parsed.moves) ? parsed.moves : [];
    const validMoves = validateUciMoves(rawMoves.slice(0, 15), startFen);

    // Try to enrich eco_code via library lookup on the validated moves
    let ecoCode = parsed.eco_code || "";
    let openingName = parsed.opening_name || "";
    const moveUcis = validMoves.map(m => m.uci);
    if (moveUcis.length > 0) {
      const libMatch = lookupOpeningByMoves(moveUcis, startFen);
      if (libMatch) {
        ecoCode = libMatch.eco;
        openingName = libMatch.name;
      }
    }

    const answer = JSON.stringify({
      response_type: "Opening",
      opening_name: openingName || parsed.opening_name,
      eco_code: ecoCode || parsed.eco_code,
      fen: startFen,
      moves: validMoves,
      story: parsed.story || "",
      explanation: parsed.explanation || ""
    });

    console.log(`[Opening] ✓ ${openingName || "(unnamed)"} | ${validMoves.length} moves`);
    return { ok: true, answer };
  } catch (err) {
    const msg = (err as Error)?.message || "Opening agent failed.";
    console.error(`[Opening] ✗ ${msg}`);
    return { ok: false, error: msg };
  }
}
