const QUESTION_WORDS = /\b(what|how|why|can|should|is|are|was|were|will|would|could|did|do|does|explain|show|tell|help|please|analyze|analysis)\b/i;
const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

export function looksLikeMoveSequence(text: string): boolean {
  if (!text || QUESTION_WORDS.test(text) || text.includes("?")) return false;
  const tokens = text.trim().split(/\s+/);
  return tokens.length > 0 && tokens.every((t) => UCI_MOVE_RE.test(t));
}

export function normalizeSolutionMove(move: string): string {
  return move.toLowerCase().substring(0, 4);
}

export function comparePuzzleAttempt(attempt: string[], solution: string[]): boolean {
  if (attempt.length !== solution.length) return false;
  return attempt.every((m, i) => normalizeSolutionMove(m) === normalizeSolutionMove(solution[i]));
}

export function makeExplanationCacheKey(baseFen: string, lineIndex: number, moveIndex: number): string {
  return `${baseFen}:${lineIndex}:${moveIndex}`;
}

export function isSingleLineNumber(text: string, maxLines: number): number | null {
  const trimmed = text.trim();
  if (!/^[1-9]$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  return n >= 1 && n <= maxLines ? n : null;
}

export function shouldSkipKeyboardNavigation(activeElement: Element | null): boolean {
  if (!activeElement) return false;
  const tag = activeElement.tagName;
  return tag === "TEXTAREA" || tag === "INPUT";
}
