/**
 * EngineFactory - Creates engine instances based on detected/configured engines
 * Handles engine discovery and dependency injection
 */

import { IChessEngine } from "./IChessEngine";
import { StockfishEngine } from "./StockfishEngine";
import { LC0Engine } from "./LC0Engine";

export interface EngineDetectionResult {
  stockfish?: {
    path: string;
    version: string;
  };
  lc0?: {
    path: string;
    version: string;
    gpuBackend?: "onnx-cpu" | "directml" | "cuda" | "metal";
  };
}

/**
 * Factory for creating chess engine instances
 * Responsible for engine detection and instantiation
 */
export class EngineFactory {
  /**
   * Create an engine instance by name
   */
  static createEngine(engineName: string, detectionResult: EngineDetectionResult): IChessEngine {
    if (engineName.toLowerCase() === "stockfish") {
      if (!detectionResult.stockfish) {
        throw new Error("Stockfish not detected. Run detection first.");
      }
      return new StockfishEngine(
        detectionResult.stockfish.path,
        detectionResult.stockfish.version
      );
    }

    if (engineName.toLowerCase() === "lc0") {
      if (!detectionResult.lc0) {
        throw new Error("LC0 not detected. Run detection first.");
      }
      return new LC0Engine(
        detectionResult.lc0.path,
        detectionResult.lc0.version,
        detectionResult.lc0.gpuBackend
      );
    }

    throw new Error(`Unknown engine: ${engineName}`);
  }

  /**
   * Create the default/preferred engine
   */
  static createDefaultEngine(detectionResult: EngineDetectionResult): IChessEngine {
    // Prefer Stockfish if available (typically faster, more stable)
    if (detectionResult.stockfish) {
      return this.createEngine("stockfish", detectionResult);
    }

    if (detectionResult.lc0) {
      return this.createEngine("lc0", detectionResult);
    }

    throw new Error("No engines detected. Please install Stockfish or LC0.");
  }

  /**
   * Get available engine names from detection result
   */
  static getAvailableEngines(detectionResult: EngineDetectionResult): string[] {
    const available: string[] = [];
    if (detectionResult.stockfish) available.push("stockfish");
    if (detectionResult.lc0) available.push("lc0");
    return available;
  }

  /**
   * Validate detection result has at least one engine
   */
  static isValid(detectionResult: EngineDetectionResult): boolean {
    return !!(detectionResult.stockfish || detectionResult.lc0);
  }
}
