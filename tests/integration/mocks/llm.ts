/**
 * Mock LLM responses for different queries
 */

export function getMockLLMResponse(question: string): string {
  // Check what type of analysis is being requested
  if (question.includes('explain') || question.includes('Analyze')) {
    return getMockLineExplanation();
  }

  if (question.includes('deep') || question.includes('Strategy')) {
    return getMockDeepAnalysis();
  }

  return getMockGenericResponse();
}

/**
 * Mock explanation for a chess line
 */
function getMockLineExplanation(): string {
  return `
This is an excellent move that develops a piece while maintaining central control.

**Opening Name:** Italian Game

The move supports your central pawns and improves your piece coordination. This classical opening has been played by top players for centuries.

**Key Ideas:**
- Control the center
- Develop pieces efficiently
- Create threats against the weak f7 square
- Prepare for castling

**Expected continuation:** The opponent will likely develop their pieces and castle kingside.
  `.trim();
}

/**
 * Mock deep analysis for a line
 */
function getMockDeepAnalysis(): string {
  return JSON.stringify({
    strategy: 'Control the center while developing pieces efficiently',
    pros_cons: 'Pro: Strong central presence. Con: Slightly slow development',
    counter_attack: 'Black can challenge with ...d5 or ...Nf6',
    sacrifice: 'No immediate tactical sacrifices available',
    novelty: 'This is a classical move, not a novelty',
    endgame_chances: 'Good winning chances in all pawn structures',
    alternatives: 'd4 is equally strong, c4 is more flexible',
  });
}

/**
 * Generic response for unknown queries
 */
function getMockGenericResponse(): string {
  return `
This position shows a balanced game with mutual piece activity.

White has developed the kingside knight and can continue with center control moves. Black should focus on piece development and central counterplay.

The position calls for thoughtful, positional play with emphasis on piece coordination.
  `.trim();
}

/**
 * Mock response for puzzle explanations
 */
export function getMockPuzzleExplanation(): string {
  return `
You found the winning move! This tactical blow exploits the weak position of the Black king.

**Why this works:**
- The knight fork attacks two pieces
- The king must move to safety
- You win material decisively

Continue with your advantage!
  `.trim();
}
