# Chess Engine Refactoring - Complete Architecture

## Overview
Refactor the monolithic `EngineRunner` class in `main.ts` into:
1. **IChessEngine** — Abstract interface (engine-agnostic contract)
2. **StockfishEngine** — Stockfish-specific implementation
3. **LC0Engine** — LC0-specific implementation  
4. **EngineFactory** — Dependency injection & instantiation
5. **ChessLineParser** — UCI output parsing (shared utility)

---

## Architecture Diagram

```
ProcessManager (main.ts)
    ↓
    ├─→ EngineFactory.createEngine(engineName, detectionResult)
    │
    ├─→ IChessEngine (interface)
    │   ├─→ StockfishEngine (impl)
    │   └─→ LC0Engine (impl)
    │
    └─→ IChessEngine.analyze() → AnalysisResult
        ├─→ ChessLineParser.parseInfoLine()
        └─→ ChessLineParser.isBestmoveLine()
```

---

## Before: Monolithic

```typescript
// main.ts - Old way (BAD)
class EngineRunner {
  private engineName: string;

  private _analyzeInternal(params) {
    // 200+ lines of analysis code
    // Stockfish-specific logic mixed with LC0 logic
    // Hard-coded "stockfish" vs "lc0" checks everywhere
    const parseInfo = (line: string) => {
      // UCI parsing logic
      const scoreCp = line.match(/score cp (-?\d+)/);
      const scoreWdl = line.match(/score wdl (\d+) (\d+) (\d+)/);
      // ... 40+ lines of parsing
    };
    
    const onData = (chunk: Buffer) => {
      // Stream processing
      if (this.engineName === "lc0") {
        // LC0-specific timeout
      } else if (this.engineName === "stockfish") {
        // Stockfish-specific timeout
      }
    };
  }
}

const engineRunner = new EngineRunner("stockfish");
await engineRunner.analyze({ fen, depth: 20 });
```

---

## After: Proper Architecture

### Step 1: Instantiate Engine via Factory

```typescript
// main.ts - ProcessManager constructor
import { EngineFactory, EngineDetectionResult } from "./engines/EngineFactory";
import { IChessEngine } from "./engines/IChessEngine";

class ProcessManager {
  private engines: Map<string, IChessEngine> = new Map();
  private currentEngine: IChessEngine | null = null;
  private detectionResult: EngineDetectionResult;

  constructor(detectionResult: EngineDetectionResult) {
    this.detectionResult = detectionResult;
    
    // Instantiate each detected engine
    const available = EngineFactory.getAvailableEngines(detectionResult);
    for (const engineName of available) {
      const engine = EngineFactory.createEngine(engineName, detectionResult);
      engine.onLog((entry) => this.recordEngineLog(entry));
      this.engines.set(engineName, engine);
    }
    
    // Default to first available
    const defaultEngine = EngineFactory.getAvailableEngines(detectionResult)[0];
    this.selectEngine(defaultEngine);
  }

  selectEngine(engineName: string): void {
    const engine = this.engines.get(engineName);
    if (!engine) {
      throw new Error(`Engine ${engineName} not available`);
    }
    this.currentEngine = engine;
  }

  get selectedEngineName(): string {
    return this.currentEngine!.name;
  }
}
```

### Step 2: Use Engine via Interface

```typescript
// main.ts - Engine-agnostic usage
class ProcessManager {
  async analyzePosition(params: { fen: string; depth?: number }): Promise<void> {
    if (!this.currentEngine) {
      throw new Error("No engine selected");
    }

    try {
      // Call through interface - works with ANY engine
      const result = await this.currentEngine.analyze({
        fen: params.fen,
        depth: params.depth || 20
      });

      // Result is standardized, engine-agnostic
      mainWindow?.webContents.send("engine:analysis-result", {
        engine: this.currentEngine.name,
        bestMove: result.bestMove,
        lines: result.lines
      });
    } catch (err) {
      this.emitLog({
        text: `Analysis failed: ${err.message}`,
        stream: "stderr",
        context: "analysis"
      });
    }
  }

  async startEngine(): Promise<void> {
    if (!this.currentEngine) {
      throw new Error("No engine selected");
    }
    
    // Works with any engine
    await this.currentEngine.start();
  }

  async stopEngine(): Promise<void> {
    if (!this.currentEngine) return;
    await this.currentEngine.stop();
  }
}
```

### Step 3: Each Engine Handles Its Own Details

```typescript
// StockfishEngine.ts
export class StockfishEngine implements IChessEngine {
  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    // Stockfish-specific:
    // - Multi-PV support
    // - CP + Mate score parsing
    // - No WDL support
    const parser = new ChessLineParser(this.name, blackToMove, (msg) => this.emitLog(msg));
    
    // ... Stockfish-specific analysis code ...
    this.sendCommand(`setoption name MultiPV value ${multiPv}`);
    this.sendCommand(`go depth ${depth}`);
  }
}

// LC0Engine.ts
export class LC0Engine implements IChessEngine {
  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    // LC0-specific:
    // - WDL score parsing (no CP)
    // - GPU backend management
    // - Longer default timeout
    const parser = new ChessLineParser(this.name, blackToMove, (msg) => this.emitLog(msg));
    
    // ... LC0-specific analysis code ...
    this.sendCommand(`setoption name Backend value ${this.gpuBackend}`);
    this.sendCommand(`go depth ${depth}`);
  }
}
```

---

## Benefits

✅ **Engine-agnostic main code** — No engine-specific conditionals  
✅ **Testable** — Each engine can be tested independently  
✅ **Extensible** — Adding a new engine = implement `IChessEngine`  
✅ **Type-safe** — Interface ensures all engines have same contract  
✅ **Dependency injection** — Main code receives engine, doesn't create it  
✅ **Clean separation** — Engine logic not mixed with process management  
✅ **Reusable parsing** — `ChessLineParser` shared by all engines  

---

## Migration Checklist

- [ ] Create `IChessEngine` interface
- [ ] Extract Stockfish logic → `StockfishEngine` class
- [ ] Extract LC0 logic → `LC0Engine` class
- [ ] Extract parsing → `ChessLineParser` class
- [ ] Create `EngineFactory` for instantiation
- [ ] Update `ProcessManager.constructor()` to use factory
- [ ] Update `ProcessManager.analyzePosition()` to use interface
- [ ] Update IPC handlers to use engine-agnostic interface
- [ ] Remove old `EngineRunner` class
- [ ] Update settings: `selectedEngine` → engine name used with factory
- [ ] Test both Stockfish and LC0 workflows
- [ ] Add unit tests for each engine class

---

## Settings Integration

```typescript
// Before/after settings flow
class ProcessManager {
  initializeFromSettings(settings: AppSettings): void {
    const engineName = settings.selectedEngine || "stockfish";
    
    // OLD: new EngineRunner(engineName)
    // NEW: EngineFactory.createEngine(engineName, this.detectionResult)
    this.selectEngine(engineName);
  }

  settingsChanged(changes: Partial<AppSettings>): void {
    if (changes.selectedEngine) {
      this.selectEngine(changes.selectedEngine);
    }
  }
}
```

---

## Result

**Before:** 1 monolithic `EngineRunner` class with 300+ lines of mixed concerns  
**After:** 
- `IChessEngine` — 50 lines (interface)
- `StockfishEngine` — 200 lines (implementation)
- `LC0Engine` — 200 lines (implementation)  
- `EngineFactory` — 50 lines (injection)
- `ChessLineParser` — 150 lines (shared utility)
- `ProcessManager` — simplified, engine-agnostic

**Total:** Better organized, testable, extensible, maintainable.
