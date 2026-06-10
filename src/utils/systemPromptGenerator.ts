import type { ResponseType } from "../types";

/**
 * Generate optimized system prompts for different response types
 * Using JSON schema format to reduce token overhead
 */

const BASE_INSTRUCTION = `You are a chess analysis assistant. Respond with valid JSON containing required fields for the response type.
Avoid generic AI commentary. Focus purely on chess strategy and tactics.`;

interface PromptConfig {
  responseType: ResponseType;
  language?: string;
}

export function generateSystemPrompt(config: PromptConfig): string {
  const { responseType, language = "English" } = config;

  const jsonSchema =
    responseType === "Analysis"
      ? `{
  "response_type": "Analysis",
  "explanation": "Strategic assessment and key ideas",
  "lines": [{"rank": 1, "pv": "moves...", "explanation": "why this variation is strong"}]
}`
      : responseType === "Puzzle"
        ? `{
  "response_type": "Puzzle",
  "fen": "valid FEN string — must be a legal chess position",
  "solution": ["d5e4", "d7e7", "d4d5"],
  "difficulty": "easy|medium|hard",
  "explanation": "full story: puzzle theme, why it works, and a move-by-move walkthrough for the learner",
  "hidden_solution": true
}`
        : responseType === "Position"
          ? `{
  "response_type": "Position",
  "fen": "current position FEN",
  "explanation": "piece placement and key features",
  "assessment": "who is better and why"
}`
          : `{
  "response_type": "Game",
  "pgn": "PGN with moves",
  "annotations": {
    "1": "!",
    "3": "!!",
    "5": "!?"
  },
  "explanation": "game analysis with move quality annotations"
}`;

  const typeSpecificGuidance =
    responseType === "Analysis"
      ? `For position analysis:
- Include top 3 engine lines with explanations
- Assess risks for both sides
- Recommend strategic plans
- Explain why certain moves are strongest`
      : responseType === "Puzzle"
        ? `For puzzle creation:
- "fen": MUST be a valid, legal FEN string that chess.js can load
- "solution": MUST be a JSON array of UCI moves (from-square + to-square + optional promo, e.g. ["d5e4","d7e7","d4d5"]). King d5→e4 = "d5e4". Every move must be legal given the FEN and all prior solution moves applied.
- "explanation": Include the puzzle story/narrative, the tactical/strategic theme, AND a step-by-step walkthrough of each solution move — this is the educational content the learner reads
- "difficulty": easy | medium | hard based on solution length and complexity
- "hidden_solution": must be true
- Output ONLY the JSON object — no text outside the JSON, no markdown fences`
        : responseType === "Position"
          ? `For position evaluation:
- Describe piece placement and pawn structure
- Assess material balance
- Identify key weaknesses and strengths
- Suggest strategic goals for both sides`
          : `For game annotation:
- Use move quality symbols: !! (brilliant), ! (excellent), * (best), !? (dubious), ?? (blunder)
- Provide annotations for significant moves
- Include strategic commentary at key moments
- Return complete annotated PGN`;

  return `${BASE_INSTRUCTION}

Response format (JSON):
${jsonSchema}

Instructions for ${responseType} response:
${typeSpecificGuidance}

Language: ${language}
Output only valid JSON, no markdown or extra text.`;
}

/**
 * Legacy prompt for backwards compatibility (verbose version)
 */
export function generateLegacySystemPrompt(): string {
  return `You are a chess analysis assistant. You provide strategic insights about chess positions.

Your role:
- Analyze chess positions using engine evaluation as source of truth
- Explain strategic ideas and tactical themes
- Assess risks and opportunities for both sides
- Recommend strong moves and plans

Rules:
- Focus exclusively on chess analysis
- Avoid generic AI commentary
- Be concise and strategic
- Use chess terminology appropriately`;
}

/**
 * Calculate token savings of optimized vs legacy prompts
 * (Approximate, based on rough token counting)
 */
export function estimateTokenSavings(): { legacy: number; optimized: number; savings: string } {
  const legacyPrompt = generateLegacySystemPrompt();
  const optimizedPrompt = generateSystemPrompt({ responseType: "Analysis" });

  const legacyTokens = Math.ceil(legacyPrompt.length / 4); // Rough estimate: 4 chars per token
  const optimizedTokens = Math.ceil(optimizedPrompt.length / 4);
  const savingsPercent = (((legacyTokens - optimizedTokens) / legacyTokens) * 100).toFixed(1);

  return {
    legacy: legacyTokens,
    optimized: optimizedTokens,
    savings: `${savingsPercent}%`
  };
}
