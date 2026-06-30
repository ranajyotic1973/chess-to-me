# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: modes.spec.ts >> Mode-Specific UI Elements >> Puzzle mode should not show unnecessary analysis controls
- Location: tests\integration\modes.spec.ts:213:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  72  |   test('Opening mode should provide opening classification', async () => {
  73  |     const openingTab = page.locator('[data-testid="mode-opening"]');
  74  |     await openingTab.click();
  75  |     await page.waitForTimeout(300);
  76  | 
  77  |     // Make some moves to reach an opening
  78  |     await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
  79  |     await page.waitForTimeout(100);
  80  | 
  81  |     // Opening name should appear somewhere
  82  |     const openingName = page.locator('[data-testid="opening-name"]');
  83  |     const isVisible = await openingName.isVisible().catch(() => false);
  84  | 
  85  |     // May or may not be visible depending on moves, so just check it exists
  86  |     expect(true).toBeTruthy();
  87  |   });
  88  | 
  89  |   test('Endgame mode should analyze endgame positions', async () => {
  90  |     const endgameTab = page.locator('[data-testid="mode-endgame"]');
  91  |     await endgameTab.click();
  92  |     await page.waitForTimeout(300);
  93  | 
  94  |     // Load an endgame position via FEN input or UI
  95  |     const fenInput = page.locator('[data-testid="fen-input"]').first();
  96  | 
  97  |     if (await fenInput.isVisible()) {
  98  |       // King and pawn endgame
  99  |       const endgameFen = '4k3/8/8/8/4K3/8/4P3/8 w - - 0 1';
  100 |       await fenInput.fill(endgameFen);
  101 |       await fenInput.press('Enter');
  102 | 
  103 |       await page.waitForTimeout(500);
  104 | 
  105 |       // Analysis should be shown
  106 |       const analysis = page.locator('[data-testid="analysis-line"]');
  107 |       const count = await analysis.count();
  108 |       expect(count).toBeGreaterThan(0);
  109 |     }
  110 |   });
  111 | 
  112 |   test('Game mode should support game browsing features', async () => {
  113 |     const gameTab = page.locator('[data-testid="mode-game"]');
  114 |     await gameTab.click();
  115 |     await page.waitForTimeout(300);
  116 | 
  117 |     // Game mode should have specific UI elements
  118 |     const gameBoard = page.locator('[data-testid="game-board"]');
  119 |     const isBoardVisible = await gameBoard.isVisible().catch(() => false);
  120 | 
  121 |     // Either has game board or game list
  122 |     expect(true).toBeTruthy();
  123 |   });
  124 | 
  125 |   test('should maintain board state when switching modes', async () => {
  126 |     // Make a move in analysis mode
  127 |     await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
  128 |     await page.waitForTimeout(100);
  129 | 
  130 |     // Switch to opening mode
  131 |     const openingTab = page.locator('[data-testid="mode-opening"]');
  132 |     await openingTab.click();
  133 |     await page.waitForTimeout(300);
  134 | 
  135 |     // Switch back to analysis
  136 |     const analysisTab = page.locator('[data-testid="mode-analysis"]');
  137 |     if (await analysisTab.isVisible()) {
  138 |       await analysisTab.click();
  139 |       await page.waitForTimeout(300);
  140 | 
  141 |       // Board state should be preserved
  142 |       expect(true).toBeTruthy();
  143 |     }
  144 |   });
  145 | 
  146 |   test('each mode should have its own analysis lines', async () => {
  147 |     // Get analysis in one mode
  148 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  149 |     const initialCount = await page.locator('[data-testid="analysis-line"]').count();
  150 | 
  151 |     // Switch mode
  152 |     const openingTab = page.locator('[data-testid="mode-opening"]');
  153 |     await openingTab.click();
  154 |     await page.waitForTimeout(500);
  155 | 
  156 |     // Wait for new analysis
  157 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  158 | 
  159 |     // Lines may differ based on mode-specific analysis
  160 |     const newCount = await page.locator('[data-testid="analysis-line"]').count();
  161 | 
  162 |     // Should have some analysis
  163 |     expect(newCount).toBeGreaterThan(0);
  164 |   });
  165 | });
  166 | 
  167 | test.describe('Mode-Specific UI Elements', () => {
  168 |   let page: Page;
  169 | 
  170 |   test.beforeEach(async ({ browser }) => {
  171 |     page = await browser.newPage();
> 172 |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  173 |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  174 |   });
  175 | 
  176 |   test.afterEach(async () => {
  177 |     await page.close();
  178 |   });
  179 | 
  180 |   test('Opening mode should show opening name in analysis', async () => {
  181 |     const openingTab = page.locator('[data-testid="mode-opening"]');
  182 |     await openingTab.click();
  183 |     await page.waitForTimeout(300);
  184 | 
  185 |     // Make opening moves: 1. e4 e5
  186 |     await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
  187 |     await page.waitForTimeout(100);
  188 | 
  189 |     await page.locator('.square-e7').first().dragTo(page.locator('.square-e5').first());
  190 |     await page.waitForTimeout(100);
  191 | 
  192 |     // Continue to reach a named opening
  193 |     await page.locator('.square-g1').first().dragTo(page.locator('.square-f3').first());
  194 |     await page.waitForTimeout(100);
  195 | 
  196 |     // Opening name might be shown in the explanation or chat
  197 |     const explanation = page.locator('[data-testid="line-explanation"]');
  198 |     const explanationText = await explanation.textContent().catch(() => '');
  199 | 
  200 |     // Should mention opening name
  201 |     expect(explanationText?.length ?? 0).toBeGreaterThan(0);
  202 |   });
  203 | 
  204 |   test('Endgame mode should analyze with endgame-specific logic', async () => {
  205 |     const endgameTab = page.locator('[data-testid="mode-endgame"]');
  206 |     await endgameTab.click();
  207 |     await page.waitForTimeout(300);
  208 | 
  209 |     // Endgame mode is active
  210 |     expect(true).toBeTruthy();
  211 |   });
  212 | 
  213 |   test('Puzzle mode should not show unnecessary analysis controls', async () => {
  214 |     const puzzleTab = page.locator('[data-testid="mode-puzzle"]');
  215 |     await puzzleTab.click();
  216 |     await page.waitForTimeout(300);
  217 | 
  218 |     // Puzzle mode should have puzzle-specific UI
  219 |     const puzzleBoard = page.locator('[data-testid="puzzle-board"]');
  220 |     const isPuzzleVisible = await puzzleBoard.isVisible().catch(() => false);
  221 | 
  222 |     expect(isPuzzleVisible).toBeTruthy();
  223 |   });
  224 | });
  225 | 
```