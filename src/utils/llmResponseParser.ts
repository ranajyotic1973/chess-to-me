import type { ResponseType, LLMResponse } from "../types";

/**
 * Parse LLM response JSON and extract structured fields
 */
export function parseLLMResponse(responseText: string): LLMResponse {
  try {
    const parsed = JSON.parse(responseText);
    return {
      ok: true,
      response_type: normalizeResponseType(parsed.response_type || parsed.type || "Analysis"),
      type: normalizeResponseType(parsed.response_type || parsed.type || "Analysis"),
      answer: parsed.answer || parsed.explanation || "",
      explanation: parsed.explanation || parsed.answer || "",
      fen: parsed.fen,
      solution: Array.isArray(parsed.solution) ? parsed.solution : undefined,
      solution_san: Array.isArray(parsed.solution_san) ? parsed.solution_san : undefined,
      side_to_move: parsed.side_to_move,
      hidden_solution: parsed.hidden_solution || false,
      lines: parsed.lines,
      annotations: parsed.annotations,
      // Puzzle metadata from DB responses
      themes: parsed.themes,
      difficulty: parsed.difficulty,
      rating: parsed.rating,
      opening_tags: parsed.opening_tags,
      puzzle_id: parsed.puzzle_id,
      setup_move: parsed.setup_move,
      setup_move_san: parsed.setup_move_san,
      game_list: Array.isArray(parsed.game_list) ? parsed.game_list : undefined,
      auto_load: parsed.auto_load === true,
      error: undefined
    };
  } catch (_e) {
    // Non-JSON response (plain text / markdown from ANALYSIS handler) — treat as answer
    const trimmed = responseText.trim();
    if (trimmed) {
      return {
        ok: true,
        response_type: "Analysis",
        type: "Analysis",
        answer: trimmed,
        explanation: trimmed
      };
    }
    return {
      ok: false,
      response_type: "Analysis",
      type: "Analysis",
      error: "Empty response from LLM"
    };
  }
}

/**
 * Normalize response type to valid enum value
 */
function normalizeResponseType(type: any): ResponseType {
  const normalized = String(type || "").trim().toLowerCase();
  switch (normalized) {
    case "puzzle":
      return "Puzzle";
    case "position":
      return "Position";
    case "game":
      return "Game";
    case "gamelist":
      return "GameList";
    case "analysis":
    default:
      return "Analysis";
  }
}

/**
 * Validate that response includes required fields for its type
 */
export function validateLLMResponse(response: LLMResponse): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!response.response_type && !response.type) {
    errors.push("Missing response_type field");
  }

  const responseType = response.response_type || response.type || "Analysis";

  if (responseType === "Puzzle" || responseType === "Position") {
    if (!response.fen) {
      errors.push(`${responseType} response requires fen field`);
    }
  }

  if (responseType === "Game") {
    if (!response.annotations) {
      errors.push("Game response requires annotations field");
    }
  }

  if (responseType !== "GameList" && !response.answer && !response.explanation) {
    errors.push("Response must include answer or explanation");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract conversation history into format for LLM context
 */
export function formatConversationHistory(messages: Array<{ role: "user" | "assistant"; message: string }>): string {
  return messages
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.message}`)
    .join("\n\n");
}
