import {
  createMoveSequenceHash,
  createLineHashMap,
  findMatchingLine,
  convertUCIToMoves,
} from "./moveSequenceHash";
import type { AnalysisLine } from "../types";

describe("moveSequenceHash", () => {
  describe("createMoveSequenceHash", () => {
    it("should create consistent hashes for same move sequence", () => {
      const moves1 = ["e2e4", "c7c5"];
      const moves2 = ["e2e4", "c7c5"];
      expect(createMoveSequenceHash(moves1)).toBe(createMoveSequenceHash(moves2));
    });

    it("should create different hashes for different move sequences", () => {
      const moves1 = ["e2e4", "c7c5"];
      const moves2 = ["e2e4", "e7e5"];
      expect(createMoveSequenceHash(moves1)).not.toBe(createMoveSequenceHash(moves2));
    });

    it("should handle empty move sequences", () => {
      expect(createMoveSequenceHash([])).toBe(createMoveSequenceHash([]));
    });
  });

  describe("createLineHashMap", () => {
    it("should create hash map for engine lines", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4 c7c5 g1f3 d7d6",
          nodes: 1000000,
        },
        {
          depth: 20,
          seldepth: 24,
          multipv: 2,
          score: { type: "cp", value: 25 },
          pv: "d2d4 d7d5 c2c4",
          nodes: 900000,
        },
      ];

      const hashMap = createLineHashMap(lines);
      expect(hashMap.size).toBeGreaterThan(0);
    });

    it("should map move sequences to line indices", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4 c7c5",
          nodes: 1000000,
        },
      ];

      const hashMap = createLineHashMap(lines);

      // Should find line for single move
      const singleMoveHash = createMoveSequenceHash(["e2e4"]);
      expect(hashMap.get(singleMoveHash)).toBe(0);

      // Should find line for two moves
      const twoMovesHash = createMoveSequenceHash(["e2e4", "c7c5"]);
      expect(hashMap.get(twoMovesHash)).toBe(0);
    });

    it("should prioritize first line when multiple match", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4 c7c5",
          nodes: 1000000,
        },
        {
          depth: 20,
          seldepth: 24,
          multipv: 2,
          score: { type: "cp", value: 25 },
          pv: "e2e4 e7e5",
          nodes: 900000,
        },
      ];

      const hashMap = createLineHashMap(lines);
      const hash = createMoveSequenceHash(["e2e4"]);

      // Both lines start with e2e4, but first one should be stored
      expect(hashMap.get(hash)).toBe(0);
    });
  });

  describe("findMatchingLine", () => {
    it("should find line matching move sequence", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4 c7c5 g1f3",
          nodes: 1000000,
        },
      ];

      const hashMap = createLineHashMap(lines);
      expect(findMatchingLine(["e2e4", "c7c5"], hashMap)).toBe(0);
    });

    it("should return null for no matching line", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4 c7c5",
          nodes: 1000000,
        },
      ];

      const hashMap = createLineHashMap(lines);
      expect(findMatchingLine(["d2d4", "d7d5"], hashMap)).toBeNull();
    });

    it("should handle empty move list", () => {
      const lines: AnalysisLine[] = [
        {
          depth: 20,
          seldepth: 25,
          multipv: 1,
          score: { type: "cp", value: 30 },
          pv: "e2e4",
          nodes: 1000000,
        },
      ];

      const hashMap = createLineHashMap(lines);
      expect(findMatchingLine([], hashMap)).toBeNull();
    });
  });

  describe("convertUCIToMoves", () => {
    it("should parse UCI move string", () => {
      const uci = "e2e4 c7c5 g1f3";
      expect(convertUCIToMoves(uci)).toEqual(["e2e4", "c7c5", "g1f3"]);
    });

    it("should handle extra whitespace", () => {
      const uci = "  e2e4   c7c5  ";
      expect(convertUCIToMoves(uci)).toEqual(["e2e4", "c7c5"]);
    });

    it("should handle empty string", () => {
      expect(convertUCIToMoves("")).toEqual([]);
    });
  });
});
