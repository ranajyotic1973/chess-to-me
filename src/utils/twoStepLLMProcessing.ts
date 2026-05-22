import type { ResponseType } from "../types";

/**
 * First step: Determine request type without engine analysis
 * Send user question to LLM to identify what they're asking for
 */
export async function determineRequestType(
  electronAPI: any,
  userQuestion: string,
  currentFen: string,
  llmConfig: {
    llmProvider: string;
    model: string;
    baseUrl: string;
    llmApiKey: string;
    language: string;
  }
): Promise<{
  type: ResponseType;
  requiresEngineAnalysis: boolean;
  confidence: number;
}> {
  if (!electronAPI?.askQuestion) {
    return { type: "Analysis", requiresEngineAnalysis: false, confidence: 0.5 };
  }

  const requestTypeDetectionPrompt = `You are a chess request classifier. The user has asked: "${userQuestion}"

Analyze this request and respond with ONLY a JSON object (no other text):
{
  "type": "Analysis|Puzzle|Position|Game",
  "requiresEngineAnalysis": true|false,
  "reasoning": "brief explanation"
}

Guidelines:
- "Analysis": User wants engine evaluation of current position, best moves, or tactical suggestions → requiresEngineAnalysis: true
- "Puzzle": User wants a chess puzzle created or solved → requiresEngineAnalysis: false
- "Position": User wants description/evaluation of a position without engine lines → requiresEngineAnalysis: false
- "Game": User wants game analysis or PGN annotation → requiresEngineAnalysis: false

Requests mentioning "best move", "evaluate", "analyze", "what's best", "engine lines", "variations" require engine analysis.
Requests mentioning "create puzzle", "solve this", "position description", "annotate game" do NOT require engine analysis.`;

  try {
    const response = await electronAPI.askQuestion({
      question: userQuestion,
      fen: currentFen,
      language: llmConfig.language,
      model: llmConfig.model,
      baseUrl: llmConfig.baseUrl,
      llmProvider: llmConfig.llmProvider,
      llmApiKey: llmConfig.llmApiKey,
      systemPrompt: requestTypeDetectionPrompt
    });

    if (!response?.ok || !response?.answer) {
      return { type: "Analysis", requiresEngineAnalysis: false, confidence: 0.5 };
    }

    // Parse LLM response
    const parsed = parseRequestTypeResponse(response.answer);
    return parsed;
  } catch (error) {
    console.error("Error determining request type:", error);
    return { type: "Analysis", requiresEngineAnalysis: false, confidence: 0.5 };
  }
}

/**
 * Parse LLM response for request type detection
 */
function parseRequestTypeResponse(response: string): {
  type: ResponseType;
  requiresEngineAnalysis: boolean;
  confidence: number;
} {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { type: "Analysis", requiresEngineAnalysis: false, confidence: 0.5 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const typeStr = String(parsed.type || "Analysis").toLowerCase();
    const requiresEngine = Boolean(parsed.requiresEngineAnalysis);

    let type: ResponseType = "Analysis";
    if (typeStr.includes("puzzle")) type = "Puzzle";
    else if (typeStr.includes("position")) type = "Position";
    else if (typeStr.includes("game")) type = "Game";
    else type = "Analysis";

    return {
      type,
      requiresEngineAnalysis: requiresEngine,
      confidence: 0.8 // High confidence if JSON was properly formatted
    };
  } catch (error) {
    console.error("Failed to parse request type:", error);
    return { type: "Analysis", requiresEngineAnalysis: false, confidence: 0.5 };
  }
}

/**
 * Determine if question requires engine analysis by keyword matching
 * Used as fallback if LLM step fails
 */
export function quickDetectAnalysisRequired(question: string): boolean {
  const analysisKeywords = [
    "best move",
    "evaluate",
    "analyze",
    "analysis",
    "engine",
    "variation",
    "line",
    "assessment",
    "what's best",
    "what is best",
    "good move",
    "tactical",
    "strategy",
    "plan",
    "advantage",
    "winning",
    "checkmate",
    "threat"
  ];

  const lowerQuestion = question.toLowerCase();
  return analysisKeywords.some((keyword) => lowerQuestion.includes(keyword));
}
