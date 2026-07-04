# Final Architecture - Template Method Pattern

## 🎯 Problem Solved

**Before:** ~200 lines of duplicated analysis code in each engine
**After:** Common code in `BaseChessEngine`, engines are ~30 lines each

---

## Architecture Layers

```
IChessEngine (Interface)
    ↑
    |
BaseChessEngine (Abstract Base - Common Logic)
    ├─→ analyze()              [COMMON - handles all UCI protocol]
    ├─→ start/stop()           [COMMON - process management]
    ├─→ onLog()                [COMMON - logging]
    ├─→ sendCommand()          [COMMON - pipe to engine]
    │
    └─→ [Template Method Hooks - Override in subclasses]
        ├─→ sendEngineOptions()     [ENGINE-SPECIFIC]
        ├─→ sendAnalysisCommand()   [ENGINE-SPECIFIC]
        ├─→ getDefaultDepth()       [ENGINE-SPECIFIC]
        └─→ getDefaultTimeoutMs()   [ENGINE-SPECIFIC]
    ↑
    ├─────────────────────────────────────────┐
    ↑                                         ↑
StockfishEngine                          LC0Engine
(extends BaseChessEngine)                (extends BaseChessEngine)
├─ setOption MultiPV                   ├─ setOption Backend (GPU)
├─ go depth                            ├─ setOption MultiPV
└─ 30s timeout                         └─ 60s timeout
```

---

## Code Comparison

### StockfishEngine - BEFORE (200+ lines)
```typescript
export class StockfishEngine implements IChessEngine {
  readonly name = "Stockfish";
  
  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      const blackToMove = fen.split(/\s+/)[1] === "b";
      const parser = new ChessLineParser(this.name, blackToMove, ...);

      let buffer = "";
      let bestMove = "";
      const linesByRank = new Map<number, any>();
      let done = false;
      let maxDepthSeen = 0;

      const cleanup = () => { /* ... 50 lines ... */ };
      const finish = () => { /* ... 50 lines ... */ };
      const fail = () => { /* ... 20 lines ... */ };
      const onData = (chunk: Buffer) => { /* ... 40 lines ... */ };
      const stopAnalysis = () => { /* ... 15 lines ... */ };
      const checkDepth = () => { /* ... 15 lines ... */ };
      const onTimeout = () => { /* ... 5 lines ... */ };

      // ... setup code ...
      this.proc!.stdout?.on("data", onData);
      let timer = setTimeout(onTimeout, TIMEOUT);
      this.sendCommand("ucinewgame");
      this.sendCommand(`setoption name MultiPV value ${multiPv}`);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }
}
```

### StockfishEngine - AFTER (30 lines)
```typescript
export class StockfishEngine extends BaseChessEngine {
  readonly name = "Stockfish";
  readonly version: string;
  readonly capabilities: EngineCapability = {
    supportsMultiPV: true,
    supportsWDL: false,
    supportsCP: true,
    supportsMate: true
  };

  constructor(enginePath: string, version: string = "15") {
    super(enginePath);
    this.version = version;
  }

  protected getDefaultDepth(): number {
    return 20;
  }

  protected getDefaultTimeoutMs(): number {
    return 30000;
  }

  protected sendEngineOptions(multiPv: number): void {
    this.sendCommand(`setoption name MultiPV value ${Math.max(1, Math.min(4, multiPv))}`);
  }

  protected sendAnalysisCommand(depth: number): void {
    this.sendCommand(`go depth ${depth}`);
  }
}
```

**Reduction: 200 → 30 lines (85% reduction!)**

---

## How Template Method Pattern Works

```
BaseChessEngine.analyze() {
  // ... 150 lines of common UCI protocol handling ...
  
  this.sendEngineOptions(multiPv);  // ← Hook 1: calls subclass version
  this.sendPositionCommand(fen);     // ← Can override
  this.sendAnalysisCommand(depth);   // ← Hook 2: calls subclass version
  
  // ... rest of common code ...
}

// StockfishEngine overrides the hooks:
protected sendEngineOptions(multiPv: number) {
  this.sendCommand(`setoption name MultiPV value ${multiPv}`);
}

protected sendAnalysisCommand(depth: number) {
  this.sendCommand(`go depth ${depth}`);
}

// LC0Engine overrides the hooks differently:
protected sendEngineOptions(multiPv: number) {
  this.sendCommand(`setoption name MultiPV value ${multiPv}`);
  // (could add LC0-specific options here)
}

protected sendAnalysisCommand(depth: number) {
  this.sendCommand(`go depth ${depth}`);
}
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **StockfishEngine size** | 200 lines | 30 lines |
| **LC0Engine size** | 200 lines | 30 lines |
| **Duplicate code** | Full analysis in both | Zero duplication |
| **Adding new engine** | Copy-paste 200 lines | Implement 5 methods |
| **Fixing analysis bug** | Fix in 2 places | Fix in 1 place |
| **Timeout handling** | Duplicated in each | In base class |
| **Stream buffering** | Duplicated in each | In base class |
| **Line parsing** | Uses shared parser | Uses shared parser |

---

## Abstract Methods vs Virtual Methods

```typescript
// Option 1: Abstract (Forces implementation)
abstract class BaseChessEngine {
  abstract sendEngineOptions(multiPv: number): void;
  abstract sendAnalysisCommand(depth: number): void;
}

// StockfishEngine MUST implement these

// Option 2: Protected with default (Allows optional override)
protected class BaseChessEngine {
  protected sendEngineOptions(multiPv: number): void {
    // Default: do nothing (works for engines with no options)
  }
}

// Use abstract if behavior is required
// Use virtual if behavior is optional
```

In our case: **Use abstract** because every engine must define how to set options and send analysis commands.

---

## Testing Strategy

### Unit Tests (No Process)
```typescript
describe("StockfishEngine", () => {
  it("sends correct MultiPV option", () => {
    const engine = new StockfishEngine("/path/to/sf");
    const commands: string[] = [];
    
    // Mock sendCommand to capture calls
    jest.spyOn(engine, "sendCommand").mockImplementation((cmd) => {
      commands.push(cmd);
    });
    
    // Trigger via protected method (or public if we expose)
    engine["sendEngineOptions"](3);
    
    expect(commands).toContain("setoption name MultiPV value 3");
  });
});
```

### Integration Tests (With Process)
```typescript
describe("StockfishEngine integration", () => {
  it("analyzes position correctly", async () => {
    const engine = new StockfishEngine("/usr/bin/stockfish", "15");
    await engine.start();
    
    const result = await engine.analyze({
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      depth: 10
    });
    
    expect(result.bestMove).toBeTruthy();
    expect(result.lines.length).toBeGreaterThan(0);
    
    await engine.stop();
  });
});
```

---

## File Structure

```
electron/
├── engines/
│   ├── IChessEngine.ts              ← Interface (types)
│   ├── BaseChessEngine.ts           ← Abstract (common logic)
│   ├── StockfishEngine.ts           ← Concrete (engine-specific)
│   ├── LC0Engine.ts                 ← Concrete (engine-specific)
│   ├── EngineFactory.ts             ← Dependency injection
│   │
│   └── __tests__/
│       ├── BaseChessEngine.test.ts
│       ├── StockfishEngine.test.ts
│       ├── LC0Engine.test.ts
│       └── EngineFactory.test.ts
│
└── utils/
    ├── chessLineParser.ts           ← Shared utility
    └── chessLineParser.test.ts
```

---

## Migration Checklist

- [x] Create `IChessEngine` interface
- [x] Create `BaseChessEngine` abstract class (common logic)
- [x] Create `StockfishEngine` (30 lines, extends base)
- [x] Create `LC0Engine` (30 lines, extends base)
- [x] Create `EngineFactory` (dependency injection)
- [x] Create `ChessLineParser` (shared utility)
- [ ] Update `ProcessManager` to use factory + interface
- [ ] Remove old monolithic `EngineRunner` from main.ts
- [ ] Add unit tests for each component
- [ ] Integration test both engines
- [ ] Test engine switching
- [ ] Performance verify (should be identical)

---

## Summary

✅ **Zero code duplication** - all common logic in BaseChessEngine  
✅ **Clean separation** - engine-specific code only in subclasses  
✅ **Type-safe** - interface guarantee + abstract requirements  
✅ **Testable** - each layer can be tested independently  
✅ **Extensible** - new engine = extend BaseChessEngine + implement 5 methods  
✅ **Maintainable** - bug fix in analysis? Fix once in BaseChessEngine  

This is **proper object-oriented design**! 🎯
