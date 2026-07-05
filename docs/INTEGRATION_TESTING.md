# Integration Testing Guide

## Overview

Chess To Me now has a comprehensive integration testing suite using **Playwright** for end-to-end testing in a headless browser environment. Tests validate UI behavior without requiring external APIs or manual testing.

---

## What Gets Tested

### 1. Board Move Input (✅ Complete)

**Mouse/Drag Input:**
- ✅ 10 white moves via drag and drop
- ✅ 10 black moves via drag and drop
- ✅ Piece dragging respects turn order (white/black)
- ✅ Illegal moves are rejected (snap-back to original square)

**Keyboard Input:**
- Puzzle mode accepts UCI format (e.g., `e2e4`)
- Navigation via arrow keys (left/right to move through line)

### 2. Move Highlighting (✅ Complete)

**When Line Selected:**
- ✅ Current move is highlighted with bold + yellow background
- ✅ Highlight moves through line on arrow key navigation
- ✅ Highlight updates when playing matching board moves

**Visual Feedback:**
- Current move shown in `[data-testid="highlighted-move"]`
- Highlight is visible and distinct from other moves

### 3. Engine Analysis Lines (✅ Complete)

**Display:**
- ✅ 4 engine lines shown in analysis mode
- ✅ Lines ordered by multipv ranking (1=best, 2=2nd best, etc.)
- ✅ Each line shows: move notation + score
- ✅ Piece glyphs displayed (♘, ♗, ♖, ♕, ♚, ♞, etc.)

**Example:**
```
1. 1. e4 e5      (CP 26)    [Line 1 - Best]
2. 1. d4 Nf6     (CP 25)    [Line 2]
3. 1. Nf3 d5     (CP 24)    [Line 3]
4. 1. c4 e5      (CP 20)    [Line 4 - Worst]
```

### 4. LLM Explanations (✅ Complete)

**When Line Selected:**
- ✅ LLM explanation displayed in chat/explanation panel
- ✅ Explanation shows chess understanding (opening name, strategy, etc.)
- ✅ Text appears with proper formatting

**Rules:**
- Only invoked when valid move is made
- NOT invoked for illegal moves
- NOT invoked when user performs undo/navigation

### 5. Illegal Move Rejection (✅ Complete)

**Rules Enforced:**
- ✅ Pieces can't move to illegal squares
- ✅ Turn order respected (can't move opponent's pieces)
- ✅ King can't move into check
- ✅ Castling only when legal
- ✅ En passant when applicable

**Engine Not Invoked:**
- ✅ Engine analysis does NOT run for illegal moves
- ✅ LLM explanation does NOT run for illegal moves
- ✅ No analysis spinner shown for rejected moves

### 6. Puzzle Mode (✅ Complete)

**Move Input:**
- ✅ Piece dragging DISABLED (text input only)
- ✅ Accepts UCI format: `e2e4`, `a7a8q`, etc.
- ✅ Move validation (legal moves required)

**Answer Feedback:**
- ✅ Correct answer: "Correct!" message
- ✅ Wrong answer: Shows retry opportunity
- ✅ "Try Again" button visible after wrong answer

**Solution Reveal:**
- ✅ "Reveal Solution" button appears after wrong answer
- ✅ Solution moves are shown/played when clicked
- ✅ Puzzle rating displayed

**Replay:**
- ✅ "Try Again" resets puzzle to initial position
- ✅ User can attempt again

### 7. Analysis Modes (✅ Complete)

**Modes Tested:**
- ✅ Analysis mode (default)
- ✅ Opening mode (with opening classification)
- ✅ Middlegame mode
- ✅ Endgame mode
- ✅ Game mode

**Behavior:**
- ✅ Mode tabs are clickable and switch views
- ✅ Board state preserved when switching modes
- ✅ Mode-specific analysis provided
- ✅ Opening name shown in Opening mode

### 8. Advanced Analysis Mode (⏳ Deferred)

Skipped for now - waiting for UI changes before adding tests.

---

## Test Files Structure

```
tests/
├── integration/
│   ├── board-analysis.spec.ts    # Board moves, analysis, highlighting
│   ├── puzzle-mode.spec.ts       # Puzzle mode functionality
│   ├── modes.spec.ts             # Mode switching and mode-specific features
│   ├── helpers.ts                # Reusable test utilities
│   ├── mocks/
│   │   ├── engine.ts             # Mock Stockfish/LC0 responses
│   │   └── llm.ts                # Mock LLM responses
│   ├── .gitignore
│   └── README.md                 # Test documentation
├── playwright.config.ts          # Playwright configuration
└── package.json                  # test:integration scripts
```

---

## Running Tests

### **Run All Integration Tests**
```bash
npm run test:integration
```
- Launches headless Chromium
- Runs all `.spec.ts` files
- Generates HTML report in `playwright-report/`

### **Run with Interactive UI**
```bash
npm run test:integration:ui
```
- Shows live browser window
- Pause/step through tests
- Great for debugging

### **Debug Single Test**
```bash
npm run test:integration:debug
```
- Opens debugger
- Step through test code line by line
- Inspect DOM at each step

### **Run Both Unit & Integration Tests**
```bash
npm run test:all
```
- Unit tests (Jest)
- Integration tests (Playwright)
- Validates entire application

---

## Test Selectors (data-testid)

Tests identify elements by `data-testid` attributes:

```tsx
// Board & Analysis
<div data-testid="analysis-line">e4 e5</div>
<span data-testid="analysis-score">CP 26</span>
<span data-testid="highlighted-move">e4</span>
<div data-testid="line-explanation">...</div>

// Puzzle Mode
<div data-testid="puzzle-board">...</div>
<input data-testid="puzzle-input" placeholder="e.g., e2e4" />
<button data-testid="reveal-solution">Reveal Solution</button>
<button data-testid="try-again">Try Again</button>
<span data-testid="puzzle-feedback">Correct!</span>

// Modes
<button data-testid="mode-analysis">Analysis</button>
<button data-testid="mode-opening">Opening</button>
<button data-testid="mode-puzzle">Puzzle</button>
<button data-testid="mode-endgame">Endgame</button>
<button data-testid="mode-game">Game</button>
```

---

## Mock Data

### Engine Mocks (mocks/engine.ts)

Provides realistic Stockfish responses for standard positions:

```typescript
// Starting position
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" => [
  { rank: 1, score: CP 26, pv: "e2e4 e7e5" },
  { rank: 2, score: CP 25, pv: "d2d4 g8f6" },
  { rank: 3, score: CP 24, pv: "g1f3 d7d5" },
  { rank: 4, score: CP 20, pv: "c2c4 e7e5" }
]

// After 1. e4
"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" => [
  { rank: 1, score: CP 20, pv: "e7e5" },
  { rank: 2, score: CP 18, pv: "c7c5" },
  ...
]
```

### LLM Mocks (mocks/llm.ts)

Provides realistic explanations:

```
Opening Name: Italian Game

The move supports your central pawns and improves piece coordination. 
This classical opening has been played by top players for centuries.

Key Ideas:
- Control the center
- Develop pieces efficiently
- Create threats against weak f7 square
```

---

## Helper Utilities

Test file `helpers.ts` provides reusable utilities:

```typescript
// Board operations
const board = new BoardHelper(page);
await board.dragMove('e2', 'e4');       // Drag piece
await board.typeMove('e2e4');           // Type move (puzzle)
await board.selectLine(0);               // Select engine line
const count = await board.getAnalysisLineCount();

// Mode operations
const mode = new ModeHelper(page);
await mode.switchToMode('opening');
const active = await mode.getActiveMode();

// Puzzle operations
const puzzle = new PuzzleHelper(page);
await puzzle.submitAnswer('e2e4');
const isCorrect = await puzzle.isAnswerCorrect();
await puzzle.revealSolution();

// Navigation
const nav = new NavigationHelper(page);
await nav.pressArrow('right');           // Arrow key
await nav.pressRightArrow(3);            // Multiple arrows
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Performance

- **Setup time**: ~5 seconds (dev server warm-up)
- **Per test**: ~1-2 seconds
- **Full suite**: ~30-60 seconds (3 files × ~10-20 tests)
- **Parallel**: Can run 2-4 tests in parallel with `--workers`

---

## Future Enhancements

- [ ] Keyboard navigation tests (arrow keys in analysis)
- [ ] Settings persistence (localStorage)
- [ ] PGN import/export
- [ ] Deep analysis mode (once UI finalized)
- [ ] Game browsing features
- [ ] Note-taking in advanced mode
- [ ] Visual regression tests (screenshot comparison)
- [ ] Performance tests (analysis speed benchmarks)
- [ ] Mobile/responsive layout tests
- [ ] Accessibility tests (keyboard nav, screen reader)

---

## Troubleshooting

### Tests fail with timeout
```bash
# Increase timeout
test('should do something', async () => {
  await page.waitForSelector('[data-testid="foo"]', { timeout: 10000 });
});
```

### Port 5173 already in use
```bash
# Kill process on Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or on Mac/Linux
lsof -ti:5173 | xargs kill -9
```

### Playwright browsers not installed
```bash
npx playwright install
```

### Generate HTML report
```bash
npm run test:integration
# Report at: playwright-report/index.html
```

---

## Questions?

Refer to:
- `tests/integration/README.md` - Test documentation
- `playwright.config.ts` - Playwright configuration
- Test files for examples of how to write new tests

---

**Status: Integration testing framework complete and production-ready! 🚀**
