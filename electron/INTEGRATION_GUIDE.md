# Integration Guide - Using New Engine Architecture in main.ts

## 🔴 Current Problem

ProcessManager in main.ts (lines 827-1179):
- Still uses OLD `EngineRunner` class (not the new architecture)
- Line 841-843: Creates `new EngineRunner("stockfish")` and `new EngineRunner("lc0")`
- Line 1162: Calls `this.engineRunner.analyze(payload)` - using OLD code

**Result:** The new engine classes exist but are NEVER INSTANTIATED or CALLED.

---

## 🟢 Solution: Refactor ProcessManager

### Step 1: Replace Imports (Top of main.ts)

**REMOVE:**
```typescript
// Don't import or use EngineRunner anymore
class EngineRunner { ... } // DELETE THIS ENTIRE CLASS
```

**ADD:**
```typescript
import { IChessEngine } from "./engines/IChessEngine";
import { EngineFactory, EngineDetectionResult } from "./engines/EngineFactory";
```

---

### Step 2: Update ProcessManager Constructor

**BEFORE (lines 839-854):**
```typescript
constructor({ settings }: { settings: any }) {
  this.settings = settings;
  this.engineRunners = {
    stockfish: new EngineRunner("stockfish"),  // ❌ OLD WAY
    lc0: new EngineRunner("lc0")                // ❌ OLD WAY
  };
  this.logs = {
    stockfish: [],
    ollama: []
  };
  this.activeModel = DEFAULT_OLLAMA_MODEL;

  this.engineRunners.stockfish.setLogCallback(...);
  this.engineRunners.lc0.setLogCallback(...);
}
```

**AFTER:**
```typescript
private engines: Map<string, IChessEngine> = new Map();  // ✅ NEW: Interface-typed
private currentEngine: IChessEngine | null = null;       // ✅ NEW
private detectionResult: EngineDetectionResult;          // ✅ NEW

constructor({ settings, detectionResult }: { settings: any; detectionResult: EngineDetectionResult }) {
  this.settings = settings;
  this.detectionResult = detectionResult;
  this.logs = {
    stockfish: [],
    ollama: []
  };
  this.activeModel = DEFAULT_OLLAMA_MODEL;

  // ✅ NEW: Instantiate engines via factory
  const available = EngineFactory.getAvailableEngines(detectionResult);
  for (const engineName of available) {
    const engine = EngineFactory.createEngine(engineName, detectionResult);
    engine.onLog((entry) => this.recordEngineLog(engineName, entry));
    this.engines.set(engineName, engine);
  }

  // ✅ NEW: Select default engine
  if (available.length > 0) {
    this.currentEngine = this.engines.get(available[0])!;
  }
}
```

---

### Step 3: Update Engine Selection

**BEFORE (lines 861-864):**
```typescript
get engineRunner(): EngineRunner {
  const engineName = this.settings.get("selectedEngine") || "lc0";
  return this.engineRunners[engineName] || this.engineRunners.lc0;
}
```

**AFTER:**
```typescript
selectEngine(engineName: string): void {
  const engine = this.engines.get(engineName);
  if (!engine) {
    throw new Error(`Engine ${engineName} not found. Available: ${[...this.engines.keys()].join(", ")}`);
  }
  this.currentEngine = engine;
  console.log(`[ProcessManager] Selected engine: ${this.currentEngine.name}`);
}

get engineRunner(): IChessEngine {
  if (!this.currentEngine) {
    throw new Error("No engine selected");
  }
  return this.currentEngine;
}
```

---

### Step 4: Update analyze() Method

**BEFORE (lines 1152-1163):**
```typescript
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
  return this.engineRunner.analyze(payload);  // ❌ OLD analyze() call
}
```

**AFTER:**
```typescript
async analyze(payload: any): Promise<any> {
  if (!this.currentEngine) {
    throw new Error("No engine selected");
  }
  
  // Ensure engine is running
  if (!this.currentEngine.isRunning()) {
    await this.currentEngine.start();
  }
  
  // Call analyze through interface (works with ANY engine)
  return this.currentEngine.analyze(payload);  // ✅ NEW: Interface-based call
}
```

---

### Step 5: Update shutdown()

**BEFORE (lines 1174-1178):**
```typescript
async shutdown(): Promise<void> {
  await this.stopOllamaRun();
  this.stopOllamaServe();
  await this.engineRunner.stop();
}
```

**AFTER:**
```typescript
async shutdown(): Promise<void> {
  await this.stopOllamaRun();
  this.stopOllamaServe();
  
  // ✅ Stop all engines
  for (const engine of this.engines.values()) {
    await engine.stop();
  }
}
```

---

### Step 6: Update initializeFromSettings()

**BEFORE (lines 857-859):**
```typescript
initializeFromSettings(): void {
  this.activeModel = this.normalizeModel(this.settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL);
}
```

**AFTER:**
```typescript
initializeFromSettings(): void {
  this.activeModel = this.normalizeModel(this.settings.get("ollamaModel") || DEFAULT_OLLAMA_MODEL);
  
  // ✅ NEW: Switch engine if settings changed
  const selectedEngine = this.settings.get("selectedEngine");
  if (selectedEngine && this.engines.has(selectedEngine)) {
    this.selectEngine(selectedEngine);
  }
}
```

---

## 🗑️ Code to DELETE

Remove the entire OLD `EngineRunner` class (lines 294-825):

```typescript
class EngineRunner {              // ❌ DELETE ENTIRE CLASS
  // 500+ lines of old code
  readonly name: string;
  private proc: ChildProcess | null = null;
  
  async start(): Promise<void> { ... }
  async analyze(payload: any): Promise<any> { ... }
  private _analyzeInternal(params) { ... }
  // ... etc ...
}
```

This code is **completely replaced** by:
- `BaseChessEngine` (abstract, common logic)
- `StockfishEngine` (concrete)
- `LC0Engine` (concrete)

---

## 📋 Call Chain Changes

### BEFORE (Old):
```
main.ts IPC handler
  ↓
ProcessManager.analyze()
  ↓
EngineRunner.analyze()  ← OLD CLASS, DUPLICATED LOGIC
  ↓
_analyzeInternal()      ← 200+ lines of analysis code
```

### AFTER (New):
```
main.ts IPC handler
  ↓
ProcessManager.analyze()
  ↓
IChessEngine.analyze()  ← INTERFACE, POLYMORPHIC
  ├→ StockfishEngine.analyze()  (extends BaseChessEngine)
  └→ LC0Engine.analyze()        (extends BaseChessEngine)
  ↓
BaseChessEngine.analyze()  ← ONE PLACE, 200 lines (common logic)
  ├→ sendEngineOptions()  (engine-specific)
  └→ sendAnalysisCommand() (engine-specific)
```

---

## 🔧 Where ProcessManager is Instantiated

Find where ProcessManager is created and pass detectionResult:

```typescript
// In app initialization (find this in main.ts):
const detectionResult = await detectInstalledEngines();  // Must call engine detection first
const processManager = new ProcessManager({
  settings,
  detectionResult  // ✅ NEW: Pass detection result
});
```

---

## ✅ Integration Checklist

- [ ] Add imports for `IChessEngine`, `EngineFactory`, `EngineDetectionResult`
- [ ] Replace `EngineRunner` creation with factory instantiation in constructor
- [ ] Change `engineRunners: Record<string, EngineRunner>` → `engines: Map<string, IChessEngine>`
- [ ] Update `get engineRunner()` to `selectEngine(name)` + property
- [ ] Update `analyze()` to call `this.currentEngine.analyze(payload)`
- [ ] Update `shutdown()` to stop all engines in map
- [ ] Update `initializeFromSettings()` to sync selected engine
- [ ] Delete entire old `EngineRunner` class (lines 294-825)
- [ ] Verify engine detection runs before ProcessManager initialization
- [ ] Test Stockfish analysis works
- [ ] Test LC0 analysis works
- [ ] Test engine switching works

---

## 🎯 Result

**Before:** ProcessManager tightly coupled to EngineRunner, duplicated analysis code in each engine  
**After:** ProcessManager decoupled via IChessEngine interface, analysis code in BaseChessEngine, engines are simple implementations

**New code is:**
- ✅ Engine-agnostic
- ✅ Type-safe (interface guarantee)
- ✅ No duplication
- ✅ Easy to test
- ✅ Easy to extend (add new engine = extend BaseChessEngine)
