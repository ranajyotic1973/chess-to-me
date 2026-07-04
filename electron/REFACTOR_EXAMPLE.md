# Refactoring main.ts with ChessLineParser

## Before (Monolithic)
The parsing logic was nested deep in `_analyzeInternal()`:

```typescript
const parseInfo = (line: string) => {
  const depthMatch = line.match(/\bdepth\s(\d+)/);
  const currentDepth = depthMatch ? Number(depthMatch[1]) : undefined;
  if (currentDepth) maxDepthSeen = Math.max(maxDepthSeen, currentDepth);

  const scoreCp = line.match(/score cp (-?\d+)/);
  const scoreMate = line.match(/score mate (-?\d+)/);
  const scoreWdl = line.match(/score wdl (\d+) (\d+) (\d+)/);
  
  const pv = line.match(/\spv\s(.+)$/);
  const mpvMatch = line.match(/\bmultipv\s(\d+)/);
  const rank = mpvMatch ? Number(mpvMatch[1]) : 1;
  const existing = linesByRank.get(rank) || { score: null, pv: "" };

  // ... 30+ lines of scoring logic
};

const onData = (chunk: Buffer) => {
  // ... stream buffering code
  
  for (const line of lines) {
    if (!line.trim()) continue;
    this.emitLog({ text: line, stream: "stdout", context: "analysis" });
    console.log(`[${this.engineName}] RAW OUTPUT: ${line}`);

    if (line.startsWith("info ")) {
      parseInfo(line);  // <-- calls nested function
    } else if (line.startsWith("bestmove ")) {
      bestMove = line.split(" ")[1] || "";
      finish();
    }
  }
};
```

## After (Refactored)
Using the isolated `ChessLineParser` class:

```typescript
import { ChessLineParser } from "./utils/chessLineParser";

// In _analyzeInternal():
const blackToMove = fen.split(/\s+/)[1] === "b";
const parser = new ChessLineParser(
  this.engineName,
  blackToMove,
  (msg) => console.log(msg)  // Pass logging function
);

const onData = (chunk: Buffer) => {
  // ... stream buffering code (unchanged)
  
  for (const line of lines) {
    if (!line.trim()) continue;
    this.emitLog({ text: line, stream: "stdout", context: "analysis" });
    console.log(`[${this.engineName}] RAW OUTPUT: ${line}`);

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
    }
  }
};
```

## Benefits

✅ **Parser is testable** — isolated business logic, no stream/timing dependencies  
✅ **Reusable** — can use in other engine handlers or offline analysis  
✅ **Maintainable** — parsing logic is 150 lines, not buried in 300-line method  
✅ **Clear responsibility** — `ChessLineParser` does parsing; `EngineRunner` does process management  
✅ **Easy to extend** — add new score formats (e.g., eval hash, tablebase) without touching stream code  

## Next Steps

1. Add unit tests for `ChessLineParser` (score parsing, PV extraction, edge cases)
2. Update imports in main.ts
3. Replace `parseInfo()` with parser calls in `onData()`
4. Remove ~50 lines of parsing logic from main.ts
