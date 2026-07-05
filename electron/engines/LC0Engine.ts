/**
 * LC0Engine - Concrete implementation for LC0 (Leela Chess Zero)
 * Inherits common analysis logic from BaseChessEngine
 * Only defines LC0-specific GPU backend and options
 */

import { BaseChessEngine } from "./BaseChessEngine";
import { EngineCapability } from "./IChessEngine";
import { clampMultiPv, explorationOptions } from "./engineTuning";

const LC0_TIMEOUT_MS = 60000;
const LC0_DEFAULT_DEPTH = 30;

export type GPUBackend = "onnx-cpu" | "directml" | "cuda" | "metal";

export class LC0Engine extends BaseChessEngine {
  readonly name = "LC0";
  readonly version: string;
  readonly capabilities: EngineCapability = {
    supportsMultiPV: true,
    supportsWDL: true,
    supportsCP: false,
    supportsMate: false
  };

  private gpuBackend: GPUBackend;

  constructor(enginePath: string, version: string = "0.31", gpuBackend: GPUBackend = "onnx-cpu") {
    super(enginePath);
    this.version = version;
    this.gpuBackend = gpuBackend;
  }

  setGPUBackend(backend: GPUBackend): void {
    if (this.isRunning()) {
      throw new Error("Cannot change GPU backend while engine is running");
    }
    this.gpuBackend = backend;
  }

  protected getDefaultDepth(): number {
    return LC0_DEFAULT_DEPTH;
  }

  protected getDefaultTimeoutMs(): number {
    return LC0_TIMEOUT_MS;
  }

  protected getInitTimeoutMs(): number {
    return 3000; // LC0 takes slightly longer to initialize
  }

  /**
   * Send GPU backend configuration before uci
   */
  protected sendInitCommands(): void {
    this.sendInitCommand(`setoption name Backend value ${this.gpuBackend}`);
    this.sendInitCommand("uci");
  }

  /**
   * LC0 options before analysis.
   * Supports MultiPV (up to MAX_MULTIPV). In deep modes (`explore`), widens the
   * search via PolicyTemperature/CPuct; otherwise resets them to defaults.
   */
  protected sendEngineOptions(multiPv: number, explore: boolean): void {
    this.sendCommand(`setoption name MultiPV value ${clampMultiPv(multiPv)}`);
    for (const cmd of explorationOptions(this.name, explore)) {
      this.sendCommand(cmd);
    }
  }

  /**
   * LC0 analysis command
   */
  protected sendAnalysisCommand(depth: number): void {
    this.sendCommand(`go depth ${depth}`);
  }
}
