# Debugging: LLM Not Invoked on Board Moves

## Issue
When moving a piece via mouse drag-and-drop on the board, LLM analysis is not being invoked. The expected behavior is:
- Click a line from the list → Line detail appears with first move highlighted
- Make a move that matches the line → Highlighting shifts to next move, no analysis
- Make a move that DOESN'T match the line → Analysis triggered (engine + LLM)

## Investigation Steps

### 1. Check Frontend Logs (Browser DevTools Console)
Start the app and watch the console while making moves. You should see:

**When clicking a line:**
```
[handleSelectEngineLine] Selected line X
```

**When making a move:**
```
[handleBoardMove] Move detected {
  newFen: "...",
  currentFen: "...",
  selectedEngineLineIndex: <number or null>,
  hasSelectedLine: true/false,
  analysisEntriesCount: <number>,
  currentMoveIndex: <number>
}

[handleBoardMove thunk] Checking move match {
  selectedEngineLineIndex: <number or null>,
  ...
}

[handleBoardMove thunk] Match result: {
  matched: true/false,
  shouldRunAnalysis: true/false,
  ...
}

[handleBoardMove] Thunk result: {
  moveMatched: true/false,
  shouldAnalyze: true/false,
  newMoveIndex: <number>
}

[handleBoardMove] <action taken> (either "Triggering analysis..." or "Move matched line...")
```

### 2. Key Data Points to Check

#### A. Is handleBoardMove being called?
Look for `[handleBoardMove] Move detected` log.
- **If PRESENT:** The callback is being invoked
- **If MISSING:** The `onBoardMove` callback from AnalysisBoard is not being connected properly

#### B. Is a line selected?
Check `hasSelectedLine` in the first log.
- **If TRUE:** A line is selected, move matching should happen
- **If FALSE:** No line selected, all moves should trigger analysis

#### C. Is the thunk being dispatched?
Look for `[handleBoardMove thunk] Checking move match` log.
- **If PRESENT:** The thunk is executing
- **If MISSING:** The dispatch might be failing silently

#### D. What does move matching return?
Check `[matchMoveAgainstLine]` logs.
- **If `matched: true`:** Move is correct, no analysis should trigger
- **If `matched: false, shouldRunAnalysis: true`:** Move is wrong, analysis should trigger
- **If no log appears:** The matchMoveAgainstLine function might have an error

#### E. Is analysis being triggered?
Look for `[handleBoardMove] Triggering analysis...` log.
- **If PRESENT:** runAnalysis() is being called with the new FEN
- **If MISSING:** Even though shouldAnalyze is true, runAnalysis is not executing

### 3. Specific Scenarios to Test

**Scenario 1: Select a line, make the CORRECT first move**
```
Expected logs:
- [handleSelectEngineLine] Selected line 0
- [handleBoardMove] Move detected { hasSelectedLine: true }
- [matchMoveAgainstLine] Move check { matched: true }
- [handleBoardMove] Move matched line...

No "Triggering analysis" log should appear.
```

**Scenario 2: Select a line, make a WRONG move**
```
Expected logs:
- [handleSelectEngineLine] Selected line 0
- [handleBoardMove] Move detected { hasSelectedLine: true }
- [matchMoveAgainstLine] Move check { matched: false, shouldRunAnalysis: true }
- [handleBoardMove] Triggering analysis...

The "Triggering analysis" log should appear, and runAnalysis() should be called.
```

**Scenario 3: Make a move WITHOUT selecting a line first**
```
Expected logs:
- [handleBoardMove] Move detected { hasSelectedLine: false }
- [matchMoveAgainstLine] No selected line or entry
- [handleBoardMove] Triggering analysis...

Analysis should always trigger when no line is selected.
```

### 4. Backend Logs
Also check the Electron main process logs for:
```
[engine] Requesting analysis...
[lc0] Analysis request received
[llm] Fetching explanation...
```

If these don't appear, the backend analysis isn't being triggered.

## Hypothesis Testing

### Hypothesis 1: onBoardMove callback not connected
**Test:** Add a move and check if `[handleBoardMove] Move detected` appears
- If NO → The callback isn't connected. Check AnalysisBoard component.

### Hypothesis 2: selectedEngineLineIndex not set
**Test:** Select a line, make a move, check the `hasSelectedLine` value
- If FALSE after selecting → Redux state not updating. Check selectEngineLineThunk.

### Hypothesis 3: Move matching always returns false positives
**Test:** Select a line, make a move, check the `matched` value
- If ALWAYS TRUE → All moves match (wrong)
- If ALWAYS FALSE → No moves match (wrong)
- Should vary based on correct vs incorrect move

### Hypothesis 4: runAnalysis not being called
**Test:** Make a wrong move (or move without line selected), check logs
- If `[handleBoardMove] Triggering analysis...` appears but LLM doesn't run → runAnalysis is failing

### Hypothesis 5: runAnalysis not invoking LLM
**Test:** Check if backend analysis is triggered (check Electron logs)
- If analysis is triggered but no LLM → LLM might not be configured or might be disabled

## Next Steps

1. **Reproduce the issue** while watching the browser console
2. **Copy the full console output** from steps: select line → make move
3. **Note:**
   - Which logs appear and which are missing
   - What values are shown for key fields (selectedEngineLineIndex, matched, shouldAnalyze)
   - Whether "Triggering analysis..." appears
4. **Check backend logs** for analysis/LLM activity

## Code Locations

- **handleBoardMove callback:** src/App.tsx:1637
- **handleSelectEngineLine callback:** src/App.tsx:1200
- **handleBoardMove thunk:** src/redux/thunks/boardThunks.ts:77
- **matchMoveAgainstLine function:** src/redux/thunks/boardThunks.ts:28
- **AnalysisBoard onBoardMove prop:** src/components/AnalysisBoard.tsx:105
