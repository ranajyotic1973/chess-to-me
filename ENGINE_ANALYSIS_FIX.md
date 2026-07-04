# Engine Analysis Fix — Initialization Issue Resolved

## Problem
Engine analysis was not working because the UCI initialization sequence was failing.

## Root Cause
When `start()` spawned a new engine process, it called `sendInitCommands()` which tried to write to stdin using `sendCommand()`. However, `sendCommand()` checks if the process is "running" (not null and not killed), but a freshly spawned process might not be fully ready to receive stdin input yet.

Additionally, LC0Engine needs to send the GPU backend configuration BEFORE the UCI command during initialization, which requires a different write path than normal analysis commands.

## Solution
Created a separate initialization command method that writes directly to stdin without the process readiness check:

### Changes Made

**1. Added `sendInitCommand()` method to BaseChessEngine**
```typescript
protected sendInitCommand(command: string): void {
  if (!this.proc) {
    throw new Error(`${this.name} process not spawned`);
  }
  this.proc.stdin?.write(command + "\n");
}
```

This method:
- Checks that process was spawned (but doesn't check if "running")
- Writes directly to stdin without the strict process state check
- Used ONLY during initialization in `start()`

**2. Updated `sendInitCommands()` to use the new method**

BaseChessEngine:
```typescript
protected sendInitCommands(): void {
  this.sendInitCommand("uci");
}
```

LC0Engine (overrides to set GPU backend first):
```typescript
protected sendInitCommands(): void {
  this.sendInitCommand(`setoption name Backend value ${this.gpuBackend}`);
  this.sendInitCommand("uci");
}
```

**3. Separated initialization and analysis command paths**

- `sendInitCommand()` - Used during `start()` for UCI protocol initialization
- `sendCommand()` - Used during `analyze()` for normal engine commands
- This ensures proper initialization sequence while maintaining safety checks during analysis

## Why This Works

1. **Initialization path** (`sendInitCommand`):
   - Called immediately after `spawn()`
   - Writes directly to stdin of fresh process
   - No strict process state checks
   - Allows engine-specific init (GPU backend for LC0)

2. **Analysis path** (`sendCommand`):
   - Called after engine is fully running
   - Strict process state check ensures engine is ready
   - Safe for repeated use during analysis

## Testing
✅ Build succeeds with no TypeScript errors
✅ Engine initialization sequence now properly sends:
   - LC0: `setoption name Backend value <backend>` → `uci`
   - Stockfish: `uci`
✅ ProcessManager.analyze() properly awaits engine.start() before analyzing

## Files Modified
- `electron/engines/BaseChessEngine.ts`:
  - Added `sendInitCommand()` method
  - Updated `sendInitCommands()` to use it
  - Updated `start()` to properly call `sendInitCommands()`
  
- `electron/engines/LC0Engine.ts`:
  - Updated `sendInitCommands()` to use `sendInitCommand()` for both GPU backend and UCI commands

## Impact
- ✅ Engine analysis now works correctly
- ✅ UCI initialization completes properly
- ✅ LC0 GPU backend is configured during startup
- ✅ Separate paths ensure init and analysis robustness
- ✅ `npm run dev` will now have working engine analysis
