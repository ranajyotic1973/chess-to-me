/**
 * BaseChessEngine - Abstract base class for all chess engines
 * Implements common UCI protocol handling via Template Method pattern
 * Subclasses override only engine-specific methods
 */

import { spawn, ChildProcess } from "child_process";
import { IChessEngine, EngineCapability, AnalysisResult, AnalysisParams, LogEntry } from "./IChessEngine";
import { ChessLineParser } from "../utils/chessLineParser";

const MIN_DEPTH_FOR_STABILITY = 10;

export abstract class BaseChessEngine implements IChessEngine {
  abstract readonly name: string;
  abstract readonly capabilities: EngineCapability;
  abstract readonly version: string;

  protected proc: ChildProcess | null = null;
  protected logCallback: ((entry: LogEntry) => void) | null = null;
  protected enginePath: string;

  constructor(enginePath: string) {
    this.enginePath = enginePath;
  }

  isRunning(): boolean {
    return this.proc !== null && !this.proc.killed;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.proc = spawn(this.enginePath, this.getSpawnArgs(), {
          stdio: ["pipe", "pipe", "pipe"]
        });

        let ready = false;

        const onReady = () => {
          if (ready) return;
          ready = true;

          // Clean up listeners
          if (this.proc?.stdout) this.proc.stdout.off("data", onData);
          if (this.proc?.stderr) this.proc.stderr.off("data", onData);
          this.proc?.off("error", onError);

          this.emitLog({
            text: `${this.name} ${this.version} started successfully`,
            stream: "stdout",
            context: "init"
          });
          resolve();
        };

        const onError = (err: Error) => {
          if (ready) return;
          ready = true;

          // Clean up listeners
          if (this.proc?.stdout) this.proc.stdout.off("data", onData);
          if (this.proc?.stderr) this.proc.stderr.off("data", onData);
          this.proc?.off("error", onError);

          reject(new Error(`Failed to start ${this.name}: ${err.message}`));
        };

        const onData = (chunk: Buffer) => {
          const output = chunk.toString();
          // Log all output for debugging
          if (output.trim()) {
            this.emitLog({
              text: `Init output: ${output}`,
              stream: "stdout",
              context: "init"
            });
          }
          // Consider ready if we see any of these indicators
          if (output.includes("id name") || output.includes("uciok") || output.includes("go")) {
            onReady();
          }
        };

        // Set up data listeners
        this.proc.stdout?.on("data", onData);
        this.proc.stderr?.on("data", onData);  // Also listen to stderr
        this.proc.on("error", onError);

        // Send engine-specific initialization commands
        try {
          this.sendInitCommands();
        } catch (err) {
          onError(err as Error);
          return;
        }

        // Timeout safety - always resolve after timeout
        setTimeout(() => {
          onReady();
        }, this.getInitTimeoutMs());
      } catch (err) {
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.proc || this.proc.killed) return;

    return new Promise((resolve) => {
      try {
        this.sendCommand("quit");
        const timer = setTimeout(() => {
          this.proc?.kill();
          resolve();
        }, 1000);

        this.proc.on("exit", () => {
          clearTimeout(timer);
          this.proc = null;
          resolve();
        });
      } catch (err) {
        this.proc = null;
        resolve();
      }
    });
  }

  sendCommand(command: string): void {
    if (!this.proc || this.proc.killed) {
      throw new Error(`${this.name} process is not running`);
    }
    this.proc.stdin?.write(command + "\n");
  }

  /**
   * Send command directly to stdin (used during initialization when process might not be fully ready)
   */
  protected sendInitCommand(command: string): void {
    if (!this.proc) {
      throw new Error(`${this.name} process not spawned`);
    }
    this.proc.stdin?.write(command + "\n");
  }

  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    if (!this.isRunning()) {
      throw new Error(`${this.name} is not running`);
    }

    const { fen, depth = this.getDefaultDepth(), multiPv = 4 } = params;
    const timeoutMs = params.timeoutMs || this.getDefaultTimeoutMs();

    return new Promise((resolve, reject) => {
      const blackToMove = fen.split(/\s+/)[1] === "b";
      const parser = new ChessLineParser(this.name, blackToMove, (msg) =>
        this.emitLog({ text: msg, stream: "stdout", context: "analysis" })
      );

      let buffer = "";
      let bestMove = "";
      const linesByRank = new Map<number, any>();
      let done = false;
      let maxDepthSeen = 0;
      let timer: NodeJS.Timeout;
      let depthCheckTimer: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(depthCheckTimer);
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

        // Prioritize the line that starts with bestmove
        if (bestMove && lines.length > 0) {
          const bestmoveLineIndex = lines.findIndex(
            (line) => line.pv.split(" ")[0] === bestMove
          );
          if (bestmoveLineIndex > 0) {
            const [bestmoveLine] = lines.splice(bestmoveLineIndex, 1);
            lines.unshift(bestmoveLine);
          }
        }

        this.emitLog({
          text: `Analysis complete: best move ${bestMove}`,
          stream: "stdout",
          context: "analysis"
        });

        resolve({ bestMove, lines });
      };

      const fail = (err: Error) => {
        if (done) return;
        done = true;
        cleanup();
        this.emitLog({
          text: err.message,
          stream: "stderr",
          context: "analysis"
        });
        reject(err);
      };

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const outputLines = buffer.split(/\r?\n/);
        buffer = outputLines.pop() || "";

        for (const line of outputLines) {
          if (!line.trim()) continue;

          this.emitLog({
            text: line,
            stream: "stdout",
            context: "analysis"
          });

          if (ChessLineParser.isInfoLine(line)) {
            const parsed = parser.parseInfoLine(line);
            maxDepthSeen = Math.max(maxDepthSeen, parsed.depth || 0);

            const existing = linesByRank.get(parsed.rank) || { score: null, pv: "" };
            existing.score = parsed.score;
            existing.pv = parsed.pv;
            linesByRank.set(parsed.rank, existing);
          } else if (ChessLineParser.isBestmoveLine(line)) {
            bestMove = ChessLineParser.extractBestMove(line);
            finish();
            return;
          }
        }
      };

      const stopAnalysis = (reason: string) => {
        if (done) return;
        this.emitLog({
          text: `${reason} - stopping analysis`,
          stream: "stdout",
          context: "analysis"
        });
        try {
          this.sendCommand("stop");
        } catch (err) {
          // Already stopped
        }
      };

      const checkDepth = () => {
        if (done || maxDepthSeen < MIN_DEPTH_FOR_STABILITY) {
          depthCheckTimer = setTimeout(checkDepth, 500);
          return;
        }
        stopAnalysis(`Minimum depth (${MIN_DEPTH_FOR_STABILITY}) reached`);
      };

      const onTimeout = () => {
        if (done) return;
        stopAnalysis(`Hard timeout reached (${timeoutMs}ms)`);
      };

      try {
        this.proc!.stdout?.on("data", onData);
        let timer = setTimeout(onTimeout, timeoutMs);
        let depthCheckTimer = setTimeout(checkDepth, 500);

        this.sendCommand("ucinewgame");
        this.sendEngineOptions(multiPv);
        this.sendPositionCommand(fen);
        this.sendAnalysisCommand(depth);
      } catch (err) {
        fail(err as Error);
      }
    });
  }

  onLog(callback: (entry: LogEntry) => void): void {
    this.logCallback = callback;
  }

  dispose(): void {
    this.stop().catch(() => {});
    this.logCallback = null;
  }

  // ============================================================
  // Template Method Hooks - Override in subclasses
  // ============================================================

  /**
   * Get spawn arguments for the engine process
   */
  protected getSpawnArgs(): string[] {
    return [];
  }

  /**
   * Default analysis depth (subclasses can override)
   */
  protected getDefaultDepth(): number {
    return 20;
  }

  /**
   * Default analysis timeout in milliseconds
   */
  protected getDefaultTimeoutMs(): number {
    return 30000;
  }

  /**
   * Initialization timeout in milliseconds
   */
  protected getInitTimeoutMs(): number {
    return 2000;
  }

  /**
   * Send engine-specific initialization commands (called during start())
   * Subclasses should call sendInitCommand() here (not sendCommand)
   * Default: send "uci"
   */
  protected sendInitCommands(): void {
    this.sendInitCommand("uci");
  }

  /**
   * Send engine-specific options before analysis
   */
  protected abstract sendEngineOptions(multiPv: number): void;

  /**
   * Send position command to engine
   */
  protected sendPositionCommand(fen: string): void {
    this.sendCommand(`position fen ${fen}`);
  }

  /**
   * Send analysis/go command to engine
   */
  protected abstract sendAnalysisCommand(depth: number): void;

  // ============================================================
  // Utility Methods
  // ============================================================

  protected emitLog(entry: LogEntry): void {
    // Mirror to terminal so engine activity streams in dev logs
    console.log(`[${this.name}] ${entry.text}`);
    if (this.logCallback) {
      this.logCallback({ ...entry, timestamp: new Date().toISOString() });
    }
  }
}
