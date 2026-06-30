# Integration Tests for Chess To Me

This directory contains integration tests that validate the UI behavior of Chess To Me in a headless browser environment. Tests use **Playwright** for browser automation.

## Test Files

### `board-analysis.spec.ts`
Tests for core board functionality and analysis features:

**Move Input (Mouse & Keyboard):**
- ✅ 10 white moves via drag and drop
- ✅ 10 black moves via drag and drop
- ✅ Illegal move rejection
- ✅ No engine analysis on illegal moves

**Engine Analysis Display:**
- ✅ Display of 4 engine lines (analysis mode)
- ✅ Lines ordered correctly (best to worst)
- ✅ Score display for each line
- ✅ Move notation with piece glyphs

**Move Highlighting:**
- ✅ Current move highlighting when line selected
- ✅ Highlight updates on arrow key navigation
- ✅ Highlight updates on matching board move

**LLM Explanations:**
- ✅ Explanation displayed when line selected
- ✅ Explanation shown in chat/explanation panel
- ✅ No LLM invocation for illegal moves

### `puzzle-mode.spec.ts`
Tests for puzzle mode functionality:

- ✅ Puzzle position loads
- ✅ Piece dragging disabled (UCI input only)
- ✅ Typed moves accepted (UCI format: e2e4)
- ✅ Correct answer feedback ("Correct!")
- ✅ "Reveal Solution" button shown for wrong answers
- ✅ Solution displayed when reveal clicked
- ✅ "Try Again" button for wrong answers
- ✅ Puzzle difficulty/rating displayed

### `modes.spec.ts`
Tests for different analysis modes:

**Mode Switching:**
- ✅ Switch to Opening mode
- ✅ Switch to Middlegame mode
- ✅ Switch to Endgame mode
- ✅ Switch to Game mode

**Mode-Specific Features:**
- ✅ Opening classification in Opening mode
- ✅ Endgame-specific analysis
- ✅ Game browsing features
- ✅ Board state preserved when switching modes
- ✅ Mode-specific UI elements shown

## Running Tests

### Run all integration tests
```bash
npm run test:integration
```

### Run tests with UI (interactive)
```bash
npm run test:integration:ui
```

### Debug a single test file
```bash
npm run test:integration:debug
```

### Run both unit and integration tests
```bash
npm run test:all
```

## Test Architecture

### Mocks
- **Engine Mocks** (`mocks/engine.ts`): Simulated Stockfish/LC0 responses for known positions
- **LLM Mocks** (`mocks/llm.ts`): Simulated LLM explanations (no actual API calls)

### Playwright Configuration
- Base URL: `http://localhost:5173` (dev server)
- Browser: Chromium (headless)
- Timeout: 5000ms default
- Retries: 0 in development, 2 in CI

### Test Flow
1. Playwright starts dev server (if not running)
2. Browser loads app at localhost:5173
3. Tests interact with app via selectors
4. Mocks intercept engine/LLM requests
5. Tests assert on UI state changes

## Selectors Used

Tests rely on `data-testid` attributes in components:

```
[data-testid="analysis-line"]        - Engine analysis line
[data-testid="analysis-score"]       - Score display
[data-testid="highlighted-move"]     - Highlighted move in line
[data-testid="line-explanation"]     - LLM explanation
[data-testid="puzzle-board"]         - Puzzle mode board
[data-testid="puzzle-input"]         - Puzzle move input
[data-testid="reveal-solution"]      - Reveal solution button
[data-testid="puzzle-feedback"]      - Puzzle feedback message
[data-testid="mode-analysis"]        - Analysis mode tab
[data-testid="mode-opening"]         - Opening mode tab
[data-testid="mode-puzzle"]          - Puzzle mode tab
```

## Adding New Tests

### Template for new test file:
```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Feature Name', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should do something', async () => {
    // Arrange
    const element = page.locator('[data-testid="element"]');

    // Act
    await element.click();
    await page.waitForTimeout(100);

    // Assert
    const result = await element.isVisible();
    expect(result).toBeTruthy();
  });
});
```

## Current Coverage

| Feature | Status | Coverage |
|---------|--------|----------|
| Board moves (mouse) | ✅ | 10 moves each side |
| Board moves (keyboard) | ⏳ | To be added |
| Move highlighting | ✅ | Line selection, keyboard nav |
| Engine lines display | ✅ | 4 lines, ordering, scores |
| LLM explanations | ✅ | Line selection, display |
| Illegal move rejection | ✅ | No engine/LLM invocation |
| Puzzle mode | ✅ | Answer check, reveal |
| Analysis modes | ✅ | Opening, endgame, game |
| Advanced analysis | ⏳ | Deferred (UI changes pending) |

## Future Enhancements

- [ ] Test keyboard navigation (arrow keys in analysis)
- [ ] Test settings persistence (localStorage)
- [ ] Test PGN import/export
- [ ] Test deep analysis mode (once UI finalized)
- [ ] Test game browsing features
- [ ] Test note-taking in advanced mode
- [ ] Visual regression tests (screenshots)
- [ ] Performance tests (analysis speed)

## Troubleshooting

### Tests timeout
- Increase timeout in test: `{ timeout: 10000 }`
- Check if dev server is running on port 5173
- Verify selectors exist in rendered HTML

### Playwright not found
```bash
npm install -D @playwright/test
npx playwright install
```

### Port 5173 already in use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

## CI/CD Integration

Tests automatically run in CI when configured:
```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm install

- name: Run integration tests
  run: npm run test:integration
```

## Performance Notes

- Full test suite runs in ~30-60 seconds
- Tests run serially by default (can parallelize with `--workers=2`)
- Dev server warm-up takes ~5 seconds
- Each test is isolated (fresh browser context)
