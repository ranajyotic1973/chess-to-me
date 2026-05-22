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
      hidden_solution: parsed.hidden_solution || false,
      lines: parsed.lines,
      annotations: parsed.annotations,
      error: undefined
    };
  } catch (e) {
    return {
      ok: false,
      response_type: "Analysis",
      type: "Analysis",
      error: `Failed to parse LLM response: ${e instanceof Error ? e.message : String(e)}`
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

  if (!response.answer && !response.explanation) {
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
