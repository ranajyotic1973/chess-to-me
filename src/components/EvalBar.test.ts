import { scoreToWhitePct, scoreToLabel } from "../utils/evalBarUtils";

describe("scoreToWhitePct", () => {
  test("null score → 50%", () => {
    expect(scoreToWhitePct(null)).toBe(50);
    expect(scoreToWhitePct(undefined)).toBe(50);
  });

  test("0 centipawns → 50%", () => {
    expect(scoreToWhitePct({ type: "cp", value: 0 })).toBe(50);
  });

  test("positive cp → white advantage (>50%)", () => {
    const pct = scoreToWhitePct({ type: "cp", value: 400 });
    expect(pct).toBeGreaterThan(50);
    expect(pct).toBeLessThan(97);
  });

  test("negative cp → black advantage (<50%)", () => {
    const pct = scoreToWhitePct({ type: "cp", value: -400 });
    expect(pct).toBeLessThan(50);
    expect(pct).toBeGreaterThan(3);
  });

  test("large cp is clamped to 97% max", () => {
    expect(scoreToWhitePct({ type: "cp", value: 10000 })).toBeLessThanOrEqual(97);
  });

  test("large negative cp is clamped to 3% min", () => {
    expect(scoreToWhitePct({ type: "cp", value: -10000 })).toBeGreaterThanOrEqual(3);
  });

  test("white mate → 97%", () => {
    expect(scoreToWhitePct({ type: "mate", value: 3 })).toBe(97);
  });

  test("black mate → 3%", () => {
    expect(scoreToWhitePct({ type: "mate", value: -3 })).toBe(3);
  });

  test("win probability 0.5 → 50%", () => {
    expect(scoreToWhitePct({ winProb: 0.5 })).toBe(50);
  });

  test("high win probability → close to 97%", () => {
    const pct = scoreToWhitePct({ winProb: 0.99 });
    expect(pct).toBeCloseTo(97, 0);
  });

  test("low win probability → close to 3%", () => {
    const pct = scoreToWhitePct({ winProb: 0.01 });
    expect(pct).toBeCloseTo(3, 0);
  });

  test("symmetry: +N cp and -N cp are mirror images around 50%", () => {
    const pos = scoreToWhitePct({ type: "cp", value: 200 });
    const neg = scoreToWhitePct({ type: "cp", value: -200 });
    expect(pos + neg).toBeCloseTo(100, 5);
  });
});

describe("scoreToLabel", () => {
  test("null → '0.0'", () => {
    expect(scoreToLabel(null)).toBe("0.0");
    expect(scoreToLabel(undefined)).toBe("0.0");
  });

  test("positive cp → '+N.N' format", () => {
    expect(scoreToLabel({ type: "cp", value: 150 })).toBe("+1.5");
  });

  test("negative cp → '-N.N' format", () => {
    expect(scoreToLabel({ type: "cp", value: -250 })).toBe("-2.5");
  });

  test("zero cp → '0.0'", () => {
    expect(scoreToLabel({ type: "cp", value: 0 })).toBe("0.0");
  });

  test("mate in 3 → '#M3'", () => {
    expect(scoreToLabel({ type: "mate", value: 3 })).toBe("#M3");
  });

  test("black mate in 7 → '#M7'", () => {
    expect(scoreToLabel({ type: "mate", value: -7 })).toBe("#M7");
  });

  test("mate beyond 12 still shown", () => {
    expect(scoreToLabel({ type: "mate", value: 20 })).toBe("#M20");
  });

  test("win probability → percentage string", () => {
    expect(scoreToLabel({ winProb: 0.72 })).toBe("72%");
  });
});
