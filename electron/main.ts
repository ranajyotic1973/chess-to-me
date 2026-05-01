import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import ElectronStore from "electron-store";
import { spawn, ChildProcess } from "node:child_process";
import type { AnalysisLine } from "../src/types";

const Store = ElectronStore as any;

const DEFAULT_OLLAMA_MODEL = "qwen3:8b";

const settings = new Store({
  name: "settings",
  defaults: {
    stockfishPath: "",
    lc0Path: "",
    selectedEngine: "lc0",
    analysisDepth: 16,
    explainLanguage: "English",
    ollamaModel: DEFAULT_OLLAMA_MODEL,
    ollamaBaseUrl: "http://localhost:11434/api"
  }
});

const ENGINE_VERIFY_TIMEOUT_MS = 5000;
const ANALYZE_TIMEOUT_MS = 30000;
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
        this.emitLog({
          text: chunk?.toString?.() || "",
          stream: "stderr",
          context: "uci-init"
        });
      };
      const onData = (chunk: Buffer) => {
        const text = chunk?.toString?.() || "";
        this.emitLog({ text, stream: "stdout", context: "uci-init" });
        buffer += text;
        if (buffer.includes("uciok")) {
          proc.stdin.write("isready\n");
        }
        if (buffer.includes("readyok")) {
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
        const scoreCp = line.match(/score cp (-?\d+)/);
        const scoreMate = line.match(/score mate (-?\d+)/);
        const pv = line.match(/\spv\s(.+)$/);
        const mpvMatch = line.match(/\bmultipv\s(\d+)/);
        const rank = mpvMatch ? Number(mpvMatch[1]) : 1;
        const existing = linesByRank.get(rank) || { score: null, pv: "" };

        if (scoreCp) {
          existing.score = { type: "cp", value: Number(scoreCp[1]) };
        } else if (scoreMate) {
          existing.score = { type: "mate", value: Number(scoreMate[1]) };
        }

        if (pv) {
          existing.pv = pv[1];
        }
        linesByRank.set(rank, existing);
      };

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          this.emitLog({ text: line, stream: "stdout", context: "analysis" });
          if (line.startsWith("info ")) {
            parseInfo(line);
          } else if (line.startsWith("bestmove ")) {
            bestMove = line.split(" ")[1] || "";
            finish();
            return;
          }
        }
      };

      this.proc!.stdout?.on("data", onData);

      const timer = setTimeout(() => {
        fail(new Error(`${this.engineName} analysis timed out.`));
      }, ANALYZE_TIMEOUT_MS);

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
    this.activeModel = this.normalizeModel(settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL);

    this.engineRunners.stockfish.setLogCallback((entry) => this.recordEngineLog("stockfish", entry));
    this.engineRunners.lc0.setLogCallback((entry) => this.recordEngineLog("lc0", entry));
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
      text,
      stream: entry.stream || "stdout",
      context: entry.context || "analysis",
      engine: engineName
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

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1300,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, "preload.ts"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// IPC Handlers
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

  return {
    selectedEngine,
    stockfishPath: stockfishValid ? stockfishPath : "",
    lc0Path: lc0Valid ? lc0Path : "",
    configured: (selectedEngine === "stockfish" && stockfishValid) || (selectedEngine === "lc0" && lc0Valid),
    settings: {
      analysisDepth: Number(settings.get("analysisDepth")) || 16,
      explainLanguage: settings.get("explainLanguage") || "English",
      ollamaModel: settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL,
      ollamaBaseUrl: settings.get("ollamaBaseUrl") || "http://localhost:11434/api"
    }
  };
});

ipcMain.handle("app:update-settings", async (_event, payload) => {
  const nextDepth = Math.max(6, Math.min(30, Number(payload?.analysisDepth) || 16));
  settings.set("analysisDepth", nextDepth);
  settings.set("explainLanguage", payload?.explainLanguage || "English");
  settings.set("ollamaModel", payload?.ollamaModel || DEFAULT_OLLAMA_MODEL);
  settings.set("ollamaBaseUrl", payload?.ollamaBaseUrl || "http://localhost:11434/api");
  settings.set("selectedEngine", payload?.selectedEngine || settings.get("selectedEngine") || "lc0");

  if (payload?.stockfishPath) {
    settings.set("stockfishPath", payload.stockfishPath);
  }
  if (payload?.lc0Path) {
    settings.set("lc0Path", payload.lc0Path);
  }

  try {
    await processManager.setActiveModel(settings.get("ollamaModel"));
  } catch {
    // Already logged in the process manager.
  }

  return {
    ok: true,
    settings: {
      analysisDepth: nextDepth,
      explainLanguage: settings.get("explainLanguage"),
      ollamaModel: settings.get("ollamaModel"),
      ollamaBaseUrl: settings.get("ollamaBaseUrl")
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

  const defaultSystemPrompt = [
    "You are a chess grandmaster analyzing positions with expert-level insight.",
    "Use deep strategic and tactical understanding to explain positions, evaluate moves, and compare analysis lines.",
    "Your role is to help club-level players understand the ideas behind moves, not to act as a computer engine.",
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
    "When analyzing multiple lines, compare them strategically:",
    "- Explain why Line 1 is superior (better position, safer, clearer advantage)",
    "- Highlight key differences between lines (different plans, pawn structures, piece activity)",
    "- Focus on concrete ideas and tactical motifs, not abstract concepts",
    "",
    "For move-by-move explanations: break down the line move by move, explaining each move's:",
    "- Tactical purpose (captures, attacks, defensive moves) using algebraic notation",
    "- Strategic goal (improving position, activating pieces, controlling key squares)",
    "- Relationship to the overall plan",
    "",
    "Always use tactical and strategic chess terminology with glyphs and algebraic notation.",
    "Avoid mentioning being an AI or computer algorithm.",
    "Keep the tone practical, focused on ideas, and suitable for club-level understanding.",
    "",
    notationGuide
  ].join("\n");

  const systemContent = systemPrompt || `${defaultSystemPrompt}\nLanguage: ${language}`;
  const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemContent }];

  let userContent = "";

  if (userMessage) {
    userContent = userMessage;
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

    if (lines.length) {
      context.push("Analysis lines:");
      context.push(lines.map((l: any) => `Line ${l.rank}: ${normalizeEvaluation(l.score).description}`).join("\n"));
    }

    if (question) {
      context.push(`Player question: ${question}`);
    }

    userContent = [...instructions, ...context].filter(Boolean).join("\n");
  }

  messages.push({ role: "user", content: userContent });
  return messages;
}

async function runOllamaChat(params: {
  baseUrl: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
}): Promise<string> {
  const { baseUrl, model, messages, timeoutMs = 60000 } = params;
  const estimatedTokens = estimateContextTokens(messages);
  const contextTruncated = truncateContextIfNeeded(messages, 6000);

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
      text: `LLM request: ${model} (~${estimatedTokens} tokens, timeout ${timeoutMs}ms)`,
      stream: "stdout",
      source: "chat",
      model
    });

    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      processManager?.recordOllamaLog?.({
        text: `LLM request failed (${response.status} ${response.statusText}): ${text}`,
        stream: "stderr",
        source: "chat",
        model
      });
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const answer = String(data?.message?.content || "").trim();

    processManager?.recordOllamaLog?.({
      text: `LLM response received (${answer.length} chars)`,
      stream: "stdout",
      source: "chat",
      model
    });

    return answer;
  } catch (err) {
    if ((err as any).name === "AbortError") {
      processManager?.recordOllamaLog?.({
        text: `LLM request timed out after ${timeoutMs}ms. Check Ollama service health.`,
        stream: "stderr",
        source: "chat",
        model
      });
      throw new Error(`LLM request timed out (${timeoutMs}ms). Ollama may be unresponsive.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

ipcMain.handle("ollama:explain-lines", async (_event, payload) => {
  const lines = Array.isArray(payload?.lines) ? payload.lines.slice(0, 4) : [];
  const fen = payload?.fen || "";
  const language = payload?.language || settings.get("explainLanguage") || "English";
  const model = payload?.model || settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL;
  const baseUrl = (payload?.baseUrl || settings.get("ollamaBaseUrl") || "http://localhost:11434/api").replace(/\/$/, "");

  if (!lines.length) {
    return { ok: true, explanations: [] };
  }

  try {
    const explanations = await Promise.all(
      lines.map(async (line: any) => {
        const messages = buildPrompt({ language, fen, line });
        const text = await runOllamaChat({ baseUrl, model, messages });
        return {
          rank: line.rank,
          text: text || `No explanation returned for line ${line.rank}.`
        };
      })
    );
    return { ok: true, explanations };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || "Ollama explanation failed." };
  }
});

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

  if (fen && !lines.length) {
    const cachedLines = getCachedAnalysis(fen);
    if (cachedLines) {
      lines = cachedLines;
    }
  }

  if (fen && !lines.length) {
    try {
      const engineType = payload?.engine || settings.get("selectedEngine") || "stockfish";
      const depth = payload?.depth || settings.get("analysisDepth") || 16;

      const analysisResult = await performAnalysis(engineType, fen, depth, 4);

      if (analysisResult?.ok && analysisResult?.analysis?.lines) {
        lines = analysisResult.analysis.lines.slice(0, 4);
        updateAnalysisCache(fen, lines);
      }
    } catch (err) {
      // Silently continue without auto-analysis if engine fails
    }
  }

  const language = payload?.language || settings.get("explainLanguage") || "English";
  const model = payload?.model || settings.get("ollamaModel") || "qwen3";
  const baseUrl = (payload?.baseUrl || settings.get("ollamaBaseUrl") || "http://localhost:11434/api").replace(/\/$/, "");

  try {
    const messages = buildPrompt({
      language,
      fen,
      lines,
      question,
      userMessage: payload?.userMessage,
      systemPrompt: payload?.systemPrompt
    });
    const answer = await runOllamaChat({ baseUrl, model, messages });
    return { ok: true, answer: answer || "No response returned.", linesUsed: lines.length };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || "LLM question failed." };
  }
});

app.whenReady().then(async () => {
  await createWindow();
  try {
    await processManager.init();
  } catch (err) {
    // Initialization errors already logged in ProcessManager.
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
