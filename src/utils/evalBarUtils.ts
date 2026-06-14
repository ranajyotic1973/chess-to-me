import type { Score } from "../types";

/**
 * Convert a Score to white's advantage as a percentage (0–100).
 * 50 = equal, >50 = white better, <50 = black better.
 * Uses a tanh sigmoid so large-but-finite advantages don't pin the bar at the extreme.
 */
export function scoreToWhitePct(score: Score | null | undefined): number {
  if (!score) return 50;

  if ("winProb" in score) {
    // LC0 returns a win probability for white directly (0–1).
    return Math.max(3, Math.min(97, score.winProb * 100));
  }

  if (score.type === "mate") {
    // Any mate: bar goes to the extreme for whichever side is mating.
    // Positive value = white mates, negative = black mates.
    return score.value > 0 ? 97 : 3;
  }

  if (score.type === "cp") {
    // tanh sigmoid: 0cp → 50%, 400cp → 71%, 800cp → 84%, 2000cp → 97%
    const pct = 50 + 50 * Math.tanh(score.value / 400);
    return Math.max(3, Math.min(97, pct));
  }

  return 50;
}

/**
 * Human-readable label for the centre of the eval bar.
 * Centipawns → pawn units (+1.2 / -2.5), mate → #M3, LC0 win prob → 72%.
 */
export function scoreToLabel(score: Score | null | undefined): string {
  if (!score) return "0.0";

  if ("winProb" in score) {
    return `${Math.round(score.winProb * 100)}%`;
  }

  if (score.type === "mate") {
    const n = Math.abs(score.value);
    return `#M${n}`;
  }

  if (score.type === "cp") {
    const pawns = score.value / 100;
    const sign = pawns > 0 ? "+" : "";
    return `${sign}${pawns.toFixed(1)}`;
  }

  return "0.0";
}
