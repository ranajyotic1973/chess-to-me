/**
 * ProcessManager - REFACTORED VERSION (showing the changes needed in main.ts)
 * This is what ProcessManager should look like after integration
 *
 * KEY CHANGES:
 * 1. Uses IChessEngine interface instead of EngineRunner class
 * 2. Engines instantiated via EngineFactory
 * 3. analyze() calls through interface (engine-agnostic)
 * 4. OLD EngineRunner class deleted entirely
 */

import { IChessEngine } from "./engines/IChessEngine";
import { EngineFactory, EngineDetectionResult } from "./engines/EngineFactory";

const DEFAULT_OLLAMA_MODEL = "qwen3:8b";
const PROCESS_LOG_LIMIT = 1000;

interface LogEntry {
  id?: string;
  timestamp?: string;
  text: string;
  stream: "stdout" | "stderr";
  context?: string;
  engine?: string;
  model?: string;
  source?: string;
  note?: string;
}

class ProcessManager {
  settings: any;
  private engines: Map<string, IChessEngine> = new Map();        // ✅ NEW: Map of interfaces
  private currentEngine: IChessEngine | null = null;             // ✅ NEW: Interface-typed
  private detectionResult: EngineDetectionResult;               // ✅ NEW: Store detection

  logs: { stockfish: LogEntry[]; ollama: LogEntry[] };
  ollamaServeProcess: any = null;
  ollamaRunProcess: any = null;
  activeModel: string;
  lastModelError: string = "";
  serveRestartTimer: NodeJS.Timeout | null = null;
  serveShuttingDown: boolean = false;

  /**
   * Constructor - UPDATED to use engine factory
   */
  constructor({
    settings,
    detectionResult
  }: {
    settings: any;
    detectionResult: EngineDetectionResult;
  }) {
    this.settings = settings;
    this.detectionResult = detectionResult;
    this.logs = {
      stockfish: [],
      ollama: []
    };
    this.activeModel = DEFAULT_OLLAMA_MODEL;

    // ✅ NEW: Use factory to instantiate engines
    const available = EngineFactory.getAvailableEngines(detectionResult);
    for (const engineName of available) {
      const engine = EngineFactory.createEngine(engineName, detectionResult);
      engine.onLog((entry) => this.recordEngineLog(engineName, entry));
      this.engines.set(engineName, engine);
    }

    // ✅ NEW: Select default engine (prefer Stockfish)
    if (available.length > 0) {
      this.currentEngine = this.engines.get(available[0])!;
      console.log(`[ProcessManager] Selected engine: ${this.currentEngine.name}`);
    }
  }

  // Call this after app is ready to initialize activeModel from settings
  initializeFromSettings(): void {
    this.activeModel = this.normalizeModel(
      this.settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL
    );

    // ✅ NEW: Switch engine if settings changed
    const selectedEngine = this.settings.get("selectedEngine");
    if (selectedEngine && this.engines.has(selectedEngine)) {
      this.selectEngine(selectedEngine);
    }
  }

  /**
   * Select which engine to use
   */
  selectEngine(engineName: string): void {
    const engine = this.engines.get(engineName);
    if (!engine) {
      const available = [...this.engines.keys()].join(", ");
      throw new Error(`Engine '${engineName}' not found. Available: ${available}`);
    }
    this.currentEngine = engine;
    console.log(`[ProcessManager] Switched to engine: ${this.currentEngine.name}`);
  }

  /**
   * Get current engine (for backward compatibility with old code)
   */
  get engineRunner(): IChessEngine {
    if (!this.currentEngine) {
      throw new Error("No engine selected");
    }
    return this.currentEngine;
  }

  /**
   * Get list of available engines
   */
  getAvailableEngines(): string[] {
    return EngineFactory.getAvailableEngines(this.detectionResult);
  }

  normalizeModel(value: string): string {
    const normalized = String(value || "").trim();
    return normalized || DEFAULT_OLLAMA_MODEL;
  }

  appendLog(bucket: "stockfish" | "ollama", entry: LogEntry): void {
    if (!entry || !this.logs[bucket]) {
      return;
    }
    const normalized: LogEntry = {
      id: `${bucket}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      stream: "stdout",
      ...entry
    };
    this.logs[bucket].push(normalized);
    while (this.logs[bucket].length > PROCESS_LOG_LIMIT) {
      this.logs[bucket].shift();
    }
  }

  recordEngineLog(engineName: string, entry: LogEntry): void {
    if (!entry) {
      return;
    }
    const text = String(entry.text || "");
    if (!text.trim()) {
      return;
    }
    this.appendLog("stockfish", {
      text: `[${engineName.toUpperCase()}] ${text}`,
      stream: entry.stream || "stdout",
      context: entry.context || "analysis",
      engine: engineName,
      id: `${engineName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString()
    });
  }

  recordOllamaLog(params: {
    text: string;
    stream?: string;
    source?: string;
    model?: string;
    note?: string;
  }): void {
    const { text, stream = "stdout", source = "run", model, note } = params;
    if (!text) {
      return;
    }
    const raw = String(text);
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line;
      if (!trimmed && source !== "run") {
        continue;
      }
      this.appendLog("ollama", {
        text: trimmed || raw,
        stream: (stream as "stdout" | "stderr"),
        context: source,
        model: model || this.activeModel,
        note
      });
    }
  }

  getLogs(): any {
    return {
      stockfish: [...this.logs.stockfish],
      ollama: [...this.logs.ollama],
      activeModel: this.activeModel,
      lastModelError: this.lastModelError
    };
  }

  getOllamaState(): any {
    return {
      serveRunning: Boolean(this.ollamaServeProcess),
      runActive: Boolean(this.ollamaRunProcess),
      activeModel: this.activeModel,
      lastModelError: this.lastModelError
    };
  }

  /**
   * Main analyze method - SIMPLIFIED and ENGINE-AGNOSTIC
   *
   * BEFORE: Called this.engineRunner.analyze() (old EngineRunner class)
   * AFTER: Calls this.currentEngine.analyze() (any IChessEngine implementation)
   */
  async analyze(payload: any): Promise<any> {
    if (!this.currentEngine) {
      throw new Error("No engine selected");
    }

    try {
      // ✅ NEW: Ensure engine is running (works with any engine)
      if (!this.currentEngine.isRunning()) {
        console.log(`[ProcessManager] Starting engine: ${this.currentEngine.name}`);
        await this.currentEngine.start();
      }

      // ✅ NEW: Call through interface (works with Stockfish, LC0, or any other engine)
      // No engine-specific logic here!
      return await this.currentEngine.analyze(payload);
    } catch (err) {
      this.recordEngineLog(this.currentEngine.name, {
        text: `Analysis failed: ${(err as Error).message}`,
        stream: "stderr",
        context: "analysis"
      });
      throw err;
    }
  }

  /**
   * Ollama methods (unchanged, but left for brevity)
   */
  async ensureServeRunning(): Promise<void> {
    // ... implementation unchanged ...
  }

  startOllamaServe(): void {
    // ... implementation unchanged ...
  }

  // ... other Ollama methods ...

  /**
   * Initialize the process manager
   */
  async init(): Promise<void> {
    // Ollama initialization (unchanged)
    await this.ensureServeRunning();
    try {
      // await this.ensureModelReady();  // If this exists
    } catch (err) {
      this.lastModelError = (err as Error)?.message || "Model start failed.";
    }

    // ✅ OPTIONAL: Could start engines on init if desired
    // for (const engine of this.engines.values()) {
    //   try {
    //     await engine.start();
    //   } catch (err) {
    //     console.error(`Failed to start ${engine.name}:`, err);
    //   }
    // }
  }

  /**
   * Shutdown all engines and services
   */
  async shutdown(): Promise<void> {
    try {
      // Ollama shutdown
      // await this.stopOllamaRun();
      // this.stopOllamaServe();

      // ✅ UPDATED: Stop all engines (not just one)
      for (const engine of this.engines.values()) {
        try {
          console.log(`[ProcessManager] Stopping engine: ${engine.name}`);
          await engine.stop();
          engine.dispose();
        } catch (err) {
          console.error(`Failed to stop ${engine.name}:`, err);
        }
      }
    } catch (err) {
      console.error("[ProcessManager] Shutdown error:", err);
    }
  }
}

// ============================================================================
// SUMMARY OF CHANGES
// ============================================================================
/*
 * OLD CODE (DO NOT USE ANYMORE):
 * - this.engineRunners = { stockfish: new EngineRunner(), lc0: new EngineRunner() }
 * - get engineRunner(): EngineRunner { ... }
 * - await this.engineRunner.analyze(payload)
 * - DELETE entire EngineRunner class (500+ lines)
 *
 * NEW CODE (USE THIS):
 * - this.engines: Map<string, IChessEngine>
 * - Constructor: instantiate via EngineFactory
 * - selectEngine(name): switch active engine
 * - await this.currentEngine.analyze(payload)
 * - BaseChessEngine handles all common logic
 */
