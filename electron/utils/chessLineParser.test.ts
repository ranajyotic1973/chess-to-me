import { ChessLineParser } from "./chessLineParser";

describe("ChessLineParser", () => {
  let parser: ChessLineParser;
  const mockLog = jest.fn();

  beforeEach(() => {
    mockLog.mockClear();
  });

  describe("CP Score Parsing (Stockfish)", () => {
    it("parses positive CP score (white advantage)", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 15 seldepth 18 multipv 1 score cp 45 nodes 1234567 nps 1000000 pv e2e4 c7c5";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "cp", value: 45, depth: 15 });
      expect(result.pv).toBe("e2e4 c7c5");
    });

    it("parses negative CP score (black advantage)", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 10 score cp -73 pv d7d5";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "cp", value: -73, depth: 10 });
    });

    it("negates CP score when black to move", () => {
      parser = new ChessLineParser("stockfish", true, mockLog); // blackToMove = true
      const line = "info depth 15 score cp 100 pv e7e6";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "cp", value: -100, depth: 15 });
    });
  });

  describe("Mate Score Parsing (Stockfish)", () => {
    it("parses positive mate (white mates in N)", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 20 score mate 5 pv h7g6 h8h7";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "mate", value: 5, depth: 20 });
    });

    it("parses negative mate (black mates in N)", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 20 score mate -3 pv h8h7";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "mate", value: -3, depth: 20 });
    });

    it("negates mate score when black to move", () => {
      parser = new ChessLineParser("stockfish", true, mockLog);
      const line = "info depth 20 score mate 7 pv e7e6";
      const result = parser.parseInfoLine(line);

      expect(result.score).toEqual({ type: "mate", value: -7, depth: 20 });
    });
  });

  describe("WDL Score Parsing (LC0)", () => {
    it("parses WDL from white perspective", () => {
      parser = new ChessLineParser("lc0", false, mockLog);
      const line = "info depth 45 nodes 8000000 score wdl 7000 2000 1000 pv e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.score?.type).toBe("wdl");
      expect(result.score?.winProb).toBeCloseTo(0.7); // 7000/(7000+2000+1000) = 0.7
    });

    it("negates WDL when black to move", () => {
      parser = new ChessLineParser("lc0", true, mockLog);
      const line = "info depth 45 score wdl 1000 2000 7000 pv e7e5";
      const result = parser.parseInfoLine(line);

      expect(result.score?.type).toBe("wdl");
      expect(result.score?.winProb).toBeCloseTo(0.7); // losses (7000) become wins
    });

    it("handles WDL with equal distribution", () => {
      parser = new ChessLineParser("lc0", false, mockLog);
      const line = "info score wdl 3333 3333 3334";
      const result = parser.parseInfoLine(line);

      expect(result.score?.winProb).toBeCloseTo(0.333, 2);
    });
  });

  describe("PV Extraction", () => {
    it("extracts principal variation", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 15 score cp 45 pv e2e4 c7c5 Nf3 d6 d4 cxd4";
      const result = parser.parseInfoLine(line);

      expect(result.pv).toBe("e2e4 c7c5 Nf3 d6 d4 cxd4");
    });

    it("returns empty PV if not present", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 10 score cp 50";
      const result = parser.parseInfoLine(line);

      expect(result.pv).toBe("");
    });
  });

  describe("MultiPV Ranking", () => {
    it("defaults rank to 1 when multipv not specified", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 15 score cp 45 pv e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.rank).toBe(1);
    });

    it("extracts multipv rank", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info multipv 3 depth 15 score cp 23 pv c7c5";
      const result = parser.parseInfoLine(line);

      expect(result.rank).toBe(3);
    });
  });

  describe("Depth Extraction", () => {
    it("extracts depth correctly", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info depth 25 seldepth 30 score cp 45 pv e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.depth).toBe(25);
    });

    it("returns undefined if depth not present", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info score cp 50 pv e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.depth).toBeUndefined();
    });
  });

  describe("Static Utility Methods", () => {
    it("detects info lines", () => {
      expect(ChessLineParser.isInfoLine("info depth 15 score cp 45")).toBe(true);
      expect(ChessLineParser.isInfoLine("info")).toBe(true);
      expect(ChessLineParser.isInfoLine("bestmove e2e4")).toBe(false);
      expect(ChessLineParser.isInfoLine("other output")).toBe(false);
    });

    it("detects bestmove lines", () => {
      expect(ChessLineParser.isBestmoveLine("bestmove e2e4 ponder d7d5")).toBe(true);
      expect(ChessLineParser.isBestmoveLine("bestmove e2e4")).toBe(true);
      expect(ChessLineParser.isBestmoveLine("info depth 15")).toBe(false);
    });

    it("extracts best move", () => {
      expect(ChessLineParser.extractBestMove("bestmove e2e4 ponder d7d5")).toBe("e2e4");
      expect(ChessLineParser.extractBestMove("bestmove a1a2")).toBe("a1a2");
      expect(ChessLineParser.extractBestMove("bestmove")).toBe("");
    });

    it("extracts ponder move", () => {
      expect(ChessLineParser.extractPonderMove("bestmove a7a6 ponder b5a4")).toBe("b5a4");
      expect(ChessLineParser.extractPonderMove("bestmove e2e4 ponder d7d5")).toBe("d7d5");
    });

    it("returns empty ponder move when none present", () => {
      expect(ChessLineParser.extractPonderMove("bestmove a1a2")).toBe("");
      expect(ChessLineParser.extractPonderMove("bestmove a7a6 ponder (none)")).toBe("");
      expect(ChessLineParser.extractPonderMove("bestmove")).toBe("");
    });
  });

  describe("Edge Cases", () => {
    it("handles lines with extra whitespace", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info  depth  15   score  cp  45   pv  e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.depth).toBe(15);
      expect(result.score?.value).toBe(45);
    });

    it("handles zero CP score", () => {
      parser = new ChessLineParser("stockfish", false, mockLog);
      const line = "info score cp 0 pv e2e4";
      const result = parser.parseInfoLine(line);

      expect(result.score?.value).toBe(0);
    });

    it("handles WDL with zero total", () => {
      parser = new ChessLineParser("lc0", false, mockLog);
      const line = "info score wdl 0 0 0";
      const result = parser.parseInfoLine(line);

      expect(result.score?.winProb).toBe(0);
    });
  });
});
