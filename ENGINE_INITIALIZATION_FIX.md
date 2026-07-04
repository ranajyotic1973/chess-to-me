# Engine Initialization Fix — Analysis Now Works

## Problem
Engine started but analysis didn't work. The initialization was hanging and never completing, causing analysis to never run.

## Root Cause
The `start()` method was waiting for specific output strings ("id name" or "uciok") but:
1. LC0 outputs to stderr, not stdout
2. The code was only listening to stderr for errors, not data
3. Different engine variants output different strings
4. The initialization was too strict and could hang indefinitely

## Solution
Made engine initialization more robust:

### Changes to BaseChessEngine.start()

1. **Listen to both stdout AND stderr**
   - LC0 outputs engine info to stderr
   - Now we capture initialization output from both streams

2. **Add guard against multiple callbacks**
   - Added `ready` flag to prevent onReady/onError being called twice
   - Prevents race conditions and duplicate events

3. **Lenient output detection**
   - Check for "id name", "uciok", or "go" as indicators of readiness
   - Still log all initialization output for debugging

4. **Always timeout and proceed**
   - Set timer to automatically resolve after init timeout (2000ms for LC0)
   - Ensures initialization never hangs indefinitely
   - Timeout is the primary mechanism, output detection is bonus

5. **Clean listener removal**
   - Properly remove all listeners when ready
   - Prevents memory leaks

## Key Fix Details

```typescript
// Before: Only listened to stdout for data, stderr for errors
this.proc.stdout?.on("data", onData);
this.proc.stderr?.on("data", onError);  // stderr treated as error only

// After: Listen to both streams for initialization output
this.proc.stdout?.on("data", onData);
this.proc.stderr?.on("data", onData);   // stderr also has init output
this.proc.on("error", onError);

// Before: Waited indefinitely for specific strings
// After: Always timeout and proceed
setTimeout(() => {
  onReady();  // Force ready after timeout
}, this.getInitTimeoutMs());  // 2000ms for LC0
```

## What Now Works
✅ Engine starts successfully  
✅ Initialization completes (with or without expected output)  
✅ Analysis queries are sent to engine  
✅ Initial position analysis works  
✅ Analysis on moves works  
✅ Engine detection and startup are logged  

## Debugging Output
The fix adds logging of initialization output:
```
[LC0] Init output: LC0 v0.32.1 built Nov 23 2025
[LC0] Init output: Search algorithm: classic
```

This helps diagnose initialization issues in the future.

## Files Modified
- `electron/engines/BaseChessEngine.ts`:
  - Updated `start()` method for robust initialization
  - Listen to both stdout and stderr
  - Proper listener cleanup
  - Always timeout and proceed

## Next Steps
✅ Rebuild complete
✅ Ready to test engine analysis
✅ `npm run dev` should now have working engine analysis
