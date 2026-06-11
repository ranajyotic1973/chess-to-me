import { parseChessNotation, uciSequenceToSan, looksLikeMoveAttempt } from "./chessNotationParser";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Position after 1. e4 e5 2. Nf3 (black to move)
const AFTER_NF3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

describe("parseChessNotation", () => {
  describe("UCI input", () => {
    it("parses a single UCI move", () => {
      expect(parseChessNotation("e2e4", START)).toEqual(["e2e4"]);
    });

    it("parses multiple UCI moves", () => {
      expect(parseChessNotation("e2e4 e7e5 g1f3", START)).toEqual(["e2e4", "e7e5", "g1f3"]);
    });

    it("handles uppercase UCI", () => {
      expect(parseChessNotation("E2E4", START)).toEqual(["e2e4"]);
    });
  });

  describe("SAN input", () => {
    it("parses a single SAN move", () => {
      expect(parseChessNotation("e4", START)).toEqual(["e2e4"]);
    });

    it("parses multiple SAN moves", () => {
      expect(parseChessNotation("e4 e5 Nf3", START)).toEqual(["e2e4", "e7e5", "g1f3"]);
    });

    it("parses capture in SAN", () => {
      // After e4 e5, d4 dxe4 sequence
      const fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2";
      expect(parseChessNotation("exd5", fen)).toEqual(["e4d5"]);
    });
  });

  describe("game notation with move numbers", () => {
    it("parses '1. e4 e5' format", () => {
      expect(parseChessNotation("1. e4 e5", START)).toEqual(["e2e4", "e7e5"]);
    });

    it("parses '1. e4 e5 2. Nf3 Nc6' format", () => {
      expect(parseChessNotation("1. e4 e5 2. Nf3 Nc6", START)).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
    });

    it("parses black-first '1...e5' format", () => {
      // White has already played e4, it is black's turn
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      expect(parseChessNotation("1...e5", fen)).toEqual(["e7e5"]);
    });

    it("parses '1...e5 2. Nf3 Nc6' format from black-to-move position", () => {
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      expect(parseChessNotation("1...e5 2. Nf3 Nc6", fen)).toEqual(["e7e5", "g1f3", "b8c6"]);
    });
  });

  describe("with commas", () => {
    it("handles commas between moves", () => {
      expect(parseChessNotation("1. e4, e5 2. Nf3, Nc6", START)).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
    });
  });

  describe("with annotations", () => {
    it("strips ! and ? annotation symbols", () => {
      // "e4!" and "e5?" both have annotations that should be stripped
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      expect(parseChessNotation("e5!", fen)).toEqual(["e7e5"]);
    });

    it("strips # (mate) symbol", () => {
      // Scholar's mate position — Qxf7# is legal here
      const fen = "rnb1kbnr/pppp1ppp/4p3/8/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1";
      expect(parseChessNotation("Qxf7#", fen)).toEqual(["f3f7"]);
    });
  });

  describe("error cases", () => {
    it("returns [] for illegal move", () => {
      expect(parseChessNotation("e2e5", START)).toEqual([]);
    });

    it("returns [] for non-move text", () => {
      expect(parseChessNotation("what is the best move?", START)).toEqual([]);
    });

    it("returns [] for empty input", () => {
      expect(parseChessNotation("", START)).toEqual([]);
    });

    it("returns [] for invalid FEN", () => {
      expect(parseChessNotation("e4", "not a fen")).toEqual([]);
    });

    it("returns [] if second move is illegal given first", () => {
      expect(parseChessNotation("e4 e4", START)).toEqual([]);
    });
  });
});

describe("uciSequenceToSan", () => {
  it("converts UCI sequence to SAN", () => {
    expect(uciSequenceToSan(START, ["e2e4", "e7e5", "g1f3"])).toEqual(["e4", "e5", "Nf3"]);
  });

  it("returns [] for illegal move in sequence", () => {
    expect(uciSequenceToSan(START, ["e2e5"])).toEqual([]);
  });

  it("returns [] for empty sequence", () => {
    expect(uciSequenceToSan(START, [])).toEqual([]);
  });
});

describe("looksLikeMoveAttempt", () => {
  it("true for UCI moves", () => {
    expect(looksLikeMoveAttempt("e2e4 e7e5")).toBe(true);
  });

  it("true for SAN moves", () => {
    expect(looksLikeMoveAttempt("e4 e5 Nf3")).toBe(true);
  });

  it("true for game notation", () => {
    expect(looksLikeMoveAttempt("1. e4 e5 2. Nf3")).toBe(true);
  });

  it("false for question", () => {
    expect(looksLikeMoveAttempt("what is the best move?")).toBe(false);
  });

  it("false for sentence with question word", () => {
    expect(looksLikeMoveAttempt("why is e4 good here")).toBe(false);
  });

  it("false for empty string", () => {
    expect(looksLikeMoveAttempt("")).toBe(false);
  });
});
