/**
 * Pure helpers for per-mode engine tuning, kept free of any process/IO so they
 * can be unit-tested directly. Engines call these to build the `setoption`
 * commands they send before a search.
 *
 * MultiPV: the previous hard cap of 4 is raised so deep modes can surface 10+
 * lines. Both Stockfish and Lc0 document MultiPV up to 500; we bound it at a
 * resource-safe ceiling.
 *
 * Exploration: only Lc0 has safe "widen the search" knobs (PolicyTemperature,
 * CPuct) — raising them promotes creative-but-sound candidate moves. Stockfish
 * has no such knob for full-strength play (its variety comes from MultiPV), so
 * it emits no exploration options. When exploration is off we emit Lc0's
 * defaults so a prior deep-mode search is reset for ordinary analysis.
 */

/** Upper bound on MultiPV lines we will ever request from an engine. */
export const MAX_MULTIPV = 32;

/** Lc0 defaults, per https://lczero.org/dev/wiki/lc0-options/ */
const LC0_DEFAULT_POLICY_TEMP = 2.2;
const LC0_DEFAULT_CPUCT = 3.0;
/** Exploration values (above defaults) that widen Lc0's search toward novelties. */
const LC0_EXPLORE_POLICY_TEMP = 3.5;
const LC0_EXPLORE_CPUCT = 4.5;

/** Clamp a requested MultiPV to the supported [1, MAX_MULTIPV] range. */
export function clampMultiPv(requested: number): number {
  const n = Math.floor(Number(requested) || 1);
  if (n < 1) return 1;
  if (n > MAX_MULTIPV) return MAX_MULTIPV;
  return n;
}

/** True when the engine name refers to Lc0 (case-insensitive). */
function isLc0(engineName: string): boolean {
  return /lc0/i.test(engineName);
}

/**
 * `setoption` commands that configure (or reset) exploration for an engine.
 *
 * @param engineName engine's `name` (e.g. "Stockfish", "LC0")
 * @param explore    true in Deep Analysis / Opening / Endgame modes
 */
export function explorationOptions(engineName: string, explore: boolean): string[] {
  if (!isLc0(engineName)) {
    // Stockfish: variety comes from MultiPV; no safe creativity option.
    return [];
  }
  if (explore) {
    return [
      `setoption name PolicyTemperature value ${LC0_EXPLORE_POLICY_TEMP}`,
      `setoption name CPuct value ${LC0_EXPLORE_CPUCT}`,
    ];
  }
  // Reset to Lc0 defaults so ordinary analysis is objective again.
  return [
    `setoption name PolicyTemperature value ${LC0_DEFAULT_POLICY_TEMP}`,
    `setoption name CPuct value ${LC0_DEFAULT_CPUCT}`,
  ];
}
