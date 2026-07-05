/**
 * Pure mode-routing helpers, free of IO so they can be unit-tested.
 *
 * The LLM classifier resolves an intent category; `resolveMode` then applies
 * app-level gating rules that the classifier cannot know on its own — chiefly
 * that Middlegame mode is only reachable once enough moves have been played.
 */

/** Minimum plies (10 full moves by both sides) before Middlegame mode is allowed. */
export const MIDDLEGAME_MIN_PLIES = 20;

export type ClassifierCategory =
  | "ANALYSIS"
  | "PUZZLE"
  | "POSITION"
  | "PLAYER_GAMES"
  | "HISTORIC_GAME"
  | "LOCAL_GAMES"
  | "OTHER"
  | "OPENING_TRAINING"
  | "MIDDLEGAME_ANALYSIS"
  | "ENDGAME_TRAINING";

/**
 * Apply gating rules to a raw classifier category.
 *
 * @param classified the LLM classifier's category
 * @param plies      number of half-moves played so far in the current game
 * @returns the effective category to route on
 */
export function resolveMode(classified: string, plies: number): ClassifierCategory {
  const category = String(classified || "").toUpperCase() as ClassifierCategory;

  // Middlegame mode is gated: before 20 plies a strategic/tactical question is
  // still answered, but as ordinary Analysis rather than the middlegame agent.
  if (category === "MIDDLEGAME_ANALYSIS" && (Number(plies) || 0) < MIDDLEGAME_MIN_PLIES) {
    return "ANALYSIS";
  }

  return category;
}
