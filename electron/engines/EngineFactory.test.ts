import { EngineFactory } from "./EngineFactory";
import { EngineDetectionResult } from "./EngineFactory";
import { StockfishEngine } from "./StockfishEngine";
import { LC0Engine } from "./LC0Engine";

describe("EngineFactory", () => {
  const mockDetection: EngineDetectionResult = {
    stockfish: {
      path: "/usr/bin/stockfish",
      version: "15.1"
    },
    lc0: {
      path: "/usr/bin/lc0",
      version: "0.31",
      gpuBackend: "cuda"
    }
  };

  describe("createEngine", () => {
    it("creates Stockfish engine instance", () => {
      const engine = EngineFactory.createEngine("stockfish", mockDetection);
      expect(engine).toBeInstanceOf(StockfishEngine);
      expect(engine.name).toBe("Stockfish");
    });

    it("creates LC0 engine instance", () => {
      const engine = EngineFactory.createEngine("lc0", mockDetection);
      expect(engine).toBeInstanceOf(LC0Engine);
      expect(engine.name).toBe("LC0");
    });

    it("creates engine with case-insensitive name", () => {
      const engine1 = EngineFactory.createEngine("STOCKFISH", mockDetection);
      const engine2 = EngineFactory.createEngine("StockFish", mockDetection);
      expect(engine1).toBeInstanceOf(StockfishEngine);
      expect(engine2).toBeInstanceOf(StockfishEngine);
    });

    it("throws error for unknown engine", () => {
      expect(() => EngineFactory.createEngine("unknown", mockDetection)).toThrow("Unknown engine");
    });

    it("throws error if engine not detected", () => {
      const incompleteDetection: EngineDetectionResult = {};
      expect(() => EngineFactory.createEngine("stockfish", incompleteDetection)).toThrow(
        "Stockfish not detected"
      );
    });
  });

  describe("createDefaultEngine", () => {
    it("prefers Stockfish when both available", () => {
      const engine = EngineFactory.createDefaultEngine(mockDetection);
      expect(engine).toBeInstanceOf(StockfishEngine);
    });

    it("falls back to LC0 if Stockfish not available", () => {
      const lc0Only: EngineDetectionResult = { lc0: mockDetection.lc0! };
      const engine = EngineFactory.createDefaultEngine(lc0Only);
      expect(engine).toBeInstanceOf(LC0Engine);
    });

    it("throws error if no engines detected", () => {
      const noEngines: EngineDetectionResult = {};
      expect(() => EngineFactory.createDefaultEngine(noEngines)).toThrow(
        "No engines detected"
      );
    });
  });

  describe("getAvailableEngines", () => {
    it("lists all available engines", () => {
      const available = EngineFactory.getAvailableEngines(mockDetection);
      expect(available).toEqual(["stockfish", "lc0"]);
    });

    it("lists only Stockfish when LC0 not available", () => {
      const stockfishOnly: EngineDetectionResult = { stockfish: mockDetection.stockfish! };
      const available = EngineFactory.getAvailableEngines(stockfishOnly);
      expect(available).toEqual(["stockfish"]);
    });

    it("returns empty list if no engines available", () => {
      const noEngines: EngineDetectionResult = {};
      const available = EngineFactory.getAvailableEngines(noEngines);
      expect(available).toEqual([]);
    });
  });

  describe("isValid", () => {
    it("returns true when at least one engine available", () => {
      expect(EngineFactory.isValid(mockDetection)).toBe(true);
    });

    it("returns false when no engines available", () => {
      expect(EngineFactory.isValid({})).toBe(false);
    });
  });

  describe("LC0 GPU backend handling", () => {
    it("creates LC0 with CUDA backend", () => {
      const detection: EngineDetectionResult = {
        lc0: {
          path: "/usr/bin/lc0",
          version: "0.31",
          gpuBackend: "cuda"
        }
      };
      const engine = EngineFactory.createEngine("lc0", detection) as LC0Engine;
      expect(engine.name).toBe("LC0");
    });

    it("defaults to CPU if no backend specified", () => {
      const detection: EngineDetectionResult = {
        lc0: {
          path: "/usr/bin/lc0",
          version: "0.31"
        }
      };
      const engine = EngineFactory.createEngine("lc0", detection);
      expect(engine.name).toBe("LC0");
    });
  });
});
