import type { AnalysisResult } from "../types";

export abstract class IChessEngine {
  path: string;
  process: any = null;

  constructor(path: string) {
    if (new.target === IChessEngine) {
      throw new TypeError("Cannot instantiate abstract class IChessEngine");
    }
    this.path = path;
    this.process = null;
  }

  // Concrete throwing implementations so incomplete subclasses get readable errors at runtime.
  // TypeScript's `abstract` keyword is stripped at compile time (no runtime body), which would
  // produce "not a function" errors instead of the expected "must be implemented" messages.

  async init(): Promise<void> {
    throw new Error("init() must be implemented by subclass");
  }

  async analyze(_fen: string, _depth?: number, _multiPv?: number): Promise<AnalysisResult> {
    throw new Error("analyze() must be implemented by subclass");
  }

  async stop(): Promise<void> {
    throw new Error("stop() must be implemented by subclass");
  }

  async destroy(): Promise<void> {
    throw new Error("destroy() must be implemented by subclass");
  }

  getStatus(): unknown {
    throw new Error("getStatus() must be implemented by subclass");
  }
}
