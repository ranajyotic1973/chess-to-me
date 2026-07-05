import { clampMultiPv, explorationOptions, MAX_MULTIPV } from "./engineTuning";

describe("clampMultiPv", () => {
  it("allows at least 10 lines (the old cap of 4 is raised)", () => {
    expect(clampMultiPv(10)).toBe(10);
    expect(clampMultiPv(20)).toBe(20);
  });

  it("clamps to MAX_MULTIPV at the top", () => {
    expect(clampMultiPv(500)).toBe(MAX_MULTIPV);
    expect(clampMultiPv(MAX_MULTIPV + 1)).toBe(MAX_MULTIPV);
  });

  it("floors at 1 for zero, negative, or NaN input", () => {
    expect(clampMultiPv(0)).toBe(1);
    expect(clampMultiPv(-5)).toBe(1);
    expect(clampMultiPv(NaN)).toBe(1);
  });

  it("floors fractional requests", () => {
    expect(clampMultiPv(10.9)).toBe(10);
  });
});

describe("explorationOptions", () => {
  it("emits no exploration options for Stockfish (MultiPV-only variety)", () => {
    expect(explorationOptions("Stockfish", true)).toEqual([]);
    expect(explorationOptions("Stockfish", false)).toEqual([]);
  });

  it("widens Lc0 search when exploring", () => {
    const opts = explorationOptions("LC0", true);
    expect(opts).toEqual([
      "setoption name PolicyTemperature value 3.5",
      "setoption name CPuct value 4.5",
    ]);
  });

  it("resets Lc0 to defaults when not exploring", () => {
    const opts = explorationOptions("LC0", false);
    expect(opts).toEqual([
      "setoption name PolicyTemperature value 2.2",
      "setoption name CPuct value 3",
    ]);
  });

  it("matches the Lc0 name case-insensitively", () => {
    expect(explorationOptions("lc0", true).length).toBe(2);
    expect(explorationOptions("Leela (lc0)", true).length).toBe(2);
  });
});
