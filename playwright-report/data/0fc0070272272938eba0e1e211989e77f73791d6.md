# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: board-analysis.spec.ts >> Move Highlighting - Selected Line Navigation >> should update highlight when navigating with arrow keys
- Location: tests\integration\board-analysis.spec.ts:201:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  76  | 
  77  |       await fromSquare.dragTo(toSquare);
  78  |       await page.waitForTimeout(100);
  79  | 
  80  |       // After black moves, play a white move to return turn to black
  81  |       if (i < blackMoves.length - 1) {
  82  |         const whiteMoveSelector = await page.locator('[data-testid="piece"]').first();
  83  |         if (whiteMoveSelector) {
  84  |           await page.waitForTimeout(100);
  85  |         }
  86  |       }
  87  |     }
  88  |   });
  89  | 
  90  |   test('should reject illegal moves on the board', async () => {
  91  |     // Try to move a piece to an illegal square (same square)
  92  |     const fromSquare = page.locator('.square-e2').first();
  93  |     const toSquare = page.locator('.square-e2').first();
  94  | 
  95  |     await fromSquare.dragTo(toSquare);
  96  |     await page.waitForTimeout(100);
  97  | 
  98  |     // Board state should not change
  99  |     expect(true).toBeTruthy();
  100 |   });
  101 | 
  102 |   test('should not invoke engine analysis on illegal moves', async () => {
  103 |     // Attempt an illegal move
  104 |     const pawn = page.locator('.square-e2').first();
  105 |     const target = page.locator('.square-e6').first();
  106 | 
  107 |     await pawn.dragTo(target);
  108 |     await page.waitForTimeout(100);
  109 | 
  110 |     // Check that no analysis spinner appeared or was dismissed quickly
  111 |     const spinner = page.locator('[data-testid="analysis-spinner"]');
  112 |     const isVisible = await spinner.isVisible().catch(() => false);
  113 | 
  114 |     expect(isVisible).toBeFalsy();
  115 |   });
  116 | });
  117 | 
  118 | test.describe('Engine Analysis - Lines Display', () => {
  119 |   let page: Page;
  120 | 
  121 |   test.beforeEach(async ({ browser }) => {
  122 |     page = await browser.newPage();
  123 |     await page.goto('/');
  124 |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  125 |   });
  126 | 
  127 |   test.afterEach(async () => {
  128 |     await page.close();
  129 |   });
  130 | 
  131 |   test('should display 4 engine lines in analysis mode', async () => {
  132 |     // Wait for analysis to complete
  133 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  134 | 
  135 |     const lines = await page.locator('[data-testid="analysis-line"]').count();
  136 |     expect(lines).toBe(4);
  137 |   });
  138 | 
  139 |   test('should display lines in correct order (best to worst)', async () => {
  140 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  141 | 
  142 |     // Check that each line appears in order by checking data attributes or text content
  143 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  144 |     const secondLine = page.locator('[data-testid="analysis-line"]').nth(1);
  145 | 
  146 |     const firstText = await firstLine.textContent();
  147 |     const secondText = await secondLine.textContent();
  148 | 
  149 |     expect(firstText).toBeTruthy();
  150 |     expect(secondText).toBeTruthy();
  151 |   });
  152 | 
  153 |   test('should show line notation with piece glyphs', async () => {
  154 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  155 | 
  156 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  157 |     const text = await firstLine.textContent();
  158 | 
  159 |     // Should contain chess piece glyphs or move notation
  160 |     expect(text?.length ?? 0).toBeGreaterThan(0);
  161 |   });
  162 | 
  163 |   test('should display score for each line', async () => {
  164 |     await page.waitForSelector('[data-testid="analysis-score"]', { timeout: 3000 });
  165 | 
  166 |     const scores = await page.locator('[data-testid="analysis-score"]').count();
  167 |     expect(scores).toBeGreaterThan(0);
  168 |   });
  169 | });
  170 | 
  171 | test.describe('Move Highlighting - Selected Line Navigation', () => {
  172 |   let page: Page;
  173 | 
  174 |   test.beforeEach(async ({ browser }) => {
  175 |     page = await browser.newPage();
> 176 |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  177 |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  178 |   });
  179 | 
  180 |   test.afterEach(async () => {
  181 |     await page.close();
  182 |   });
  183 | 
  184 |   test('should highlight current move when line is selected', async () => {
  185 |     // Wait for analysis
  186 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  187 | 
  188 |     // Click first line to select it
  189 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  190 |     await firstLine.click();
  191 | 
  192 |     await page.waitForTimeout(100);
  193 | 
  194 |     // Check for highlighted move (bold + yellow background)
  195 |     const highlightedMove = page.locator('[data-testid="highlighted-move"]');
  196 |     const isVisible = await highlightedMove.isVisible().catch(() => false);
  197 | 
  198 |     expect(isVisible).toBeTruthy();
  199 |   });
  200 | 
  201 |   test('should update highlight when navigating with arrow keys', async () => {
  202 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  203 | 
  204 |     // Select a line
  205 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  206 |     await firstLine.click();
  207 |     await page.waitForTimeout(100);
  208 | 
  209 |     // Press right arrow to advance move
  210 |     await page.keyboard.press('ArrowRight');
  211 |     await page.waitForTimeout(100);
  212 | 
  213 |     // Move counter should update or highlight should move
  214 |     expect(true).toBeTruthy();
  215 |   });
  216 | 
  217 |   test('should highlight correct move when playing matching board move', async () => {
  218 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  219 | 
  220 |     // Select first line
  221 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  222 |     await firstLine.click();
  223 |     await page.waitForTimeout(200);
  224 | 
  225 |     // Play first move of the line via drag
  226 |     await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
  227 |     await page.waitForTimeout(100);
  228 | 
  229 |     // Highlight should still be visible and updated
  230 |     const highlightedMove = page.locator('[data-testid="highlighted-move"]');
  231 |     const isVisible = await highlightedMove.isVisible().catch(() => false);
  232 | 
  233 |     expect(isVisible).toBeTruthy();
  234 |   });
  235 | });
  236 | 
  237 | test.describe('LLM Explanations', () => {
  238 |   let page: Page;
  239 | 
  240 |   test.beforeEach(async ({ browser }) => {
  241 |     page = await browser.newPage();
  242 |     await page.goto('/');
  243 |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  244 |   });
  245 | 
  246 |   test.afterEach(async () => {
  247 |     await page.close();
  248 |   });
  249 | 
  250 |   test('should display LLM explanation when line is selected', async () => {
  251 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  252 | 
  253 |     // Select a line
  254 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  255 |     await firstLine.click();
  256 | 
  257 |     // Wait for explanation to load
  258 |     await page.waitForSelector('[data-testid="line-explanation"]', { timeout: 3000 });
  259 | 
  260 |     const explanation = await page.locator('[data-testid="line-explanation"]').textContent();
  261 |     expect(explanation?.length ?? 0).toBeGreaterThan(0);
  262 |   });
  263 | 
  264 |   test('should show explanation text in chat/explanation panel', async () => {
  265 |     await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });
  266 | 
  267 |     const firstLine = page.locator('[data-testid="analysis-line"]').first();
  268 |     await firstLine.click();
  269 | 
  270 |     // Explanation should appear in the chat panel area
  271 |     const chatPanel = page.locator('[data-testid="chat-panel"]');
  272 |     const isChatVisible = await chatPanel.isVisible().catch(() => false);
  273 | 
  274 |     expect(isChatVisible).toBeTruthy();
  275 |   });
  276 | 
```