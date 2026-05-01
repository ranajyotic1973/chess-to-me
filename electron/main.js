const path = require("node:path");
const fs = require("node:fs");
const { execSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const ElectronStore = require("electron-store");
const { spawn } = require("node:child_process");

const Store = ElectronStore.default || ElectronStore;

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

const ENGINE_VERIFY_TIMEOUT_MS = 5000; // Increased for LC0 neural network loading
const ANALYZE_TIMEOUT_MS = 30000; // Increased for LC0's longer analysis times
const PROCESS_LOG_LIMIT = 400;
const OLLAMA_SERVE_RESTART_MS = 2500;

// Chess piece glyphs for LLM communication
const PIECE_GLYPHS = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", // White
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"  // Black
};

// Cache for recent analysis to avoid redundant engine queries
const analysisCache = {
  fen: null,
  lines: null,
  timestamp: null,
  CACHE_DURATION_MS: 30000 // 30 seconds
};

function updateAnalysisCache(fen, lines) {
  analysisCache.fen = fen;
  analysisCache.lines = lines;
  analysisCache.timestamp = Date.now();
}

function getCachedAnalysis(fen) {
  if (!analysisCache.fen || analysisCache.fen !== fen) {
    return null;
  }
  const elapsed = Date.now() - analysisCache.timestamp;
  if (elapsed > analysisCache.CACHE_DURATION_MS) {
    return null; // Cache expired
  }
  return analysisCache.lines;
}

function detectMoveByMoveRequest(question) {
  // Detect if user is asking for move-by-move explanation
  const keywords = ["move by move", "step by step", "each move", "explain", "break down", "sequence"];
  const lowerQuestion = question.toLowerCase();
  return keywords.some(keyword => lowerQuestion.includes(keyword));
}

function estimateContextTokens(messages) {
  // Rough estimation of token count (1 token ≈ 4 characters average)
  let totalChars = 0;
  messages.forEach(msg => {
    totalChars += (msg.content || "").length;
  });
  return Math.ceil(totalChars / 4);
}

function truncateContextIfNeeded(messages, maxTokens = 6000) {
  // If context exceeds max tokens, truncate analysis lines to reduce size
  const estimatedTokens = estimateContextTokens(messages);
  if (estimatedTokens > maxTokens) {
    const userMsg = messages.find(m => m.role === "user");
    if (userMsg && userMsg.content.includes("Analysis lines")) {
      // Remove line details but keep the question
      const lines = userMsg.content.split("Analysis lines:");
      if (lines.length > 1) {
        userMsg.content = lines[0] + "\n(Analysis lines truncated due to context size)";
      }
    }
    return true; // Context was truncated
  }
  return false; // No truncation needed
}

class EngineRunner {
  constructor(engineName, logCallback) {
    this.engineName = engineName || "stockfish";
    this.proc = null;
    this.path = "";
    this.lineBuffer = "";
    this.pending = Promise.resolve();
    this.logCallback = typeof logCallback === "function" ? logCallback : null;
  }

  setLogCallback(fn) {
    this.logCallback = typeof fn === "function" ? fn : null;
  }

  emitLog(entry) {
    if (typeof this.logCallback !== "function" || !entry) {
      return;
    }
    try {
      this.logCallback(entry);
    } catch {
      // swallow logging errors
    }
  }

  async ensureRunning(enginePath) {
    if (this.proc && this.path === enginePath && !this.proc.killed) {
      return;
    }
    await this.stop();
    await this.start(enginePath);
  }

  start(enginePath) {
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

      const fail = (err) => {
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

      const onError = (err) => fail(err);
      const onExit = () => {
        if (!settled) {
          const msg = isLC0
            ? `${this.engineName} process exited before initialization. Ensure LC0 weights file is installed.`
            : `${this.engineName} process exited before initialization.`;
          fail(new Error(msg));
        }
      };
      const onStderr = (chunk) => {
        this.emitLog({
          text: chunk?.toString?.() || "",
          stream: "stderr",
          context: "uci-init"
        });
      };
      const onData = (chunk) => {
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

  async stop() {
    if (!this.proc) {
      return;
    }
    try {
      this.proc.kill();
    } catch {}
    this.proc = null;
    this.path = "";
  }

  send(command) {
    if (!this.proc || this.proc.killed) {
      throw new Error(`${this.engineName} process is not running.`);
    }
    this.proc.stdin.write(`${command}\n`);
  }

  analyze({ fen, depth = 15, multiPv = 4 }) {
    this.pending = this.pending.then(() => this._analyzeInternal({ fen, depth, multiPv }));
    return this.pending;
  }

  _analyzeInternal({ fen, depth, multiPv }) {
    return new Promise((resolve, reject) => {
      if (!this.proc || this.proc.killed) {
        reject(new Error(`${this.engineName} process is not running.`));
        return;
      }

      let buffer = "";
      let bestMove = "";
      const linesByRank = new Map();
      let done = false;

      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout?.off("data", onData);
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

      const fail = (err) => {
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

      const parseInfo = (line) => {
        // Parse UCI info line - compatible with Stockfish and LC0
        // Format: info [depth <d>] [seldepth <sd>] [multipv <n>] [score cp <x>|score mate <m>] [pv <moves>]
        // LC0 output is slightly different but follows same UCI standard

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

      const onData = (chunk) => {
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

      this.proc.stdout?.on("data", onData);

      const timer = setTimeout(() => {
        fail(new Error(`${this.engineName} analysis timed out.`));
      }, ANALYZE_TIMEOUT_MS);

      try {
        this.send("ucinewgame");

        // Set MultiPV for variant analysis
        const multiPvValue = Math.max(1, Math.min(4, Number(multiPv) || 1));
        this.send(`setoption name MultiPV value ${multiPvValue}`);

        // LC0-specific: configure threads if available
        if (this.engineName.toLowerCase() === "lc0") {
          // LC0 uses CPU cores for parallelization
          // Default is usually fine, but can be configured via options
          // this.send(`setoption name Threads value 4`);
        }

        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      } catch (err) {
        fail(err);
      }
    });
  }
}

class ProcessManager {
  constructor({ settings }) {
    this.settings = settings;
    this.engineRunners = {
      stockfish: new EngineRunner("stockfish"),
      lc0: new EngineRunner("lc0")
    };
    this.currentEngine = null;
    this.logs = {
      stockfish: [],
      ollama: []
    };
    this.ollamaServeProcess = null;
    this.ollamaRunProcess = null;
    this.activeModel = this.normalizeModel(settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL);
    this.lastModelError = "";
    this.serveRestartTimer = null;
    this.serveShuttingDown = false;

    // Set up logging for both engines
    this.engineRunners.stockfish.setLogCallback((entry) => this.recordEngineLog("stockfish", entry));
    this.engineRunners.lc0.setLogCallback((entry) => this.recordEngineLog("lc0", entry));
  }

  get engineRunner() {
    const engineName = this.settings.get("selectedEngine") || "lc0";
    return this.engineRunners[engineName] || this.engineRunners.lc0;
  }

  normalizeModel(value) {
    const normalized = String(value || "").trim();
    return normalized || DEFAULT_OLLAMA_MODEL;
  }

  appendLog(bucket, entry) {
    if (!entry || !this.logs[bucket]) {
      return;
    }
    const normalized = {
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

  recordEngineLog(engineName, entry) {
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

  recordOllamaLog({ text, stream = "stdout", source = "run", model, note }) {
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
        stream,
        context: source,
        model: model || this.activeModel,
        note
      });
    }
  }

  getLogs() {
    return {
      stockfish: [...this.logs.stockfish],
      ollama: [...this.logs.ollama],
      activeModel: this.activeModel,
      lastModelError: this.lastModelError
    };
  }

  getOllamaState() {
    return {
      serveRunning: Boolean(this.ollamaServeProcess),
      runActive: Boolean(this.ollamaRunProcess),
      activeModel: this.activeModel,
      lastModelError: this.lastModelError
    };
  }

  async ensureServeRunning() {
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
        text: `Failed to probe existing Ollama: ${err?.message || "unknown"}`,
        stream: "stderr",
        source: "serve"
      });
    }
    this.startOllamaServe();
  }

  startOllamaServe() {
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

      const emitStream = (streamName) => (chunk) =>
        this.recordOllamaLog({
          text: chunk?.toString?.() || "",
          stream: streamName,
          source: "serve"
        });

      proc.stdout?.on("data", emitStream("stdout"));
      proc.stderr?.on("data", emitStream("stderr"));

      proc.on("error", (err) => {
        this.recordOllamaLog({
          text: `ollama serve error: ${err?.message || "unknown"}`,
          stream: "stderr",
          source: "serve"
        });
      });

      proc.on("exit", (code, signal) => {
        this.recordOllamaLog({
          text: `ollama serve exited (code=${code ?? "?"}, signal=${signal ?? "?"})`,
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
        text: `ollama serve failed to spawn: ${err?.message || "unknown"}`,
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

  stopOllamaServe() {
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

  async stopOllamaRun() {
    if (!this.ollamaRunProcess) {
      return;
    }
    const proc = this.ollamaRunProcess;
    await new Promise((resolve) => {
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

  spawnOllamaRun(model) {
    let proc;
    try {
      proc = spawn("ollama", ["run", model], { windowsHide: true });
    } catch (err) {
      this.recordOllamaLog({
        text: `ollama run ${model} spawn failed: ${err?.message || "unknown"}`,
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

    const emitStream = (streamName) => (chunk) =>
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
        text: `ollama run ${model} error: ${err?.message || "unknown"}`,
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

  async setActiveModel(model, { force = false } = {}) {
    const normalized = this.normalizeModel(model);
    if (!force && normalized === this.activeModel && this.ollamaRunProcess) {
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
      this.lastModelError = err?.message || "Unable to start model.";
      throw err;
    }
  }

  async ensureModelReady() {
    await this.setActiveModel(this.activeModel, { force: true });
  }

  async analyze(payload) {
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

  async init() {
    await this.ensureServeRunning();
    try {
      await this.ensureModelReady();
    } catch (err) {
      this.lastModelError = err?.message || "Model start failed.";
    }
  }

  async shutdown() {
    await this.stopOllamaRun();
    this.stopOllamaServe();
    await this.engineRunner.stop();
  }
}

const processManager = new ProcessManager({ settings });

function isExecutableCandidate(fullPath) {
  try {
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

async function verifyEnginePath(enginePath, engineName = "stockfish") {
  if (!enginePath || !isExecutableCandidate(enginePath)) {
    return false;
  }
  const probe = spawn(enginePath, [], { windowsHide: true });
  return new Promise((resolve) => {
    let buffer = "";
    let done = false;
    const finalize = (ok) => {
      if (done) return;
      done = true;
      try {
        probe.kill();
      } catch {}
      resolve(ok);
    };

    probe.on("error", () => finalize(false));
    probe.on("exit", () => finalize(false));
    probe.stdout?.on("data", (chunk) => {
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

function engineCandidates(engineName) {
  const candidates = [];
  const settingKey = `${engineName}Path`;
  const saved = settings.get(settingKey);
  if (saved) {
    candidates.push(saved);
  }

  const isBinary = engineName.toLowerCase() === "stockfish";
  const execName = process.platform === "win32"
    ? (isBinary ? "stockfish.exe" : "lc0.exe")
    : (isBinary ? "stockfish" : "lc0");

  const binaryPattern = isBinary
    ? /^stockfish([-_].+)?(\.exe)?$/i
    : /^lc0([-_].+)?(\.exe)?$/i;

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
        path.join("C:\\", "Program Files", engineName.charAt(0).toUpperCase() + engineName.slice(1)),
        path.join("C:\\", "Program Files (x86)", engineName.charAt(0).toUpperCase() + engineName.slice(1))
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

  function patternCandidatesFromDir(dirPath) {
    if (!dirPath) return [];
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const results = [];
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

  function commandPathCandidates() {
    try {
      const searchCmd = engineName.toLowerCase();
      const isWin = process.platform === "win32";
      const commands = isWin
        ? [`where ${searchCmd}`, `where ${searchCmd}*`]
        : [`which ${searchCmd}`, `bash -lc "compgen -c | rg '^${searchCmd}' || true"`];
      const all = [];
      for (const cmd of commands) {
        try {
          const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .split(/\r?\n/)
            .map((v) => v.trim())
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
  ].filter((p) => binaryPattern.test(path.basename(p)));

  candidates.push(
    ...bundledCandidates,
    ...cwdCandidates,
    ...osCandidates,
    ...patternCandidates,
    ...commandPathCandidates()
  );

  return [...new Set(candidates)].filter(isExecutableCandidate);
}

async function findWorkingEngine(engineName, persist = false) {
  const candidates = engineCandidates(engineName);
  for (const candidate of candidates) {
    // Verify that it's a UCI engine before accepting.
    // eslint-disable-next-line no-await-in-loop
    const ok = await verifyEnginePath(candidate, engineName);
    if (ok) {
      if (persist) {
        settings.set(`${engineName}Path`, candidate);
      }
      return { path: candidate };
    }
  }
  return { path: "" };
}

async function detectEngine(engineName) {
  const result = await findWorkingEngine(engineName, true);
  if (result.path) {
    return { found: true, path: result.path };
  }
  return { found: false, path: "" };
}

function commandPathCandidates() {
  const isWin = process.platform === "win32";
  try {
    const commands = isWin
      ? ["where stockfish", "where stockfish*"]
      : ["which stockfish", "bash -lc \"compgen -c | rg '^stockfish' || true\""];
    const all = [];
    for (const cmd of commands) {
      try {
        const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
          .toString()
          .split(/\r?\n/)
          .map((v) => v.trim())
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

function patternCandidatesFromDir(dirPath) {
  if (!dirPath) return [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const results = [];
    for (const item of items) {
      if (!item.isFile()) continue;
      const lower = item.name.toLowerCase();
      const startsLikeStockfish = lower.startsWith("stockfish");
      if (!startsLikeStockfish) continue;

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

function stockfishCandidates() {
  const candidates = [];
  const saved = settings.get("stockfishPath");
  if (saved) {
    candidates.push(saved);
  }

  const name = process.platform === "win32" ? "stockfish.exe" : "stockfish";
  const patternRegex = /^stockfish([-_].+)?(\.exe)?$/i;
  const bundledCandidates = [
    path.join(process.resourcesPath || "", "vendor", "stockfish", name),
    path.join(app.getAppPath(), "vendor", "stockfish", name)
  ];
  const cwdDirs = [
    process.cwd(),
    path.join(process.cwd(), "engines"),
    path.join(process.cwd(), "bin")
  ];
  const cwdCandidates = [
    path.join(process.cwd(), name),
    path.join(process.cwd(), "engines", name),
    path.join(process.cwd(), "bin", name)
  ];

  const osDirs =
    process.platform === "win32"
      ? [
          path.join("C:\\", "Program Files", "Stockfish"),
          path.join("C:\\", "Program Files (x86)", "Stockfish")
        ]
      : [path.join("/usr/local/bin"), path.join("/opt/homebrew/bin"), path.join("/usr/bin")];

  const osCandidates =
    process.platform === "win32"
      ? [path.join("C:\\", "Program Files", "Stockfish", name), path.join("C:\\", "Program Files (x86)", "Stockfish", name)]
      : [path.join("/usr/local/bin", name), path.join("/opt/homebrew/bin", name), path.join("/usr/bin", name)];

  const patternCandidates = [
    ...cwdDirs.flatMap((d) => patternCandidatesFromDir(d)),
    ...osDirs.flatMap((d) => patternCandidatesFromDir(d))
  ].filter((p) => patternRegex.test(path.basename(p)));

  candidates.push(...bundledCandidates, ...cwdCandidates, ...osCandidates, ...patternCandidates, ...commandPathCandidates());
  return [...new Set(candidates)].filter(isExecutableCandidate);
}

async function verifyStockfishPath(enginePath) {
  if (!enginePath || !isExecutableCandidate(enginePath)) {
    return false;
  }
  const probe = spawn(enginePath, [], { windowsHide: true });
  return new Promise((resolve) => {
    let buffer = "";
    let done = false;
    const finalize = (ok) => {
      if (done) return;
      done = true;
      try {
        probe.kill();
      } catch {}
      resolve(ok);
    };

    probe.on("error", () => finalize(false));
    probe.on("exit", () => finalize(false));
    probe.stdout?.on("data", (chunk) => {
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

async function detectStockfish() {
  const result = await findWorkingStockfish(true);
  if (result.path) {
    return { found: true, path: result.path };
  }
  return { found: false, path: "" };
}

async function findWorkingStockfish(persist = false) {
  const candidates = stockfishCandidates();
  for (const candidate of candidates) {
    // Verify that it's a UCI engine before accepting.
    // eslint-disable-next-line no-await-in-loop
    const ok = await verifyStockfishPath(candidate);
    if (ok) {
      if (persist) {
        settings.set("stockfishPath", candidate);
      }
      return { path: candidate };
    }
  }
  return { path: "" };
}

async function checkOllamaQwen3() {
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
    const data = await response.json();
    const models =
      Array.isArray(data?.models)
        ? data.models
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

async function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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

// Generic engine detection and browsing
ipcMain.handle("detectEngine", async (_event, { engine }) => {
  return detectEngine(engine || "stockfish");
});

ipcMain.handle("browseForEngine", async (_event, { engine }) => {
  const engineName = (engine || "stockfish").toLowerCase();
  const titleMap = {
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

ipcMain.handle("app:open-external", async (_event, url) => {
  if (!url || typeof url !== "string") {
    return { ok: false };
  }
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("app:system-check", async () => {
  const [ollama, stockfish, lc0] = await Promise.all([
    checkOllamaQwen3(),
    findWorkingEngine("stockfish", false),
    findWorkingEngine("lc0", false)
  ]);
  const processState = processManager.getOllamaState();
  return {
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
    return { ok: false, error: err?.message || "Failed to start Ollama model." };
  }
});

ipcMain.handle("analyzePosition", async (_event, payload) => {
  const { engine, fen, depth, multiPv } = payload || {};
  if (!fen || typeof fen !== "string") {
    return { ok: false, error: "Invalid FEN input." };
  }

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
    return { ok: false, error: err?.message || "Engine analysis failed." };
  }
});

// Keep the old stockfish:analyze handler for backward compatibility
ipcMain.handle("stockfish:analyze", async (_event, payload) => {
  return ipcMain.invoke("analyzePosition", { ...payload, engine: "stockfish" });
});

function normalizeEvaluation(score, engineType = "stockfish") {
  if (!score || (!score.type && score.winProb === undefined)) {
    return { description: "unknown", raw: score, confidence: "low" };
  }

  // Stockfish centipawn-based evaluation
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

  // LC0 win probability-based evaluation
  if (score.winProb !== undefined) {
    const winProb = score.winProb; // 0-1 scale
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

function getSquareName(index) {
  // Convert 0x88 index to algebraic notation (a1-h8)
  const file = String.fromCharCode(97 + (index & 7)); // 97 is 'a'
  const rank = String((index >> 4) + 1);
  return file + rank;
}

function getPieceSymbol(piece) {
  const symbols = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  return symbols[piece?.toLowerCase()] || "piece";
}

function uciToReadable(uciMove, fromPosition = null) {
  // Convert UCI move (e.g., "e2e4") to human-readable format
  if (!uciMove || uciMove.length < 4) return uciMove;

  const files = "abcdefgh";
  const fromFile = uciMove[0];
  const fromRank = uciMove[1];
  const toFile = uciMove[2];
  const toRank = uciMove[3];
  const promotion = uciMove[4] ? uciMove[4].toUpperCase() : "";

  // Basic move format
  let readable = `${fromFile}${fromRank}-${toFile}${toRank}`;

  // Handle castling
  if (uciMove === "e1g1" || uciMove === "e8g8") return "0-0 (castling kingside)";
  if (uciMove === "e1c1" || uciMove === "e8c8") return "0-0-0 (castling queenside)";

  // Handle promotion
  if (promotion) {
    readable += ` (promotion to ${promotion})`;
  }

  return readable;
}

function formatMovesWithDescription(pv) {
  // Convert space-separated UCI moves to readable format
  if (!pv) return "";
  const moves = pv.split(" ").filter(Boolean);
  return moves.map((move, idx) => {
    const readable = uciToReadable(move);
    return `${idx + 1}. ${readable}`;
  }).join(" ");
}

function formatLineSummary(line, engineName = "stockfish") {
  const normalized = normalizeEvaluation(line.score, engineName);
  const depthInfo = line.score?.depth ? ` (depth ${line.score.depth})` : "";
  const engineLabel = `(${engineName})`;

  let evalStr = `Evaluation: ${normalized.description}${depthInfo} ${engineLabel}`;

  // Add numeric value if available
  if (normalized.cpValue !== undefined) {
    evalStr += ` [${(normalized.cpValue / 100).toFixed(2)} pawns]`;
  } else if (normalized.winProbValue !== undefined) {
    evalStr += ` [${normalized.winProbValue}]`;
  }

  const movesDesc = formatMovesWithDescription(line.pv);
  const moveStr = movesDesc ? `Moves: ${movesDesc}` : "Moves: (no analysis)";

  return `Line ${line.rank}\n${evalStr}\n${moveStr}`;
}

function buildPrompt({
  language,
  fen,
  line,
  lines = [],
  question,
  userMessage,
  systemPrompt
}) {
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
  const messages = [{ role: "system", content: systemContent }];
  const linesSummary = lines.length ? `Analysis lines:\n${lines.map(formatLineSummary).join("\n")}` : "";
  let userContent = "";

  if (userMessage) {
    userContent = [userMessage, linesSummary].filter(Boolean).join("\n");
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

    if (line) {
      context.push(`Line rank: ${line.rank}`);
      context.push(`Score: ${line.score ? `${line.score.type} ${line.score.value}` : "unknown"}`);
      context.push(`PV moves (UCI): ${line.pv || "none"}`);
    } else if (lines.length) {
      context.push("Analysis lines:");
      context.push(lines.map(formatLineSummary).join("\n"));
    }

    if (question) {
      context.push(`Player question: ${question}`);
    }

    if (!line) {
      context.push("Focus on the position as a whole, highlighting concrete ideas based on the available PVs.");
    }

    userContent = [...instructions, ...context, linesSummary].filter(Boolean).join("\n");
  }

  messages.push({ role: "user", content: userContent });
  return messages;
}

async function runOllamaChat({ baseUrl, model, messages, timeoutMs = 60000 }) {
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

    const data = await response.json();
    const answer = String(data?.message?.content || "").trim();

    processManager?.recordOllamaLog?.({
      text: `LLM response received (${answer.length} chars)`,
      stream: "stdout",
      source: "chat",
      model
    });

    return answer;
  } catch (err) {
    if (err.name === "AbortError") {
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
      lines.map(async (line) => {
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
    return { ok: false, error: err?.message || "Ollama explanation failed." };
  }
});

ipcMain.handle("ollama:ask-question", async (_event, payload) => {
  const question = String(payload?.question || "").trim();
  if (!question) {
    return { ok: false, error: "Question is empty." };
  }

  let fen = String(payload?.fen || "").trim();
  let lines = Array.isArray(payload?.lines) ? payload.lines.slice(0, 4) : [];

  // Auto-fetch FEN from chessboard if not provided
  if (!fen && payload?.boardFen) {
    fen = String(payload.boardFen).trim();
  }

  // Check cache before querying engine
  if (fen && !lines.length) {
    const cachedLines = getCachedAnalysis(fen);
    if (cachedLines) {
      lines = cachedLines;
    }
  }

  // Auto-query engine if no analysis lines provided
  if (fen && !lines.length) {
    try {
      const engineType = payload?.engine || settings.get("selectedEngine") || "stockfish";
      const depth = payload?.depth || settings.get("analysisDepth") || 16;

      // Invoke engine analysis based on type
      const analyzeEvent = engineType === "lc0" ? "lc0:analyze" : "stockfish:analyze";
      const analysisResult = await ipcMain.invoke(analyzeEvent, {
        fen,
        depth,
        multiline: true,
        multipv: 4
      });

      if (analysisResult?.ok && analysisResult?.lines) {
        lines = analysisResult.lines.slice(0, 4);
        updateAnalysisCache(fen, lines);
      }
    } catch (err) {
      // Silently continue without auto-analysis if engine fails
    }
  }

  const language = payload?.language || settings.get("explainLanguage") || "English";
  const model = payload?.model || settings.get("ollamaModel") || "qwen3";
  const baseUrl = (payload?.baseUrl || settings.get("ollamaBaseUrl") || "http://localhost:11434/api").replace(/\/$/, "");
  const isMoveByMove = detectMoveByMoveRequest(question);

  // Build system prompt with move-by-move guidance if detected
  let systemPrompt = payload?.systemPrompt;
  if (isMoveByMove && !systemPrompt) {
    systemPrompt = undefined; // Use default, which includes move-by-move guidance
  }

  try {
    const messages = buildPrompt({
      language,
      fen,
      lines,
      question,
      userMessage: payload?.userMessage,
      systemPrompt
    });
    const answer = await runOllamaChat({ baseUrl, model, messages });
    return { ok: true, answer: answer || "No response returned.", linesUsed: lines.length };
  } catch (err) {
    return { ok: false, error: err?.message || "LLM question failed." };
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
