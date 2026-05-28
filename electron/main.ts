import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { spawn, ChildProcess } from "node:child_process";
import { Chess } from "chess.js";
import type { AnalysisLine } from "../src/types";
import { settings } from "./settings";

// Import electron APIs
import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron";

const DEFAULT_OLLAMA_MODEL = "qwen3:8b";

const PROVIDER_ENDPOINTS = {
  ollama: "http://localhost:11434/api",
  openai: "https://api.openai.com/v1",
  grok: "https://api.x.ai/v1",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com/v1beta"
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  ollama: "qwen3:8b",
  openai: "gpt-4o",
  grok: "grok-3",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-2.0-flash"
};

const PROVIDER_DOCS: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  grok: "https://console.x.ai",
  anthropic: "https://console.anthropic.com",
  gemini: "https://aistudio.google.com/app/apikey"
};

const VALID_MODELS_BY_PROVIDER: Record<string, string[]> = {
  ollama: ["qwen3:8b", "llama2", "mistral", "neural-chat", "qwen2:7b"],
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  grok: ["grok-3", "grok-beta", "grok-4-fast-reasoning", "grok-4.20-0309-reasoning"],
  anthropic: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-sonnet-4.5", "claude-3-haiku"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
};

function getModelForProvider(provider: string, savedModel?: string): string {
  // If a model is explicitly provided in payload, use it
  // Otherwise, use the default for the provider (savedModel may be from a different provider)
  if (provider === "ollama" && savedModel && savedModel.trim()) {
    return savedModel;
  }
  return (PROVIDER_DEFAULT_MODELS as Record<string, string>)[provider] || PROVIDER_DEFAULT_MODELS.ollama;
}

function validateModelForProvider(provider: string, model: string): boolean {
  if (!model || !model.trim()) return false;
  const validModels = VALID_MODELS_BY_PROVIDER[provider] || [];
  return validModels.some(m => m.toLowerCase() === model.toLowerCase());
}

function isModelRelevantForProvider(provider: string, model: string): boolean {
  if (provider === "ollama") {
    // For Ollama, any model with : in it is likely valid (e.g., "qwen3:8b")
    return model.includes(":") || validateModelForProvider(provider, model);
  }
  return validateModelForProvider(provider, model);
}


const ENGINE_VERIFY_TIMEOUT_MS = 5000;
const ANALYZE_TIMEOUT_MS = 60000; // 60 seconds for Stockfish
const LC0_ANALYZE_TIMEOUT_MS = 120000; // 120 seconds for LC0 (slower neural network)
const PROCESS_LOG_LIMIT = 400;
const OLLAMA_SERVE_RESTART_MS = 2500;

const PIECE_GLYPHS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
};

interface AnalysisCache {
  fen: string | null;
  lines: AnalysisLine[] | null;
  timestamp: number | null;
  CACHE_DURATION_MS: number;
}

const analysisCache: AnalysisCache = {
  fen: null,
  lines: null,
  timestamp: null,
  CACHE_DURATION_MS: 30000
};

function updateAnalysisCache(fen: string, lines: AnalysisLine[]): void {
  analysisCache.fen = fen;
  analysisCache.lines = lines;
  analysisCache.timestamp = Date.now();
}

function getCachedAnalysis(fen: string): AnalysisLine[] | null {
  if (!analysisCache.fen || analysisCache.fen !== fen) {
    return null;
  }
  const elapsed = Date.now() - (analysisCache.timestamp || 0);
  if (elapsed > analysisCache.CACHE_DURATION_MS) {
    return null;
  }
  return analysisCache.lines;
}

function detectMoveByMoveRequest(question: string): boolean {
  const keywords = ["move by move", "step by step", "each move", "explain", "break down", "sequence"];
  const lowerQuestion = question.toLowerCase();
  return keywords.some(keyword => lowerQuestion.includes(keyword));
}

function estimateContextTokens(messages: Array<{ content?: string }>): number {
  let totalChars = 0;
  messages.forEach(msg => {
    totalChars += (msg.content || "").length;
  });
  return Math.ceil(totalChars / 4);
}

function truncateContextIfNeeded(messages: Array<{ role: string; content: string }>, maxTokens = 6000): boolean {
  const estimatedTokens = estimateContextTokens(messages);
  if (estimatedTokens > maxTokens) {
    const userMsg = messages.find(m => m.role === "user");
    if (userMsg && userMsg.content.includes("Analysis lines")) {
      const lines = userMsg.content.split("Analysis lines:");
      if (lines.length > 1) {
        userMsg.content = lines[0] + "\n(Analysis lines truncated due to context size)";
      }
    }
    return true;
  }
  return false;
}

interface LogEntry {
  text: string;
  stream: "stdout" | "stderr";
  context?: string;
  engine?: string;
  id?: string;
  timestamp?: string;
  model?: string;
  note?: string;
}

class EngineRunner {
  engineName: string;
  proc: ChildProcess | null = null;
  path: string = "";
  lineBuffer: string = "";
  pending: Promise<any> = Promise.resolve();
  logCallback: ((entry: LogEntry) => void) | null = null;

  constructor(engineName: string, logCallback?: (entry: LogEntry) => void) {
    this.engineName = engineName || "stockfish";
    this.logCallback = typeof logCallback === "function" ? logCallback : null;
  }

  setLogCallback(fn: (entry: LogEntry) => void): void {
    this.logCallback = typeof fn === "function" ? fn : null;
  }

  emitLog(entry: LogEntry): void {
    if (typeof this.logCallback !== "function" || !entry) {
      return;
    }
    try {
      this.logCallback(entry);
    } catch {
      // swallow logging errors
    }
  }

  async ensureRunning(enginePath: string): Promise<void> {
    if (this.proc && this.path === enginePath && !this.proc.killed) {
      return;
    }
    await this.stop();
    await this.start(enginePath);
  }

  start(enginePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(enginePath, [], { windowsHide: true });
      let settled = false;
      let buffer = "";
      const isLC0 = this.engineName.toLowerCase() === "lc0";
      const timeoutMs = isLC0 ? ENGINE_VERIFY_TIMEOUT_MS : 2500;

      const cleanup = () => {
        proc.stdout?.off("data", onData);
        proc.stderr?.off("data", onStderr);
        proc.off("error", onError);
        proc.off("exit", onExit);
      };

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          proc.kill();
        } catch {}
        reject(err);
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        cleanup();
        this.proc = proc;
        this.path = enginePath;
        this.lineBuffer = "";
        resolve();
      };

      const onError = (err: Error) => fail(err);
      const onExit = () => {
        if (!settled) {
          const msg = isLC0
            ? `${this.engineName} process exited before initialization. Ensure LC0 weights file is installed.`
            : `${this.engineName} process exited before initialization.`;
          fail(new Error(msg));
        }
      };
      const onStderr = (chunk: Buffer) => {
        const text = chunk?.toString?.() || "";
        console.log(`[${this.engineName}] STDERR: ${text}`);
        this.emitLog({
          text,
          stream: "stderr",
          context: "uci-init"
        });
      };
      const onData = (chunk: Buffer) => {
        const text = chunk?.toString?.() || "";
        console.log(`[${this.engineName}] INIT OUTPUT: ${text}`);
        this.emitLog({ text, stream: "stdout", context: "uci-init" });
        buffer += text;
        if (buffer.includes("uciok")) {
          console.log(`[${this.engineName}] ✓ Received uciok, sending isready...`);
          proc.stdin.write("isready\n");
        }
        if (buffer.includes("readyok")) {
          console.log(`[${this.engineName}] ✓ Received readyok, engine ready!`);
          succeed();
        }
      };

      proc.on("error", onError);
      proc.on("exit", onExit);
      proc.stderr?.on("data", onStderr);
      proc.stdout?.on("data", onData);

      proc.stdin.write("uci\n");

      setTimeout(() => {
        const msg = isLC0
          ? `Timeout initializing ${this.engineName}. Check that LC0 is installed and neural network weights are available.`
          : `Timeout initializing ${this.engineName} with UCI.`;
        fail(new Error(msg));
      }, timeoutMs);
    });
  }

  async stop(): Promise<void> {
    if (!this.proc) {
      return;
    }
    try {
      this.proc.kill();
    } catch {}
    this.proc = null;
    this.path = "";
  }

  send(command: string): void {
    if (!this.proc || this.proc.killed) {
      throw new Error(`${this.engineName} process is not running.`);
    }
    this.proc.stdin.write(`${command}\n`);
  }

  analyze(params: { fen: string; depth?: number; multiPv?: number }): Promise<any> {
    this.pending = this.pending.then(() => this._analyzeInternal(params));
    return this.pending;
  }

  private _analyzeInternal(params: { fen: string; depth?: number; multiPv?: number }): Promise<any> {
    const { fen, depth = 15, multiPv = 4 } = params;
    return new Promise((resolve, reject) => {
      if (!this.proc || this.proc.killed) {
        reject(new Error(`${this.engineName} process is not running.`));
        return;
      }

      let buffer = "";
      let bestMove = "";
      const linesByRank = new Map<number, any>();
      let done = false;

      const cleanup = () => {
        clearTimeout(timer);
        this.proc?.stdout?.off("data", onData);
      };

      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        const lines = [...linesByRank.entries()]
          .sort((a, b) => a[0] - b[0])
          .slice(0, 4)
          .map(([rank, value]) => ({
            rank,
            score: value.score || null,
            pv: value.pv || ""
          }));
        resolve({
          bestMove,
          lines
        });
      };

      const fail = (err: Error) => {
        if (done) return;
        done = true;
        cleanup();
        this.emitLog({
          text: err?.message || `${this.engineName} analysis failed.`,
          stream: "stderr",
          context: "analysis"
        });
        reject(err);
      };

      const parseInfo = (line: string) => {
        // Extract depth (provided by both Stockfish and LC0)
        const depthMatch = line.match(/\bdepth\s(\d+)/);
        const depth = depthMatch ? Number(depthMatch[1]) : undefined;

        // Score parsing: engines are mutually exclusive
        // Stockfish outputs: "score cp <value>" or "score mate <value>"
        // LC0 outputs: "score wdl <wins> <draws> <losses>"
        const scoreCp = line.match(/score cp (-?\d+)/);
        const scoreMate = line.match(/score mate (-?\d+)/);
        const scoreWdl = line.match(/score wdl (\d+) (\d+) (\d+)/);

        const pv = line.match(/\spv\s(.+)$/);
        const mpvMatch = line.match(/\bmultipv\s(\d+)/);
        const rank = mpvMatch ? Number(mpvMatch[1]) : 1;
        const existing = linesByRank.get(rank) || { score: null, pv: "" };

        // Log parsing details to console
        console.log(`[${this.engineName}] Parsing info line | depth: ${depth}, rank: ${rank}`);

        // Set score based on engine type
        if (scoreCp) {
          // Stockfish: centipawn evaluation
          existing.score = { type: "cp", value: Number(scoreCp[1]), depth };
          console.log(`[${this.engineName}] ✓ Parsed CP score: ${scoreCp[1]} cp (depth ${depth})`);
        } else if (scoreMate) {
          // Stockfish: mate in X moves
          existing.score = { type: "mate", value: Number(scoreMate[1]), depth };
          console.log(`[${this.engineName}] ✓ Parsed MATE score: mate in ${scoreMate[1]} (depth ${depth})`);
        } else if (scoreWdl) {
          // LC0: win-draw-loss probabilities
          const wins = Number(scoreWdl[1]);
          const draws = Number(scoreWdl[2]);
          const losses = Number(scoreWdl[3]);
          const total = wins + draws + losses;
          const winProb = total > 0 ? wins / total : 0;
          existing.score = { winProb, depth };
          console.log(`[${this.engineName}] ✓ Parsed WDL score: ${wins}/${draws}/${losses} = ${(winProb * 100).toFixed(1)}% win prob (depth ${depth})`);
        } else {
          console.log(`[${this.engineName}] ⚠ No score found in line`);
        }

        if (pv) {
          existing.pv = pv[1];
          console.log(`[${this.engineName}] ✓ Parsed PV: ${pv[1]}`);
        }
        linesByRank.set(rank, existing);
      };

      const onData = (chunk: Buffer) => {
        const chunkText = chunk.toString();
        console.log(`[${this.engineName}] Raw output received (${chunkText.length} bytes): ${chunkText.substring(0, 100)}`);

        buffer += chunkText;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          // Log raw output to UI
          this.emitLog({ text: line, stream: "stdout", context: "analysis" });
          console.log(`[${this.engineName}] RAW OUTPUT: ${line}`);

          if (line.startsWith("info ")) {
            console.log(`[${this.engineName}] Processing info line...`);
            parseInfo(line);
          } else if (line.startsWith("bestmove ")) {
            bestMove = line.split(" ")[1] || "";
            console.log(`[${this.engineName}] ✓ Analysis complete | best move: ${bestMove}`);
            finish();
            return;
          } else {
            console.log(`[${this.engineName}] Other output: ${line}`);
          }
        }
      };

      this.proc!.stdout?.on("data", onData);

      // Use configurable timeout or fall back to default based on engine
      const configuredTimeoutMs = settings.get("engineTimeoutMs");
      const fallbackTimeoutMs = this.engineName.toLowerCase() === "lc0" ? LC0_ANALYZE_TIMEOUT_MS : ANALYZE_TIMEOUT_MS;
      const timeoutMs = configuredTimeoutMs ? Number(configuredTimeoutMs) : fallbackTimeoutMs;

      const timeoutAction = () => {
        if (done) return;

        console.log(`[${this.engineName}] Timeout reached (${timeoutMs}ms) - sending stop command`);

        // Send graceful stop command
        try {
          this.proc?.stdin?.write("stop\n");
        } catch (err) {
          console.error(`[${this.engineName}] Failed to send stop command:`, err);
        }

        // Kill process after grace period if it hasn't exited
        const killTimer = setTimeout(() => {
          try {
            if (this.proc && !this.proc.killed) {
              this.proc.kill();
              console.log(`[${this.engineName}] Process killed after grace period`);
            }
          } catch (err) {
            console.error(`[${this.engineName}] Failed to kill process:`, err);
          }
        }, 500);

        // Snapshot whatever lines we have collected so far
        const snapshotLines = [...linesByRank.entries()]
          .sort((a, b) => a[0] - b[0])
          .slice(0, 4)
          .map(([rank, value]) => ({
            rank,
            score: value.score || null,
            pv: value.pv || ""
          }));

        if (snapshotLines.length > 0) {
          console.log(`[${this.engineName}] Resolving with partial snapshot (${snapshotLines.length} lines)`);
          finish();
        } else {
          console.log(`[${this.engineName}] No lines collected - rejecting`);
          fail(new Error(`${this.engineName} analysis timeout with no results`));
        }
      };

      const timer = setTimeout(timeoutAction, timeoutMs);

      try {
        this.send("ucinewgame");
        const multiPvValue = Math.max(1, Math.min(4, Number(multiPv) || 1));
        this.send(`setoption name MultiPV value ${multiPvValue}`);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      } catch (err) {
        fail(err as Error);
      }
    });
  }
}

class ProcessManager {
  settings: any;
  engineRunners: Record<string, EngineRunner>;
  currentEngine: string | null = null;
  logs: { stockfish: LogEntry[]; ollama: LogEntry[] };
  ollamaServeProcess: ChildProcess | null = null;
  ollamaRunProcess: ChildProcess | null = null;
  activeModel: string;
  lastModelError: string = "";
  serveRestartTimer: NodeJS.Timeout | null = null;
  serveShuttingDown: boolean = false;

  constructor({ settings }: { settings: any }) {
    this.settings = settings;
    this.engineRunners = {
      stockfish: new EngineRunner("stockfish"),
      lc0: new EngineRunner("lc0")
    };
    this.logs = {
      stockfish: [],
      ollama: []
    };
    // Don't call settings.get() during initialization - defer until after app is ready
    this.activeModel = DEFAULT_OLLAMA_MODEL;

    this.engineRunners.stockfish.setLogCallback((entry) => this.recordEngineLog("stockfish", entry));
    this.engineRunners.lc0.setLogCallback((entry) => this.recordEngineLog("lc0", entry));
  }

  // Call this after app is ready to initialize activeModel from settings
  initializeFromSettings(): void {
    this.activeModel = this.normalizeModel(this.settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL);
  }

  get engineRunner(): EngineRunner {
    const engineName = this.settings.get("selectedEngine") || "lc0";
    return this.engineRunners[engineName] || this.engineRunners.lc0;
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

  recordOllamaLog(params: { text: string; stream?: string; source?: string; model?: string; note?: string }): void {
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

  async ensureServeRunning(): Promise<void> {
    if (this.ollamaServeProcess) {
      return;
    }
    try {
      const status = await checkOllamaQwen3();
      if (status?.ollamaRunning) {
        this.recordOllamaLog({
          text: "Detected existing Ollama instance; skipping `ollama serve` spawn.",
          stream: "stdout",
          source: "serve"
        });
        return;
      }
    } catch (err) {
      this.recordOllamaLog({
        text: `Failed to probe existing Ollama: ${(err as Error)?.message || "unknown"}`,
        stream: "stderr",
        source: "serve"
      });
    }
    this.startOllamaServe();
  }

  startOllamaServe(): void {
    if (this.ollamaServeProcess) {
      return;
    }
    this.serveShuttingDown = false;
    try {
      const proc = spawn("ollama", ["serve"], { windowsHide: true });
      this.ollamaServeProcess = proc;
      this.recordOllamaLog({
        text: "Starting ollama serve...",
        stream: "stdout",
        source: "serve"
      });

      const emitStream = (streamName: "stdout" | "stderr") => (chunk: Buffer) =>
        this.recordOllamaLog({
          text: chunk?.toString?.() || "",
          stream: streamName,
          source: "serve"
        });

      proc.stdout?.on("data", emitStream("stdout"));
      proc.stderr?.on("data", emitStream("stderr"));

      proc.on("error", (err) => {
        this.recordOllamaLog({
          text: `ollama serve error: ${(err as Error)?.message || "unknown"}`,
          stream: "stderr",
          source: "serve"
        });
      });

      proc.on("exit", (code) => {
        this.recordOllamaLog({
          text: `ollama serve exited (code=${code ?? "?"})`,
          stream: "stderr",
          source: "serve"
        });
        this.ollamaServeProcess = null;
        if (this.serveShuttingDown) {
          this.serveShuttingDown = false;
          return;
        }
        if (this.serveRestartTimer) {
          clearTimeout(this.serveRestartTimer);
        }
        this.serveRestartTimer = setTimeout(() => {
          this.startOllamaServe();
        }, OLLAMA_SERVE_RESTART_MS);
      });
    } catch (err) {
      this.recordOllamaLog({
        text: `ollama serve failed to spawn: ${(err as Error)?.message || "unknown"}`,
        stream: "stderr",
        source: "serve"
      });
      this.ollamaServeProcess = null;
      if (this.serveRestartTimer) {
        clearTimeout(this.serveRestartTimer);
      }
      this.serveRestartTimer = setTimeout(() => {
        this.startOllamaServe();
      }, OLLAMA_SERVE_RESTART_MS);
    }
  }

  stopOllamaServe(): void {
    this.serveShuttingDown = true;
    if (this.serveRestartTimer) {
      clearTimeout(this.serveRestartTimer);
      this.serveRestartTimer = null;
    }
    if (this.ollamaServeProcess) {
      try {
        this.ollamaServeProcess.kill();
      } catch {}
    }
    this.ollamaServeProcess = null;
  }

  async stopOllamaRun(): Promise<void> {
    if (!this.ollamaRunProcess) {
      return;
    }
    const proc = this.ollamaRunProcess;
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        proc.off("exit", onExit);
        resolve();
      };
      const onExit = () => cleanup();
      proc.on("exit", onExit);
      try {
        proc.kill();
      } catch {
        cleanup();
      }
      setTimeout(() => cleanup(), 2000);
    });
    if (this.ollamaRunProcess === proc) {
      this.ollamaRunProcess = null;
    }
  }

  spawnOllamaRun(model: string): void {
    let proc;
    try {
      proc = spawn("ollama", ["run", model], { windowsHide: true });
    } catch (err) {
      this.recordOllamaLog({
        text: `ollama run ${model} spawn failed: ${(err as Error)?.message || "unknown"}`,
        stream: "stderr",
        source: "run",
        model
      });
      throw err;
    }
    this.ollamaRunProcess = proc;
    this.recordOllamaLog({
      text: `ollama run ${model} starting...`,
      stream: "stdout",
      source: "run",
      model
    });

    const emitStream = (streamName: "stdout" | "stderr") => (chunk: Buffer) =>
      this.recordOllamaLog({
        text: chunk?.toString?.() || "",
        stream: streamName,
        source: "run",
        model
      });

    proc.stdout?.on("data", emitStream("stdout"));
    proc.stderr?.on("data", emitStream("stderr"));

    proc.on("error", (err) => {
      this.recordOllamaLog({
        text: `ollama run ${model} error: ${(err as Error)?.message || "unknown"}`,
        stream: "stderr",
        source: "run",
        model
      });
      if (this.ollamaRunProcess === proc) {
        this.ollamaRunProcess = null;
      }
    });

    proc.on("exit", (code) => {
      this.recordOllamaLog({
        text: `ollama run ${model} exited (code=${code ?? "?"})`,
        stream: "stderr",
        source: "run",
        model
      });
      if (this.ollamaRunProcess === proc) {
        this.ollamaRunProcess = null;
      }
    });
  }

  async setActiveModel(model: string, options: { force?: boolean } = {}): Promise<string> {
    const normalized = this.normalizeModel(model);
    if (!options.force && normalized === this.activeModel && this.ollamaRunProcess) {
      return normalized;
    }
    this.activeModel = normalized;
    await this.stopOllamaRun();
    await this.ensureServeRunning();
    try {
      this.spawnOllamaRun(normalized);
      this.lastModelError = "";
      return normalized;
    } catch (err) {
      this.lastModelError = (err as Error)?.message || "Unable to start model.";
      throw err;
    }
  }

  async ensureModelReady(): Promise<void> {
    await this.setActiveModel(this.activeModel, { force: true });
  }

  async analyze(payload: any): Promise<any> {
    const savedPath = this.settings.get("stockfishPath");
    if (!savedPath) {
      throw new Error("Stockfish path not configured.");
    }
    const valid = await verifyStockfishPath(savedPath);
    if (!valid) {
      throw new Error("Configured Stockfish path is invalid.");
    }
    await this.engineRunner.ensureRunning(savedPath);
    return this.engineRunner.analyze(payload);
  }

  async init(): Promise<void> {
    await this.ensureServeRunning();
    try {
      await this.ensureModelReady();
    } catch (err) {
      this.lastModelError = (err as Error)?.message || "Model start failed.";
    }
  }

  async shutdown(): Promise<void> {
    await this.stopOllamaRun();
    this.stopOllamaServe();
    await this.engineRunner.stop();
  }
}

class BoardStateManager {
  private board: Chess;

  constructor() {
    this.board = new Chess();
  }

  getBoardFen(): string {
    return this.board.fen();
  }

  setBoardFen(fen: string): boolean {
    try {
      this.board.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  getLegalMoves(): string[] {
    return this.board.moves({ verbose: false }) as string[];
  }

  validateMove(from: string, to: string): { valid: boolean; reason?: string } {
    const move = this.board.move({ from, to, promotion: "q" });
    if (move) {
      this.board.undo();
      return { valid: true };
    }
    return { valid: false, reason: "move is not legal in current position" };
  }

  applyMove(from: string, to: string): { ok: boolean; fen?: string; error?: string } {
    const validation = this.validateMove(from, to);
    if (!validation.valid) {
      return { ok: false, error: validation.reason };
    }
    const move = this.board.move({ from, to, promotion: "q" });
    if (!move) {
      return { ok: false, error: "failed to apply move" };
    }
    return { ok: true, fen: this.board.fen() };
  }

  reset(fen: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"): void {
    this.board.reset();
    if (fen !== this.board.fen()) {
      this.board.load(fen);
    }
  }
}

const boardManager = new BoardStateManager();
const processManager = new ProcessManager({ settings });

function isExecutableCandidate(fullPath: string): boolean {
  try {
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

async function verifyEnginePath(enginePath: string, engineName = "stockfish"): Promise<boolean> {
  if (!enginePath || !isExecutableCandidate(enginePath)) {
    return false;
  }
  const probe = spawn(enginePath, [], { windowsHide: true });
  return new Promise((resolve) => {
    let buffer = "";
    let done = false;
    let hasOutput = false;

    const finalize = (ok: boolean) => {
      if (done) return;
      done = true;
      try {
        probe.kill();
      } catch {}
      resolve(ok);
    };

    probe.on("error", (err) => {
      console.error(`Engine verification error for ${enginePath}:`, err.message);
      finalize(false);
    });

    probe.on("exit", (code) => {
      if (!hasOutput) {
        console.error(`Engine ${enginePath} exited without output (code: ${code})`);
      }
      finalize(false);
    });

    probe.stdout?.on("data", (chunk: Buffer) => {
      hasOutput = true;
      buffer += chunk.toString();
      if (buffer.includes("uciok")) {
        finalize(true);
      }
    });

    probe.stderr?.on("data", (chunk: Buffer) => {
      console.error(`Engine stderr (${enginePath}):`, chunk.toString());
    });

    try {
      probe.stdin.write("uci\n");
      probe.stdin.end();
    } catch (err) {
      console.error(`Failed to write to engine ${enginePath}:`, err);
      finalize(false);
    }

    setTimeout(() => {
      if (!done) {
        console.warn(`Engine verification timeout for ${enginePath}`);
        finalize(false);
      }
    }, ENGINE_VERIFY_TIMEOUT_MS);
  });
}

function searchDirectoryRecursive(dirPath: string, engineName: string, isBinary: boolean, maxDepth = 3): string[] {
  const results: string[] = [];
  const execName = process.platform === "win32"
    ? (isBinary ? "stockfish.exe" : "lc0.exe")
    : (isBinary ? "stockfish" : "lc0");
  const binaryPattern = isBinary
    ? /^stockfish([-_].+)?(\.exe)?$/i
    : /^lc0([-_].+)?(\.exe)?$/i;

  const search = (dir: string, depth: number) => {
    if (depth > maxDepth || !fs.existsSync(dir)) return;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        try {
          if (item.isFile() && binaryPattern.test(item.name)) {
            const fullPath = path.join(dir, item.name);
            if (isExecutableCandidate(fullPath)) {
              results.push(fullPath);
            }
          } else if (item.isDirectory() && depth < maxDepth) {
            search(path.join(dir, item.name), depth + 1);
          }
        } catch {
          // Skip items we can't access
        }
      }
    } catch (err) {
      console.warn(`[${engineName}] Cannot read directory ${dir}:`, (err as Error).message);
    }
  };

  search(dirPath, 0);
  return results;
}

function engineCandidates(engineName: string): string[] {
  const candidates: string[] = [];
  const settingKey = `${engineName}Path`;
  const saved = settings.get(settingKey);
  if (saved) {
    candidates.push(saved);
  }

  const isBinary = engineName.toLowerCase() === "stockfish";
  const execName = process.platform === "win32"
    ? (isBinary ? "stockfish.exe" : "lc0.exe")
    : (isBinary ? "stockfish" : "lc0");

  const bundledCandidates = [
    path.join(process.resourcesPath || "", "vendor", engineName, execName),
    path.join(app.getAppPath(), "vendor", engineName, execName)
  ];

  const cwdCandidates = [
    path.join(process.cwd(), execName),
    path.join(process.cwd(), "engines", execName),
    path.join(process.cwd(), "bin", execName)
  ];

  const osDirs = process.platform === "win32"
    ? [
        path.join("C:\\", "Program Files"),
        path.join("C:\\", "Program Files (x86)")
      ]
    : [path.join("/usr/local/bin"), path.join("/opt/homebrew/bin"), path.join("/usr/bin")];

  const osCandidates = process.platform === "win32"
    ? [
        path.join("C:\\", "Program Files", engineName.charAt(0).toUpperCase() + engineName.slice(1), execName),
        path.join("C:\\", "Program Files (x86)", engineName.charAt(0).toUpperCase() + engineName.slice(1), execName)
      ]
    : [
        path.join("/usr/local/bin", execName),
        path.join("/opt/homebrew/bin", execName),
        path.join("/usr/bin", execName)
      ];

  function patternCandidatesFromDir(dirPath: string): string[] {
    if (!dirPath) return [];
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const results: string[] = [];
      const binaryPattern = isBinary
        ? /^stockfish([-_].+)?(\.exe)?$/i
        : /^lc0([-_].+)?(\.exe)?$/i;
      for (const item of items) {
        if (!item.isFile()) continue;
        const lower = item.name.toLowerCase();
        if (!binaryPattern.test(lower)) continue;
        const isWin = process.platform === "win32";
        const validExt = isWin ? lower.endsWith(".exe") : !lower.endsWith(".txt");
        if (!validExt) continue;
        results.push(path.join(dirPath, item.name));
      }
      return results;
    } catch {
      return [];
    }
  }

  function commandPathCandidates(): string[] {
    try {
      const searchCmd = engineName.toLowerCase();
      const isWin = process.platform === "win32";
      const commands = isWin
        ? [`where ${searchCmd}`, `where ${searchCmd}*`]
        : [`which ${searchCmd}`, `bash -lc "compgen -c | rg '^${searchCmd}' || true"`];
      const all: string[] = [];
      for (const cmd of commands) {
        try {
          const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .split(/\r?\n/)
            .map((v: string) => v.trim())
            .filter(Boolean);
          all.push(...out);
        } catch {
          // Ignore individual lookup command failures.
        }
      }
      return [...new Set(all)];
    } catch {
      return [];
    }
  }

  const patternCandidates = [
    ...osDirs.flatMap((d) => patternCandidatesFromDir(d))
  ].filter((p) => {
    const binaryPattern = isBinary
      ? /^stockfish([-_].+)?(\.exe)?$/i
      : /^lc0([-_].+)?(\.exe)?$/i;
    return binaryPattern.test(path.basename(p));
  });

  // Add recursive search results for Program Files
  const recursiveSearchCandidates = process.platform === "win32"
    ? [
        ...searchDirectoryRecursive(path.join("C:\\", "Program Files"), engineName, isBinary),
        ...searchDirectoryRecursive(path.join("C:\\", "Program Files (x86)"), engineName, isBinary)
      ]
    : [];

  candidates.push(
    ...bundledCandidates,
    ...cwdCandidates,
    ...osCandidates,
    ...patternCandidates,
    ...recursiveSearchCandidates,
    ...commandPathCandidates()
  );

  return [...new Set(candidates)].filter(isExecutableCandidate);
}

async function findWorkingEngine(engineName: string, persist = false): Promise<{ path: string }> {
  const candidates = engineCandidates(engineName);
  console.log(`[${engineName}] Checking ${candidates.length} candidates:`, candidates.slice(0, 5).join(", "), candidates.length > 5 ? `... and ${candidates.length - 5} more` : "");

  for (const candidate of candidates) {
    const ok = await verifyEnginePath(candidate, engineName);
    if (ok) {
      console.log(`[${engineName}] Found working engine at ${candidate}`);
      if (persist) {
        settings.set(`${engineName}Path`, candidate);
      }
      return { path: candidate };
    }
  }
  console.log(`[${engineName}] No working engine found in any candidates`);
  return { path: "" };
}

async function detectEngine(engineName: string): Promise<{ found: boolean; path: string }> {
  const result = await findWorkingEngine(engineName, true);
  if (result.path) {
    return { found: true, path: result.path };
  }
  return { found: false, path: "" };
}

async function verifyStockfishPath(enginePath: string): Promise<boolean> {
  if (!enginePath || !isExecutableCandidate(enginePath)) {
    return false;
  }
  const probe = spawn(enginePath, [], { windowsHide: true });
  return new Promise((resolve) => {
    let buffer = "";
    let done = false;
    const finalize = (ok: boolean) => {
      if (done) return;
      done = true;
      try {
        probe.kill();
      } catch {}
      resolve(ok);
    };

    probe.on("error", () => finalize(false));
    probe.on("exit", () => finalize(false));
    probe.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      if (buffer.includes("uciok")) {
        finalize(true);
      }
    });

    try {
      probe.stdin.write("uci\n");
    } catch {
      finalize(false);
    }

    setTimeout(() => finalize(false), ENGINE_VERIFY_TIMEOUT_MS);
  });
}

async function checkOllamaQwen3(): Promise<{ ollamaRunning: boolean; qwen3Installed: boolean; models: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { ollamaRunning: false, qwen3Installed: false, models: [] };
    }
    const data = await response.json() as any;
    const models =
      Array.isArray(data?.models)
        ? (data.models as any[])
            .map((m) => String(m?.name || "").trim())
            .filter(Boolean)
        : [];
    const hasQwen3 = models.some((name) => name.toLowerCase().startsWith("qwen3"));
    return { ollamaRunning: true, qwen3Installed: hasQwen3, models };
  } catch {
    clearTimeout(timer);
    return { ollamaRunning: false, qwen3Installed: false, models: [] };
  }
}

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1300,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env.ELECTRON_START_URL !== undefined;
    const scriptSrc = isDev ? "'self' 'unsafe-inline'" : "'self'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [`default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:`]
      }
    });
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
    }
  });

  mainWindow = win;
  win.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers
function registerIpcHandlers(): void {
ipcMain.handle("detectEngine", async (_event, { engine }) => {
  return detectEngine(engine || "stockfish");
});

ipcMain.handle("browseForEngine", async (_event, { engine }) => {
  const engineName = (engine || "stockfish").toLowerCase();
  const titleMap: Record<string, string> = {
    stockfish: "Select Stockfish Executable",
    lc0: "Select LC0 Executable"
  };

  const result = await dialog.showOpenDialog({
    title: titleMap[engineName] || "Select Engine Executable",
    properties: ["openFile"],
    filters:
      process.platform === "win32"
        ? [{ name: "Executables", extensions: ["exe"] }, { name: "All Files", extensions: ["*"] }]
        : [{ name: "All Files", extensions: ["*"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { selected: false, path: "" };
  }

  const selectedPath = result.filePaths[0];
  const ok = await verifyEnginePath(selectedPath, engineName);
  if (!ok) {
    return { selected: true, valid: false, path: selectedPath };
  }
  settings.set(`${engineName}Path`, selectedPath);
  return { selected: true, valid: true, path: selectedPath };
});

ipcMain.handle("app:open-external", async (_event, url: string) => {
  if (!url || typeof url !== "string") {
    return { ok: false };
  }
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("app:system-check", async () => {
  console.log("[system-check] Starting system check...");
  const [ollama, stockfish, lc0] = await Promise.all([
    checkOllamaQwen3(),
    findWorkingEngine("stockfish", false),
    findWorkingEngine("lc0", false)
  ]);
  console.log("[system-check] Stockfish result:", stockfish.path ? `found at ${stockfish.path}` : "not found");
  console.log("[system-check] LC0 result:", lc0.path ? `found at ${lc0.path}` : "not found");

  const processState = processManager.getOllamaState();
  const result = {
    platform: process.platform,
    ollamaRunning: processState.serveRunning || ollama.ollamaRunning,
    qwen3Installed: ollama.qwen3Installed,
    stockfishFound: Boolean(stockfish.path),
    stockfishPath: stockfish.path || "",
    lc0Found: Boolean(lc0.path),
    lc0Path: lc0.path || "",
    availableModels: ollama.models || [],
    activeModel: processState.activeModel,
    ollamaRunActive: processState.runActive,
    lastModelError: processState.lastModelError
  };
  console.log("[system-check] Result:", { stockfishFound: result.stockfishFound, lc0Found: result.lc0Found });
  return result;
});

ipcMain.handle("setEnginePath", async (_event, { engine, path: enginePath }) => {
  const engineName = (engine || "stockfish").toLowerCase();
  const ok = await verifyEnginePath(enginePath, engineName);
  if (!ok) {
    return { ok: false };
  }
  settings.set(`${engineName}Path`, enginePath);
  return { ok: true, path: enginePath };
});

ipcMain.handle("getEngineStatus", async () => {
  const selectedEngine = settings.get("selectedEngine") || "lc0";
  const stockfishPath = settings.get("stockfishPath") || "";
  const lc0Path = settings.get("lc0Path") || "";
  const stockfishValid = stockfishPath ? await verifyEnginePath(stockfishPath, "stockfish") : false;
  const lc0Valid = lc0Path ? await verifyEnginePath(lc0Path, "lc0") : false;
  const llmApiKey = settings.get("llmApiKey") || "";
  const llmProvider = settings.get("llmProvider") || "ollama";

  // Load the appropriate model based on provider
  let llmModel: string;
  if (llmProvider === "ollama") {
    llmModel = settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
  } else {
    // For non-Ollama providers, use llmModel field, fall back to ollamaModel for backward compatibility
    llmModel = settings.get("llmModel") || settings.get("ollamaModel") || PROVIDER_DEFAULT_MODELS[llmProvider] || DEFAULT_OLLAMA_MODEL;
  }

  // Validate that model is appropriate for the provider
  if (!isModelRelevantForProvider(llmProvider, llmModel)) {
    console.warn(`[getEngineStatus] Loaded model "${llmModel}" is not valid for provider "${llmProvider}". Using default.`);
    llmModel = PROVIDER_DEFAULT_MODELS[llmProvider] || DEFAULT_OLLAMA_MODEL;
  }

  // Check if all LLM settings are properly configured
  const llmConfigured = llmProvider !== "ollama"
    ? (llmApiKey && llmApiKey.trim() && llmModel && llmModel.trim())
    : true; // Ollama doesn't require API key

  return {
    selectedEngine,
    stockfishPath: stockfishValid ? stockfishPath : "",
    lc0Path: lc0Valid ? lc0Path : "",
    configured: (selectedEngine === "stockfish" && stockfishValid) || (selectedEngine === "lc0" && lc0Valid),
    llmConfigured,
    settings: {
      analysisDepth: Number(settings.get("analysisDepth")) || 16,
      explainLanguage: settings.get("explainLanguage") || "English",
      ollamaModel: settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL,
      ollamaBaseUrl: settings.get("ollamaBaseUrl") || "http://localhost:11434/api",
      llmProvider: llmProvider,
      llmApiKey: llmApiKey,
      llmApiKeyLength: llmApiKey.length,
      llmModel: llmModel // Include the provider-specific model
    }
  };
});

ipcMain.handle("app:update-settings", async (_event, payload) => {
  const nextDepth = Math.max(6, Math.min(30, Number(payload?.analysisDepth) || 16));
  const nextProvider = payload?.llmProvider || settings.get("llmProvider") || "ollama";

  // Get the model from the appropriate field based on provider
  let nextModel: string;
  if (nextProvider === "ollama") {
    nextModel = payload?.ollamaModel || settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
  } else {
    nextModel = payload?.llmModel || payload?.model || settings.get("llmModel") || PROVIDER_DEFAULT_MODELS[nextProvider] || DEFAULT_OLLAMA_MODEL;
  }

  // Validate model matches provider
  if (!isModelRelevantForProvider(nextProvider, nextModel)) {
    console.warn(`[settings] Model "${nextModel}" not valid for provider "${nextProvider}". Using default.`);
    nextModel = PROVIDER_DEFAULT_MODELS[nextProvider] || DEFAULT_OLLAMA_MODEL;
  }

  settings.set("analysisDepth", nextDepth);
  settings.set("explainLanguage", payload?.explainLanguage || "English");
  settings.set("ollamaBaseUrl", payload?.ollamaBaseUrl || "http://localhost:11434/api");
  settings.set("selectedEngine", payload?.selectedEngine || settings.get("selectedEngine") || "lc0");
  settings.set("llmProvider", nextProvider);

  // Save model to the appropriate field based on provider
  if (nextProvider === "ollama") {
    settings.set("ollamaModel", nextModel);
  } else {
    settings.set("llmModel", nextModel);
  }

  if (payload?.stockfishPath) {
    settings.set("stockfishPath", payload.stockfishPath);
  }
  if (payload?.lc0Path) {
    settings.set("lc0Path", payload.lc0Path);
  }

  // Handle API key with mask detection
  if (payload?.llmApiKey !== undefined && payload.llmApiKey !== "") {
    const storedKey = settings.get("llmApiKey") || "";
    const isMask = payload.llmApiKey === "•".repeat(storedKey.length);
    if (!isMask) {
      // Real API key provided, update it
      settings.set("llmApiKey", payload.llmApiKey);
    }
    // If mask, don't update (key unchanged)
  }

  // Only manage Ollama model if the provider is Ollama
  if (nextProvider === "ollama") {
    try {
      await processManager.setActiveModel(nextModel);
    } catch {
      // Already logged in the process manager.
    }
  }

  return {
    ok: true,
    settings: {
      analysisDepth: nextDepth,
      explainLanguage: settings.get("explainLanguage"),
      ollamaModel: settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL,
      ollamaBaseUrl: settings.get("ollamaBaseUrl"),
      llmProvider: nextProvider,
      llmApiKeyLength: (settings.get("llmApiKey") || "").length,
      llmModel: nextModel
    }
  };
});

ipcMain.handle("process:get-logs", () => {
  return processManager.getLogs();
});

ipcMain.handle("process:set-model", async (_event, model) => {
  try {
    const activeModel = await processManager.setActiveModel(model);
    return { ok: true, activeModel };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || "Failed to start Ollama model." };
  }
});

ipcMain.handle("getAvailableModels", async (_event, payload) => {
  const { provider, apiKey, baseUrl } = payload || {};

  if (provider === "ollama") {
    try {
      const ollamaStatus = await checkOllamaQwen3();
      return { ok: true, models: ollamaStatus.models };
    } catch (err) {
      return { ok: false, error: "Unable to fetch Ollama models." };
    }
  }

  if (provider === "openai") {
    if (!apiKey) {
      return { ok: false, error: "API key is required for OpenAI." };
    }
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!response.ok) {
        return { ok: false, error: `OpenAI API error: ${response.statusText}` };
      }
      const data = await response.json() as any;
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => id.includes("gpt")) // Only show GPT models
        .sort()
        .reverse(); // Newest first
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: "Failed to fetch OpenAI models." };
    }
  }

  if (provider === "grok") {
    if (!apiKey) {
      return { ok: false, error: "API key is required for Grok." };
    }
    // Grok doesn't provide a reliable model listing API, return known models
    return { ok: true, models: ["grok-3", "grok-beta", "grok-4-fast-reasoning", "grok-4.20-0309-reasoning", "grok-latest"] };
  }

  if (provider === "anthropic") {
    if (!apiKey) {
      return { ok: false, error: "API key is required for Anthropic." };
    }
    // Anthropic doesn't provide a model listing API, return known models
    return { ok: true, models: ["claude-opus-4-1", "claude-sonnet-4-6", "claude-haiku-4-5"] };
  }

  if (provider === "gemini") {
    if (!apiKey) {
      return { ok: false, error: "API key is required for Gemini." };
    }
    // Gemini doesn't provide a model listing API, return known models
    return { ok: true, models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"] };
  }

  return { ok: false, error: `Unknown provider: ${provider}` };
});

async function performAnalysis(engine: string, fen: string, depth?: number, multiPv?: number) {
  const selectedEngine = engine || settings.get("selectedEngine") || "lc0";
  const enginePath = settings.get(`${selectedEngine}Path`);
  if (!enginePath) {
    return { ok: false, error: `${selectedEngine} engine not configured.` };
  }

  const finalDepth = Math.max(6, Math.min(30, Number(depth) || Number(settings.get("analysisDepth")) || 16));
  const finalMultiPv = Math.max(1, Math.min(4, Number(multiPv) || 4));

  try {
    const engineRunner = processManager.engineRunners[selectedEngine] || processManager.engineRunner;
    await engineRunner.ensureRunning(enginePath);
    const analysis = await engineRunner.analyze({
      fen,
      depth: finalDepth,
      multiPv: finalMultiPv
    });
    return { ok: true, analysis };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || "Engine analysis failed." };
  }
}

ipcMain.handle("analyzePosition", async (_event, payload) => {
  const { engine, fen, depth, multiPv } = payload || {};
  if (!fen || typeof fen !== "string") {
    return { ok: false, error: "Invalid FEN input." };
  }

  return performAnalysis(engine, fen, depth, multiPv);
});

ipcMain.handle("stockfish:analyze", async (_event, payload) => {
  const { fen, depth, multiPv } = payload || {};
  if (!fen || typeof fen !== "string") {
    return { ok: false, error: "Invalid FEN input." };
  }

  return performAnalysis("stockfish", fen, depth, multiPv);
});

function normalizeEvaluation(score: any, engineType = "stockfish"): any {
  if (!score || (!score.type && score.winProb === undefined)) {
    return { description: "unknown", raw: score, confidence: "low" };
  }

  if (score.type === "cp") {
    const cp = score.value;
    const abs = Math.abs(cp);
    let description;
    if (abs < 50) description = "roughly equal";
    else if (abs < 200) description = cp > 0 ? "white slightly better" : "black slightly better";
    else if (abs < 500) description = cp > 0 ? "white is better" : "black is better";
    else if (abs < 1000) description = cp > 0 ? "white is clearly better" : "black is clearly better";
    else description = cp > 0 ? "white is winning" : "black is winning";
    return {
      description,
      cpValue: cp,
      type: "centipawn",
      confidence: score.depth ? (score.depth >= 20 ? "high" : "medium") : "low"
    };
  } else if (score.type === "mate") {
    const mateIn = score.value;
    const description = mateIn > 0 ? `white mates in ${mateIn}` : `black mates in ${Math.abs(mateIn)}`;
    return { description, mateValue: mateIn, type: "mate", confidence: "high" };
  }

  if (score.winProb !== undefined) {
    const winProb = score.winProb;
    let description;
    if (winProb > 0.95) description = "white is winning";
    else if (winProb > 0.75) description = "white is clearly better";
    else if (winProb > 0.6) description = "white is better";
    else if (winProb > 0.55) description = "white slightly better";
    else if (winProb > 0.45) description = "roughly equal";
    else if (winProb > 0.4) description = "black slightly better";
    else if (winProb > 0.25) description = "black is better";
    else if (winProb > 0.05) description = "black is clearly better";
    else description = "black is winning";

    const confidence = score.depth ? (score.depth >= 20 ? "high" : "medium") : "low";
    return {
      description,
      winProbValue: (winProb * 100).toFixed(1) + "%",
      type: "win_probability",
      confidence
    };
  }

  return { description: "unknown", raw: score, confidence: "low" };
}

function getLlmToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema?: { type: string; properties: Record<string, any>; required?: string[] };
}> {
  return [
    {
      name: "validate_move",
      description:
        "Validates whether a move is legal in the current chess position. Returns true if the move is legal, false otherwise.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source square in algebraic notation (e.g., 'e2')" },
          to: { type: "string", description: "Destination square in algebraic notation (e.g., 'e4')" }
        },
        required: ["from", "to"]
      }
    },
    {
      name: "apply_move",
      description:
        "Applies a move to the board and returns the new position FEN. Use this after validating a move with validate_move.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source square in algebraic notation (e.g., 'e2')" },
          to: { type: "string", description: "Destination square in algebraic notation (e.g., 'e4')" }
        },
        required: ["from", "to"]
      }
    },
    {
      name: "get_board_fen",
      description: "Returns the current board position in FEN notation.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_legal_moves",
      description: "Returns a list of all legal moves in the current position in algebraic notation.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "analyze_position",
      description:
        "Analyzes a chess position using the engine. Returns the best continuation and evaluation. Can analyze any position by providing a FEN.",
      inputSchema: {
        type: "object",
        properties: {
          fen: { type: "string", description: "Position FEN (optional, uses current position if not provided)" },
          depth: { type: "number", description: "Analysis depth (optional, uses settings default if not provided)" }
        },
        required: []
      }
    }
  ];
}

async function executeTool(toolName: string, args: Record<string, any>): Promise<string> {
  console.log(`[Tool] Executing: ${toolName} | args: ${JSON.stringify(args)}`);

  try {
    let result: any;
    switch (toolName) {
      case "validate_move":
        result = boardManager.validateMove(args.from, args.to);
        break;
      case "apply_move":
        result = boardManager.applyMove(args.from, args.to);
        break;
      case "get_board_fen":
        result = { fen: boardManager.getBoardFen() };
        break;
      case "get_legal_moves":
        result = { moves: boardManager.getLegalMoves() };
        break;
      case "analyze_position":
        try {
          const analysisResult = await performAnalysis(
            "stockfish",
            args.fen || boardManager.getBoardFen(),
            args.depth || (settings.get("analysisDepth") as number) || 16,
            4
          );
          result = analysisResult;
        } catch (err) {
          result = { ok: false, error: (err as Error).message };
        }
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    console.log(`[Tool] ✓ Executed: ${toolName}`);
    return JSON.stringify(result);
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`[Tool] ✗ Execution failed: ${toolName} | ${errorMsg}`);
    return JSON.stringify({ error: errorMsg, ok: false });
  }
}

function buildPrompt(params: {
  language: string;
  fen?: string;
  line?: any;
  lines?: any[];
  question?: string;
  userMessage?: string;
  systemPrompt?: string;
}): Array<{ role: string; content: string }> {
  const { language, fen, line, lines = [], question, userMessage, systemPrompt } = params;
  const notationGuide =
    "Notation Guide:\n" +
    "- Algebraic notation: e2-e4 means a pawn moves from e2 to e4\n" +
    "- Piece abbreviations: N=knight, B=bishop, R=rook, Q=queen, K=king, P=pawn (sometimes omitted)\n" +
    "- Captures: xd5 means 'captures on d5' (e.g., Bxd5 = bishop captures on d5)\n" +
    "- Special moves: 0-0 = kingside castling, 0-0-0 = queenside castling\n" +
    "- Checks and checkmate: + indicates check, # indicates checkmate\n" +
    "- Promotions: =Q means promotion to queen (e.g., e8=Q)";

  const toolDefinitions = getLlmToolDefinitions();
  const toolsInfo = `
Available Chess Analysis Tools:
You have access to the following tools to interact with the chess board:

${toolDefinitions.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}

Instructions for using tools:
1. When asked about hypothetical moves (e.g., "what if I move e5?"), use validate_move to check legality
2. If the move is legal, use apply_move to apply it and get_board_fen to see the new position
3. Use analyze_position to get engine analysis of any position
4. Format tool calls as: TOOL_NAME(param1="value1", param2="value2")

Example: If user asks "what if I move e2 to e4?":
1. validate_move(from="e2", to="e4")  → checks if legal
2. If valid: apply_move(from="e2", to="e4")  → applies move, returns new FEN
3. analyze_position(fen="<new-fen>")  → analyzes the resulting position

Always validate moves before applying them.
`;

  const defaultSystemPrompt = [
    "You are a chess grandmaster analyzing positions with expert-level insight.",
    "Use deep strategic and tactical understanding to explain positions, evaluate moves, and compare analysis lines.",
    "Your role is to help club-level players understand the ideas behind moves, not to act as a computer engine.",
    "",
    "Response Format (IMPORTANT):",
    "- Use Markdown formatting with headers, bullet points, and bold text",
    "- Use ### headers for each line (### Line 1: e2-e4)",
    "- Use **bold** for section headers (**Strategic Plans:**, **Threats:**, etc.)",
    "- Use bullet points (- or •) for each distinct point",
    "- Each bullet point should be 1-2 lines maximum - concise and specific",
    "- Never use long paragraphs",
    "- Each section should have multiple bullet points, not paragraphs",
    "",
    "Engine-Provided Analysis:",
    "The chess engine has already analyzed the position and provided the top lines.",
    "Your job is to EXPLAIN these engine-provided lines - why they are strong, what ideas they contain, and how they compare.",
    "Do NOT suggest alternative moves or lines - the engine analysis is the source of truth for move suggestions.",
    "When the user asks about moves, explain why the engine-recommended lines are best.",
    "For each line, always provide: Strategic Plans, Attacking & Defensive Resources, Tactical Threats & Forcing Moves, Key Continuations, and Comparison",
    "",
    "Piece Notation:",
    "Always use piece glyphs and algebraic notation in your analysis:",
    "- White pieces: ♔ (king) ♕ (queen) ♖ (rook) ♗ (bishop) ♘ (knight) ♙ (pawn)",
    "- Black pieces: ♚ (king) ♛ (queen) ♜ (rook) ♝ (bishop) ♞ (knight) ♟ (pawn)",
    "- Use algebraic notation: Ne4 (knight to e4), Bxd5 (bishop captures d5), 0-0 (castling kingside)",
    "- Never write out piece names in words like 'knight' or 'bishop' - always use glyphs",
    "- Example: Instead of 'the knight moves to e4', write: ♘e4 or Ne4 with context",
    "",
    "Engine Output Format:",
    "You will receive analysis from chess engines (Stockfish or LC0) in the following format:",
    "- Evaluations show position advantage: 'white is winning' means white has a winning advantage",
    "- Depth indicates search depth (higher depth = more confidence in the evaluation)",
    "- Lines are ranked by strength: Line 1 is the best continuation, Line 2 is the second-best, etc.",
    "- Centipawn (cp) evaluations: +100 cp means white is better by about one pawn; negative values favor black",
    "- Win probability from neural networks: 75% means the neural net expects white to win 75% of the time from random play",
    "",
    "When analyzing multiple lines, compare them strategically using a numbered list format:",
    "1. Line 1: Explain why it's superior (better position, safer, clearer advantage)",
    "2. Line 2: Highlight key differences from Line 1 (different plans, pawn structures, piece activity)",
    "3. Line 3: (if discussing) Key tactical/strategic differences",
    "4. Line 4: (if discussing) Position assessment and viability",
    "Focus on concrete ideas and tactical motifs, not abstract concepts.",
    "",
    "For move-by-move explanations: break down the line move by move, explaining each move's:",
    "- Tactical purpose (captures, attacks, defensive moves) using algebraic notation",
    "- Strategic goal (improving position, activating pieces, controlling key squares)",
    "- Relationship to the overall plan",
    "",
    "For Puzzles and Positions:",
    "- Always include which side (White or Black) should move first",
    "- This must be explicitly stated in the response",
    "- Include this in the FEN notation in the 'side to move' field",
    "",
    "Always use tactical and strategic chess terminology with glyphs and algebraic notation.",
    "Avoid mentioning being an AI or computer algorithm.",
    "Keep the tone practical, focused on ideas, and suitable for club-level understanding.",
    "",
    toolsInfo,
    "",
    notationGuide
  ].join("\n");

  const systemContent = systemPrompt || `${defaultSystemPrompt}\nLanguage: ${language}`;
  const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemContent }];

  // Add chess engine analysis as an assistant message if lines are available
  if (lines.length > 0) {
    const engineAnalysis = lines
      .map((l: any) => {
        const evaluation = normalizeEvaluation(l.score);
        const lineNum = l.rank || "?";
        const pv = l.pv || l.line || "";
        return `Line ${lineNum}: ${evaluation.description}${pv ? ` (${pv})` : ""}`;
      })
      .join("\n");

    const assistantContent = `Chess Engine Analysis:\n${engineAnalysis}`;
    messages.push({ role: "assistant", content: assistantContent });
  }

  let userContent = "";

  if (userMessage) {
    userContent = userMessage;
  } else {
    if (lines.length > 0) {
      // When analyzing lines, ask for detailed strategic and tactical analysis in Markdown format
      userContent = `Analyze each line using Markdown bullet points with this structure:

**Strategic Plans:**
- White's objective: [specific goal]
- Black's response: [counter-strategy]

**Attacking & Defensive Resources:**
- White's options: [specific moves/ideas]
- Black's resources: [specific moves/ideas]

**Tactical Threats & Forcing Moves:**
- Immediate threats: [checks, captures, pins]
- Forcing sequences: [critical moves]
- Material risk: [vulnerable pieces]

**Position Assessment:**
- Evaluation after this line: [who stands better and why]

Language: ${language}
Position FEN: ${fen || "unknown"}
${question ? `User question: ${question}` : ""}

Use bullet points (- or •), bold headers (**text**), and keep each point concise (1-2 lines max).`;
    } else {
      const instructions = [
        "You are a practical chess coach for club-level players.",
        "Respond only in chess-focused terms; do not mention being an AI or include general commentary about AI.",
        "Assess the risks for both sides and propose a plan of attack for the player to move next.",
        "Keep the tone concise and actionable (bulleted points are welcome)."
      ];
      const context = [
        `Language: ${language}`,
        `Position FEN: ${fen || "unknown"}`
      ];

      if (question) {
        context.push(`Player question: ${question}`);
      }

      userContent = [...instructions, ...context].filter(Boolean).join("\n");
    }
  }

  messages.push({ role: "user", content: userContent });
  return messages;
}

async function runLlmChat(params: {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
  includeTools?: boolean;
}): Promise<string> {
  // Use shorter timeout for Ollama (it's usually fast), longer for cloud providers
  const defaultTimeout = params.provider === "ollama" ? 60000 : 120000;
  const { provider, baseUrl, model, apiKey, messages, timeoutMs = defaultTimeout, includeTools = true } = params;

  // Validate required fields
  if (!provider || !model?.trim() || !baseUrl?.trim()) {
    throw new Error(`Invalid LLM configuration: provider=${provider}, model=${model}, baseUrl=${baseUrl}`);
  }

  if (!messages || messages.length === 0) {
    throw new Error("No messages provided for LLM chat");
  }

  // Validate model matches provider
  if (!isModelRelevantForProvider(provider, model)) {
    const validModels = VALID_MODELS_BY_PROVIDER[provider] || [];
    throw new Error(`Model "${model}" is not valid for provider "${provider}". Expected one of: ${validModels.join(", ") || "unknown"}`);
  }

  // Validate API key for non-Ollama providers
  if (provider !== "ollama" && (!apiKey || !apiKey.trim())) {
    throw new Error(`API key is required for ${provider} provider`);
  }

  const estimatedTokens = estimateContextTokens(messages);
  const contextTruncated = truncateContextIfNeeded(messages, 6000);

  console.log(`[LLM] Chat request started | Provider: ${provider} | Model: ${model} | Tokens: ~${estimatedTokens}`);

  if (contextTruncated) {
    processManager?.recordOllamaLog?.({
      text: `LLM context truncated (was ~${estimatedTokens} tokens). Sending simplified request.`,
      stream: "stdout",
      source: "chat",
      model
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    processManager?.recordOllamaLog?.({
      text: `LLM request: ${provider}/${model} (~${estimatedTokens} tokens, timeout ${timeoutMs}ms)`,
      stream: "stdout",
      source: "chat",
      model
    });

    let result: string;
    if (provider === "ollama") {
      result = await runOllamaChatInternal(baseUrl, model, messages, controller.signal);
    } else if (provider === "openai" || provider === "grok") {
      result = await runOpenAICompatibleChat(provider, baseUrl, model, apiKey, messages, controller.signal, includeTools);
    } else if (provider === "anthropic") {
      result = await runAnthropicChat(baseUrl, model, apiKey, messages, controller.signal, includeTools);
    } else if (provider === "gemini") {
      result = await runGeminiChat(baseUrl, model, apiKey, messages, controller.signal);
    } else {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
    console.log(`[LLM] ✓ Chat request completed | Provider: ${provider} | Model: ${model} | Response length: ${result.length}`);
    return result;
  } catch (err) {
    if ((err as any).name === "AbortError") {
      console.error(`[LLM] ✗ Chat request timed out (${timeoutMs}ms) | Provider: ${provider}`);
      processManager?.recordOllamaLog?.({
        text: `LLM request timed out after ${timeoutMs}ms.`,
        stream: "stderr",
        source: "chat",
        model
      });
      throw new Error(`LLM request timed out (${timeoutMs}ms).`);
    }
    console.error(`[LLM] ✗ Chat request failed | Provider: ${provider} | Error: ${(err as Error).message}`);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runOllamaChatInternal(baseUrl: string, model: string, messages: Array<{ role: string; content: string }>, signal: AbortSignal): Promise<string> {
  const response = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, messages }),
    signal
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as any;
  return String(data?.message?.content || "").trim();
}

async function runOpenAICompatibleChat(provider: string, baseUrl: string, model: string, apiKey: string | undefined, messages: Array<{ role: string; content: string }>, signal: AbortSignal, includeTools: boolean = true): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const conversationMessages = [...messages];
  let finalResponse = "";

  // Tool calling loop - handle up to 3 rounds of tool calls
  for (let round = 0; round < 3; round++) {
    const requestBody: Record<string, any> = { model, messages: conversationMessages };

    if (includeTools) {
      const toolDefs = getLlmToolDefinitions();
      requestBody.tools = toolDefs.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema || { type: "object", properties: {} }
        }
      }));
      requestBody.tool_choice = "auto";
    }

    // Both Grok and OpenAI use the OpenAI-compatible /chat/completions endpoint
    const endpoint = `${baseUrl}/chat/completions`;

    console.log(`[LLM] HTTP Request Details:`, {
      provider,
      endpoint,
      method: "POST",
      headers: {
        "Content-Type": headers["Content-Type"],
        "Authorization": headers["Authorization"] ? "Bearer [REDACTED]" : "none"
      },
      bodyKeys: Object.keys(requestBody)
    });

    const requestBodyString = JSON.stringify(requestBody);
    console.log(`[LLM] Request body (first 500 chars):`, requestBodyString.substring(0, 500));

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: requestBodyString,
      signal
    });

    const responseText = await response.text();
    console.log(`[LLM] HTTP Response:`, {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      bodyPreview: responseText.substring(0, 500)
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText) as any;
    const message = data?.choices?.[0]?.message;
    finalResponse = message?.content || "";

    // Check for tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log(`[LLM] Tool calls detected: ${message.tool_calls.length}`);

      // Add assistant message with tool calls
      conversationMessages.push({
        role: "assistant",
        content: finalResponse,
        tool_calls: message.tool_calls
      } as any);

      // Execute tools and collect results
      const toolResults = [];
      for (const toolCall of message.tool_calls) {
        const toolResult = await executeTool(toolCall.function.name, toolCall.function.arguments || {});
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: toolResult
        });
      }

      // Add tool results to conversation
      conversationMessages.push({
        role: "user",
        content: JSON.stringify(toolResults)
      });
    } else {
      // No tool calls, return the response
      break;
    }
  }

  return finalResponse;
}

async function runAnthropicChat(baseUrl: string, model: string, apiKey: string | undefined, messages: Array<{ role: string; content: string }>, signal: AbortSignal, includeTools: boolean = true): Promise<string> {
  if (!apiKey) {
    throw new Error("Anthropic API requires an API key.");
  }

  // Extract system message from messages array
  const systemMessage = messages.find(m => m.role === "system")?.content || "";
  const conversationMessages = messages.filter(m => m.role !== "system").map(m => ({ ...m }));

  let finalResponse = "";

  // Tool calling loop - handle up to 3 rounds of tool calls
  for (let round = 0; round < 3; round++) {
    const requestBody: Record<string, any> = {
      model,
      max_tokens: 4096,
      ...(systemMessage && { system: systemMessage }),
      messages: conversationMessages
    };

    if (includeTools) {
      const toolDefs = getLlmToolDefinitions();
      requestBody.tools = toolDefs.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema || { type: "object", properties: {} }
      }));
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Anthropic request failed (${response.status}): ${text}`);
    }

    const data = await response.json() as any;

    // Check for tool use blocks
    const hasToolUse = data?.content?.some((block: any) => block.type === "tool_use");

    if (hasToolUse) {
      console.log(`[LLM] Tool calls detected in Anthropic response`);

      // Add assistant message to conversation
      conversationMessages.push({
        role: "assistant",
        content: JSON.stringify(data.content)
      });

      // Execute tools and collect results
      const toolResults = [];
      for (const block of data.content) {
        if (block.type === "tool_use") {
          const toolResult = await executeTool(block.name, block.input || {});
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: toolResult
          });
        } else if (block.type === "text") {
          finalResponse = block.text;
        }
      }

      // Add tool results to conversation
      conversationMessages.push({
        role: "user",
        content: JSON.stringify(toolResults)
      });
    } else {
      // No tool calls, extract text and return
      for (const block of data?.content || []) {
        if (block.type === "text") {
          finalResponse = block.text;
          break;
        }
      }
      break;
    }
  }

  return finalResponse;
}

async function runGeminiChat(baseUrl: string, model: string, apiKey: string | undefined, messages: Array<{ role: string; content: string }>, signal: AbortSignal): Promise<string> {
  if (!apiKey) {
    throw new Error("Gemini API requires an API key.");
  }

  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== "system") // Gemini doesn't support system role in the same way
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages.find(m => m.role === "system")?.content;

  const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(systemInstruction && { system_instruction: { parts: [{ text: systemInstruction }] } }),
      contents
    }),
    signal
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as any;
  return String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

ipcMain.handle("ollama:explain-lines", async (_event, payload) => {
  const lines = Array.isArray(payload?.lines) ? payload.lines.slice(0, 4) : [];
  const fen = payload?.fen || "";
  const language = payload?.language || settings.get("explainLanguage") || "English";
  const llmProvider = payload?.llmProvider || settings.get("llmProvider") || "ollama";
  const llmApiKey = payload?.llmApiKey || settings.get("llmApiKey") || "";

  // Get the correct model from settings based on provider, or use payload override
  let model = payload?.model;
  if (!model) {
    if (llmProvider === "ollama") {
      model = settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
    } else {
      model = settings.get("llmModel") || getModelForProvider(llmProvider);
    }
  }

  const baseUrl = (payload?.baseUrl || (llmProvider === "ollama" ? settings.get("ollamaBaseUrl") : null) || PROVIDER_ENDPOINTS[llmProvider] || "http://localhost:11434/api").replace(/\/$/, "");

  if (!lines.length) {
    return { ok: true, explanations: [] };
  }

  console.log(`[LLM] Explaining ${lines.length} lines | Provider: ${llmProvider} | Model: ${model} | Language: ${language}`);

  try {
    const explanations = await Promise.all(
      lines.map(async (line: any) => {
        // Build messages with conversation history for context
        let messages = buildPrompt({ language, fen, line, lines: [line] });

        // Optionally include recent conversation history for context (if available)
        if (Array.isArray(payload?.conversationHistory) && payload.conversationHistory.length > 0) {
          const systemMsg = messages[0];
          const userMsg = messages[messages.length - 1];

          // Rebuild with conversation history
          messages = [systemMsg];

          // Add last 2 exchanges from conversation history for context
          const recentHistory = payload.conversationHistory.slice(-4);
          for (const entry of recentHistory) {
            messages.push({
              role: entry.role === "user" ? "user" : "assistant",
              content: entry.message
            });
          }

          // Add the current line analysis request
          messages.push(userMsg);
        }

        const text = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
        return {
          rank: line.rank,
          text: text || `No explanation returned for line ${line.rank}.`
        };
      })
    );
    console.log(`[LLM] ✓ Explained ${explanations.length} lines successfully`);
    return { ok: true, explanations };
  } catch (err) {
    const errorMsg = (err as Error)?.message || "LLM explanation failed.";
    console.error(`[LLM] ✗ Explanation failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
});

// Classification endpoint - Two-pass processing: PASS 1 - Classify request type
ipcMain.handle("ollama:classify-question", async (_event, payload) => {
  const question = String(payload?.question || "").trim();
  if (!question) {
    return { ok: false, error: "Question is empty." };
  }

  const llmProvider = payload?.llmProvider || settings.get("llmProvider") || "ollama";
  const llmApiKey = payload?.llmApiKey || settings.get("llmApiKey") || "";
  let model = payload?.model;
  if (!model) {
    if (llmProvider === "ollama") {
      model = settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
    } else {
      model = settings.get("llmModel") || getModelForProvider(llmProvider);
    }
  }
  const baseUrl = (payload?.baseUrl || (llmProvider === "ollama" ? settings.get("ollamaBaseUrl") : null) || PROVIDER_ENDPOINTS[llmProvider] || "http://localhost:11434/api").replace(/\/$/, "");

  const classificationPrompt = [
    {
      role: "system",
      content: `You are a chess request classifier. Classify the user's request into ONE category and respond with ONLY the category name.

Categories:
- ANALYSIS: User asks to analyze current position, best moves, evaluate lines, tactical analysis
- PUZZLE: User asks to create/generate a chess puzzle, tactical problem, or chess challenge
- POSITION: User asks to create/generate a random chess position or specific position type
- HISTORIC_GAME: User asks about famous/historic chess games from databases like Lichess
- LOCAL_GAMES: User asks about their own stored chess games locally
- OTHER: Anything else not chess-related

Respond with ONLY the category name, nothing else.`
    },
    {
      role: "user",
      content: question
    }
  ];

  try {
    const classification = await runLlmChat({
      provider: llmProvider,
      baseUrl,
      model,
      apiKey: llmApiKey,
      messages: classificationPrompt,
      timeoutMs: 30000
    });

    const type = classification.trim().toUpperCase() as "ANALYSIS" | "PUZZLE" | "POSITION" | "HISTORIC_GAME" | "LOCAL_GAMES" | "OTHER";
    const validTypes = ["ANALYSIS", "PUZZLE", "POSITION", "HISTORIC_GAME", "LOCAL_GAMES", "OTHER"];
    const responseType = validTypes.includes(type) ? type : "OTHER";

    console.log(`[LLM] PASS 1 - Classification: "${question.substring(0, 60)}..." → ${responseType}`);
    return { ok: true, type: responseType };
  } catch (err) {
    console.error(`[LLM] Classification failed: ${(err as Error).message}`);
    return { ok: false, error: (err as Error).message || "Classification failed." };
  }
});

// ============================================================================
// Two-Pass Request Handler Helper Functions
// ============================================================================

async function handleAnalysisRequest(question: string, fen: string, lines: AnalysisLine[], payload: any, llmProvider: string, llmApiKey: string, model: string, baseUrl: string): Promise<{ ok: boolean; answer?: string; error?: string; linesUsed?: number }> {
  console.log(`[LLM] PASS 2: ANALYSIS - Running engine analysis for FEN`);

  let analysisLines = lines;

  // Run engine analysis if no lines provided
  if (fen && !analysisLines.length) {
    const cachedLines = getCachedAnalysis(fen);
    if (cachedLines) {
      analysisLines = cachedLines;
      console.log(`[LLM] Using cached analysis for FEN`);
    } else {
      try {
        const engineType = payload?.engine || settings.get("selectedEngine") || "stockfish";
        const depth = Math.max(6, Math.min(30, Number(payload?.depth || settings.get("analysisDepth") || 16)));
        console.log(`[LLM] Running ${engineType.toUpperCase()} analysis (depth ${depth})`);

        const analysisResult = await performAnalysis(engineType, fen, depth, 2);
        if (analysisResult?.ok && analysisResult?.analysis?.lines) {
          analysisLines = analysisResult.analysis.lines.slice(0, 2);
          updateAnalysisCache(fen, analysisLines);
          console.log(`[LLM] Engine analysis complete: ${analysisLines.length} lines`);
        }
      } catch (err) {
        console.error(`[LLM] Engine analysis failed: ${(err as Error).message}`);
      }
    }
  }

  // Format engine output with engine type info
  const engineType = payload?.engine || settings.get("selectedEngine") || "stockfish";
  const engineAnalysis = analysisLines
    .map((l) => {
      const lineNum = l.rank || "?";
      const pv = l.pv || l.line || "";
      let score = "?";
      if (l.score) {
        const s = l.score as any;
        if (s.type === "cp") {
          score = `${s.value >= 0 ? "+" : ""}${(s.value / 100).toFixed(1)}`;
        } else if (s.type === "mate") {
          score = `M${s.value}`;
        } else if (s.winProb !== undefined) {
          score = `${(s.winProb * 100).toFixed(1)}%`;
        }
      }
      return `Line ${lineNum}: ${pv} (Score: ${score})`;
    })
    .join("\n");

  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `You are a chess expert analyzing positions using ${engineType.toUpperCase()} engine analysis. Analyze each variation independently, providing deep strategic and tactical insights.

## Response Format Requirements:
- Use Markdown formatting with headers, bullet points, and clear structure
- Each line should be a distinct, concise point (not paragraphs)
- Use clear section headers for each analysis section
- Every point should be actionable and specific to the position

## Analysis Structure for Each Line:
For each variation, provide analysis in this exact format:

### Line N: [Move sequence]

**Strategic Plans:**
- White's objective: [specific goal]
- Black's response: [counter-strategy]

**Attacking & Defensive Resources:**
- White's attacking options: [specific moves/ideas]
- Black's defensive resources: [specific moves/ideas]

**Tactical Threats & Forcing Moves:**
- Immediate threats: [checks, captures, pins]
- Forcing sequences: [moves that compel responses]
- Material risk: [which pieces are vulnerable]

**Key Continuations:**
- Critical variation: [moves that matter most]

**Comparison to Other Lines:**
- How this differs: [strategic/tactical differences]

Always use bullet points. Never use long paragraphs. Each point should be 1-2 lines maximum.`
    }
  ];

  // Include conversation history for context
  const conversationHistory = Array.isArray(payload?.conversationHistory) ? payload.conversationHistory : [];
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-8);
    for (const entry of recentHistory) {
      if (entry.role === "user") {
        messages.push({ role: "user", content: entry.message });
      } else {
        messages.push({ role: "assistant", content: entry.message });
      }
    }
  }

  if (analysisLines.length > 0) {
    messages.push({
      role: "assistant",
      content: `I've analyzed this position with ${engineType.toUpperCase()}. Here's what the engine found:\n\n${engineAnalysis}`
    });

    const analysisPrompt = `${question}

For EACH line, provide analysis using Markdown formatting with bullet points.
Engine: ${engineType.toUpperCase()}

IMPORTANT:
- Use Markdown bullet points (- or •)
- Use headers with ### for each line
- Use bold text (**text**) for section headers
- Each bullet point should be concise (1-2 lines max)
- Never use long paragraphs
- Be specific about pieces and squares involved`;

    messages.push({ role: "user", content: analysisPrompt });
  } else {
    messages.push({ role: "user", content: question });
  }

  try {
    // Fan-out: create one agent per analysis line (up to 4 parallely)
    if (analysisLines.length === 0) {
      const answer = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
      console.log(`[LLM] PASS 2: ANALYSIS Complete ✓`);
      return { ok: true, answer: answer || "No response returned.", linesUsed: 0 };
    }

    // Build individual prompts for each line
    const agentPromises = analysisLines.map(async (line, idx) => {
      const agentId = idx + 1;
      const lineLabel = `Line ${line.rank ?? agentId}: ${(line.pv || line.line || "").split(" ").slice(0, 5).join(" ")}`;

      // Push "working" status to UI
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("analysis:agent-progress", {
          agentId,
          lineIndex: idx,
          lineLabel,
          status: "working" as const
        });
      }

      // Build focused system prompt for this agent
      const focusedSystemPrompt = `You are a chess expert analyzing a single variation. Analyze this specific line deeply, providing strategic and tactical insights.

## Response Format Requirements:
- Use Markdown formatting with headers, bullet points, and clear structure
- Each point should be 1-2 lines maximum (no long paragraphs)
- Use clear section headers with ###
- Use bold text (**text**) for section headers
- Be specific about pieces and squares

## Analysis Structure:

**Strategic Plans:**
- White's objective: [specific goal in this line]
- Black's response: [counter-strategy]

**Attacking & Defensive Resources:**
- White's attacking options: [specific moves/ideas]
- Black's defensive resources: [specific moves/ideas]

**Tactical Threats & Forcing Moves:**
- Immediate threats: [checks, captures, pins]
- Forcing sequences: [moves that compel responses]
- Material risk: [which pieces are vulnerable]

**Key Continuations:**
- Critical follow-up moves: [moves that matter most]

Always use bullet points. Be concise and actionable.`;

      // Build focused user prompt for this line
      const lineScore = (() => {
        const s = line.score as any;
        if (!s) return "?";
        if (s.type === "cp") {
          return `${s.value >= 0 ? "+" : ""}${(s.value / 100).toFixed(1)}`;
        } else if (s.type === "mate") {
          return `M${s.value}`;
        } else if (s.winProb !== undefined) {
          return `${(s.winProb * 100).toFixed(1)}%`;
        }
        return "?";
      })();

      const lineMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: focusedSystemPrompt },
        {
          role: "user",
          content: `Analyze this specific line from the chess engine analysis:

Variation: ${line.pv || line.line || "No moves"}
Score: ${lineScore} (${engineType.toUpperCase()})

Question from user: ${question}

Provide detailed analysis of this variation only, using Markdown with bullet points.`
        }
      ];

      try {
        const response = await runLlmChat({
          provider: llmProvider,
          baseUrl,
          model,
          apiKey: llmApiKey,
          messages: lineMessages
        });

        // Push "done" status
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send("analysis:agent-progress", {
            agentId,
            lineIndex: idx,
            lineLabel,
            status: "done" as const,
            response
          });
        }

        console.log(`[LLM] PASS 2: Agent ${agentId} Complete ✓`);
        return { agentId, lineLabel, response };
      } catch (err) {
        const error = (err as Error).message;

        // Push "error" status
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send("analysis:agent-progress", {
            agentId,
            lineIndex: idx,
            lineLabel,
            status: "error" as const,
            error
          });
        }

        console.error(`[LLM] PASS 2: Agent ${agentId} failed: ${error}`);
        throw err;
      }
    });

    // Run all agents in parallel
    const agentResults = await Promise.allSettled(agentPromises);

    // Collate responses
    const collatedParts = agentResults
      .map((result, idx) => {
        if (result.status === "fulfilled") {
          const { lineLabel, response } = result.value;
          return `## ${lineLabel}\n\n${response}`;
        } else {
          return `## Agent ${idx + 1}: Error\n\n⚠️ ${(result as PromiseRejectedResult).reason?.message || "Unknown error"}`;
        }
      });

    const collatedAnswer = collatedParts.join("\n\n---\n\n");
    console.log(`[LLM] PASS 2: ANALYSIS Complete ✓ (${agentResults.length} agents)`);
    return { ok: true, answer: collatedAnswer, linesUsed: analysisLines.length };
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Analysis failed.";
    console.error(`[LLM] PASS 2: ANALYSIS failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

async function handlePuzzleRequest(question: string, payload: any, llmProvider: string, llmApiKey: string, model: string, baseUrl: string): Promise<{ ok: boolean; answer?: string; error?: string }> {
  console.log(`[LLM] PASS 2: PUZZLE - Generating chess puzzle`);

  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `You are a chess puzzle generator. Create a valid chess puzzle in the following JSON format:
{
  "fen": "valid FEN string",
  "side_to_move": "White|Black",
  "solution": "moves leading to solution (e.g., 'e4 e5 g4')",
  "difficulty": "easy|medium|hard",
  "explanation": "detailed solution walkthrough",
  "puzzle_type": "tactical|endgame|positional"
}

Ensure the FEN is valid and can be loaded by chess.js. The puzzle should have a clear solution sequence.`
    },
    {
      role: "user",
      content: question
    }
  ];

  try {
    const puzzleResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });

    // Try to parse JSON from response
    const jsonMatch = puzzleResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[LLM] PASS 2: PUZZLE - No JSON found in response, asking LLM to reformat`);
      messages.push({ role: "assistant", content: puzzleResponse });
      messages.push({
        role: "user",
        content: "Please respond with ONLY the JSON, no markdown or extra text."
      });
      const retryResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
      return { ok: true, answer: retryResponse };
    }

    const puzzleData = JSON.parse(jsonMatch[0]);

    // Validate FEN with chess.js
    try {
      const testChess = new Chess();
      testChess.load(puzzleData.fen);
      console.log(`[LLM] PASS 2: PUZZLE ✓ Generated valid puzzle - Side to move: ${puzzleData.side_to_move}`);
      return { ok: true, answer: JSON.stringify(puzzleData) };
    } catch (fenError) {
      console.warn(`[LLM] PASS 2: PUZZLE - Invalid FEN, asking LLM to fix`);
      messages.push({ role: "assistant", content: puzzleResponse });
      messages.push({
        role: "user",
        content: `The FEN "${puzzleData.fen}" is invalid. Please generate a new valid FEN that can be loaded by chess.js. Respond with the complete corrected JSON.`
      });

      const correctedResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
      const correctedMatch = correctedResponse.match(/\{[\s\S]*\}/);
      if (correctedMatch) {
        const correctedData = JSON.parse(correctedMatch[0]);
        const retestChess = new Chess();
        retestChess.load(correctedData.fen);
        console.log(`[LLM] PASS 2: PUZZLE ✓ Corrected puzzle is valid`);
        return { ok: true, answer: JSON.stringify(correctedData) };
      }
      return { ok: true, answer: correctedResponse };
    }
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Puzzle generation failed.";
    console.error(`[LLM] PASS 2: PUZZLE failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

async function handlePositionRequest(question: string, payload: any, llmProvider: string, llmApiKey: string, model: string, baseUrl: string): Promise<{ ok: boolean; answer?: string; error?: string }> {
  console.log(`[LLM] PASS 2: POSITION - Generating chess position`);

  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `You are a chess position generator. Create a valid chess position in the following JSON format:
{
  "fen": "valid FEN string",
  "side_to_move": "White|Black",
  "position_type": "opening|middlegame|endgame",
  "explanation": "brief description of the position"
}

Ensure the FEN is valid and can be loaded by chess.js. The position should be realistic and interesting.`
    },
    {
      role: "user",
      content: question
    }
  ];

  try {
    const positionResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });

    const jsonMatch = positionResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[LLM] PASS 2: POSITION - No JSON found, asking for reformat`);
      messages.push({ role: "assistant", content: positionResponse });
      messages.push({
        role: "user",
        content: "Please respond with ONLY the JSON, no markdown or extra text."
      });
      const retryResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
      return { ok: true, answer: retryResponse };
    }

    const positionData = JSON.parse(jsonMatch[0]);

    try {
      const testChess = new Chess();
      testChess.load(positionData.fen);
      console.log(`[LLM] PASS 2: POSITION ✓ Generated valid position - Type: ${positionData.position_type}`);
      return { ok: true, answer: JSON.stringify(positionData) };
    } catch (fenError) {
      console.warn(`[LLM] PASS 2: POSITION - Invalid FEN, asking LLM to fix`);
      messages.push({ role: "assistant", content: positionResponse });
      messages.push({
        role: "user",
        content: `The FEN "${positionData.fen}" is invalid. Please generate a new valid FEN. Respond with the complete corrected JSON.`
      });

      const correctedResponse = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
      const correctedMatch = correctedResponse.match(/\{[\s\S]*\}/);
      if (correctedMatch) {
        const correctedData = JSON.parse(correctedMatch[0]);
        const retestChess = new Chess();
        retestChess.load(correctedData.fen);
        console.log(`[LLM] PASS 2: POSITION ✓ Corrected position is valid`);
        return { ok: true, answer: JSON.stringify(correctedData) };
      }
      return { ok: true, answer: correctedResponse };
    }
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Position generation failed.";
    console.error(`[LLM] PASS 2: POSITION failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

async function handleHistoricGameRequest(question: string, payload: any, llmProvider: string, llmApiKey: string, model: string, baseUrl: string): Promise<{ ok: boolean; answer?: string; error?: string }> {
  console.log(`[LLM] PASS 2: HISTORIC_GAME - Searching for famous games`);

  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `You are a chess historian. Help the user find famous chess games. You can suggest games from famous players, tournaments, or openings.

For game information, provide:
- Player names and rating
- Tournament and year
- Opening name
- Game result
- Key moments and brilliant moves

Suggest searching Lichess database at https://lichess.org/games or Chess.com game database.`
    },
    {
      role: "user",
      content: question
    }
  ];

  try {
    const answer = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
    console.log(`[LLM] PASS 2: HISTORIC_GAME ✓`);
    return { ok: true, answer };
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Historic game search failed.";
    console.error(`[LLM] PASS 2: HISTORIC_GAME failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

async function handleLocalGamesRequest(question: string, payload: any, llmProvider: string, llmApiKey: string, model: string, baseUrl: string): Promise<{ ok: boolean; answer?: string; error?: string }> {
  console.log(`[LLM] PASS 2: LOCAL_GAMES - Processing local PGN files`);

  // Get conversation history to check if PGN path was already provided
  const conversationHistory = Array.isArray(payload?.conversationHistory) ? payload.conversationHistory : [];

  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: `You are a chess game analyzer helping users access their local chess game files (PGN format).

If the user hasn't provided a file path:
1. Ask them for the full path to their PGN file or folder
2. Remember this path for the conversation

If the path is provided:
1. Acknowledge the file location
2. Help them search or analyze games from that file
3. Provide game summaries or analysis as requested

Always be helpful in accessing local game data.`
    }
  ];

  // Add conversation history for context
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-8);
    for (const entry of recentHistory) {
      if (entry.role === "user") {
        messages.push({ role: "user", content: entry.message });
      } else {
        messages.push({ role: "assistant", content: entry.message });
      }
    }
  }

  messages.push({ role: "user", content: question });

  try {
    const answer = await runLlmChat({ provider: llmProvider, baseUrl, model, apiKey: llmApiKey, messages });
    console.log(`[LLM] PASS 2: LOCAL_GAMES ✓`);
    return { ok: true, answer };
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Local games processing failed.";
    console.error(`[LLM] PASS 2: LOCAL_GAMES failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

// ============================================================================
// Main Two-Pass Ask Question Handler
// ============================================================================

ipcMain.handle("ollama:ask-question", async (_event, payload) => {
  const question = String(payload?.question || "").trim();
  if (!question) {
    return { ok: false, error: "Question is empty." };
  }

  let fen = String(payload?.fen || "").trim();
  let lines = Array.isArray(payload?.lines) ? payload.lines.slice(0, 4) : [];

  if (!fen && payload?.boardFen) {
    fen = String(payload.boardFen).trim();
  }

  const language = payload?.language || settings.get("explainLanguage") || "English";
  const payloadProvider = payload?.llmProvider?.trim() || null;
  const savedProviderRaw = settings.get("llmProvider");
  const savedProvider = (savedProviderRaw as string)?.trim() || null;

  // Use payload provider if explicitly provided, otherwise use saved settings
  // Don't default to ollama - require explicit configuration
  const llmProvider = payloadProvider || savedProvider || "ollama";
  const llmApiKey = payload?.llmApiKey || settings.get("llmApiKey") || "";

  console.log(`[LLM] Provider selection | Payload: "${payloadProvider}" | Saved (raw): "${savedProviderRaw}" | Saved (trim): "${savedProvider}" | Final: "${llmProvider}"`);

  // Get the correct model based on provider
  let model = payload?.model;
  if (!model) {
    if (llmProvider === "ollama") {
      model = settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
    } else {
      model = settings.get("llmModel") || getModelForProvider(llmProvider);
    }
  }

  const baseUrl = (payload?.baseUrl || (llmProvider === "ollama" ? settings.get("ollamaBaseUrl") : null) || PROVIDER_ENDPOINTS[llmProvider] || "http://localhost:11434/api").replace(/\/$/, "");

  try {
    // PASS 1: Classify the request
    console.log(`[LLM] PASS 1: Classification - Starting | Provider: ${llmProvider} | Model: ${model} | Question: "${question.substring(0, 60)}..."`);

    const classificationMessages = [
      {
        role: "system" as const,
        content: `You are a chess request classifier. Classify the user's request into ONE category and respond with ONLY the category name.

Categories:
- ANALYSIS: User asks to analyze current position, best moves, evaluate lines, tactical analysis
- PUZZLE: User asks to create/generate a chess puzzle or tactical problem
- POSITION: User asks to create/generate a random chess position or specific position type
- HISTORIC_GAME: User asks about famous/historic chess games from databases (Lichess, Chess.com)
- LOCAL_GAMES: User asks about their own stored chess games locally on their machine
- OTHER: Anything else not chess-related

Respond with ONLY the category name, nothing else.`
      },
      {
        role: "user" as const,
        content: question
      }
    ];

    const classification = await runLlmChat({
      provider: llmProvider,
      baseUrl,
      model,
      apiKey: llmApiKey,
      messages: classificationMessages,
      timeoutMs: 30000,
      includeTools: false
    });

    const classified = classification.trim().toUpperCase();
    const validCategories = ["ANALYSIS", "PUZZLE", "POSITION", "HISTORIC_GAME", "LOCAL_GAMES", "OTHER"];
    const requestType = validCategories.includes(classified) ? classified : "ANALYSIS";

    console.log(`[LLM] PASS 1: Classification Result: "${classified}" (${requestType})`);

    // PASS 2: Route to appropriate handler based on classification
    let result;

    switch (requestType) {
      case "PUZZLE":
        result = await handlePuzzleRequest(question, payload, llmProvider, llmApiKey, model, baseUrl);
        break;
      case "POSITION":
        result = await handlePositionRequest(question, payload, llmProvider, llmApiKey, model, baseUrl);
        break;
      case "HISTORIC_GAME":
        result = await handleHistoricGameRequest(question, payload, llmProvider, llmApiKey, model, baseUrl);
        break;
      case "LOCAL_GAMES":
        result = await handleLocalGamesRequest(question, payload, llmProvider, llmApiKey, model, baseUrl);
        break;
      case "ANALYSIS":
      default:
        result = await handleAnalysisRequest(question, fen, lines, payload, llmProvider, llmApiKey, model, baseUrl);
        break;
    }

    if (result.ok) {
      console.log(`[LLM] ✓ Complete (Type: ${requestType}) | Provider: ${llmProvider}`);
    } else {
      console.error(`[LLM] ✗ Failed (Type: ${requestType}) | Error: ${result.error}`);
    }

    return result;
  } catch (err) {
    const errorMsg = (err as Error)?.message || "Question processing failed.";
    console.error(`[LLM] ✗ Two-pass processing failed: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
});

// ============================================================================
// LLM Chess Tools IPC Handlers
// ============================================================================

ipcMain.handle("validateMove", (_event, { from, to }: { from: string; to: string }) => {
  console.log(`[Tool] validateMove | from: ${from} to: ${to}`);
  const result = boardManager.validateMove(from, to);
  return result;
});

ipcMain.handle("applyMove", (_event, { from, to }: { from: string; to: string }) => {
  console.log(`[Tool] applyMove | from: ${from} to: ${to}`);
  const result = boardManager.applyMove(from, to);
  if (result.ok) {
    console.log(`[Tool] ✓ Move applied | new FEN: ${result.fen}`);
  } else {
    console.log(`[Tool] ✗ Move failed | reason: ${result.error}`);
  }
  return result;
});

ipcMain.handle("getBoardFen", () => {
  const fen = boardManager.getBoardFen();
  console.log(`[Tool] getBoardFen | FEN: ${fen}`);
  return { fen };
});

ipcMain.handle("getLegalMoves", () => {
  const moves = boardManager.getLegalMoves();
  console.log(`[Tool] getLegalMoves | count: ${moves.length}`);
  return { moves };
});

ipcMain.handle("analyzeBoardPosition", async (_event, { fen, depth }: { fen?: string; depth?: number }) => {
  const targetFen = fen || boardManager.getBoardFen();
  const analyzeDepth = depth || (settings.get("analysisDepth") as number) || 16;
  console.log(`[Tool] analyzeBoardPosition | FEN: ${targetFen.substring(0, 30)}... | depth: ${analyzeDepth}`);

  try {
    const result = await performAnalysis("stockfish", targetFen, analyzeDepth, 4);
    if (result?.ok) {
      console.log(`[Tool] ✓ Position analyzed | best move: ${result.analysis?.lines[0]?.pv?.split(" ")[0] || "N/A"}`);
    } else {
      console.log(`[Tool] ✗ Analysis failed`);
    }
    return result;
  } catch (err) {
    const errorMsg = (err as Error)?.message || "analysis failed";
    console.error(`[Tool] ✗ Position analysis error: ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
});
}

app.whenReady().then(async () => {
  // Initialize processManager's settings after app is ready
  processManager.initializeFromSettings();
  registerIpcHandlers();
  Menu.setApplicationMenu(null);
  await createWindow();

  try {
    await processManager.init();
  } catch (err) {
    console.error("[electron] ProcessManager init error:", err);
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", async () => {
  await processManager.shutdown();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
