# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: puzzle-mode.spec.ts >> Puzzle Mode >> should show "Reveal Solution" button for wrong answer
- Location: tests\integration\puzzle-mode.spec.ts:84:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Integration tests for puzzle mode
  5   |  */
  6   | 
  7   | test.describe('Puzzle Mode', () => {
  8   |   let page: Page;
  9   | 
  10  |   test.beforeEach(async ({ browser }) => {
  11  |     page = await browser.newPage();
> 12  |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  13  |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  14  | 
  15  |     // Switch to puzzle mode
  16  |     const puzzleTab = page.locator('[data-testid="mode-puzzle"]');
  17  |     await puzzleTab.click();
  18  |     await page.waitForTimeout(500);
  19  |   });
  20  | 
  21  |   test.afterEach(async () => {
  22  |     await page.close();
  23  |   });
  24  | 
  25  |   test('should load a puzzle position', async () => {
  26  |     // Wait for puzzle to be displayed
  27  |     await page.waitForSelector('[data-testid="puzzle-board"]', { timeout: 3000 });
  28  | 
  29  |     const board = page.locator('[data-testid="puzzle-board"]');
  30  |     const isBoardVisible = await board.isVisible();
  31  | 
  32  |     expect(isBoardVisible).toBeTruthy();
  33  |   });
  34  | 
  35  |   test('should prevent piece dragging in puzzle mode', async () => {
  36  |     await page.waitForSelector('[data-testid="puzzle-board"]', { timeout: 3000 });
  37  | 
  38  |     // Try to drag a piece (this might not work in puzzle mode)
  39  |     const piece = page.locator('.square-e2').first();
  40  | 
  41  |     // Attempt drag - should not execute or should snap back
  42  |     try {
  43  |       await piece.dragTo(page.locator('.square-e4').first());
  44  |       // In puzzle mode, move should be rejected or require typing
  45  |       expect(true).toBeTruthy();
  46  |     } catch {
  47  |       // Expected if dragging is disabled
  48  |       expect(true).toBeTruthy();
  49  |     }
  50  |   });
  51  | 
  52  |   test('should accept typed moves (UCI format)', async () => {
  53  |     await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });
  54  | 
  55  |     const moveInput = page.locator('[data-testid="puzzle-input"]');
  56  |     await moveInput.fill('e2e4');
  57  |     await moveInput.press('Enter');
  58  | 
  59  |     await page.waitForTimeout(100);
  60  | 
  61  |     // Move should be processed
  62  |     expect(true).toBeTruthy();
  63  |   });
  64  | 
  65  |   test('should show "Correct!" feedback for correct puzzle solution moves', async () => {
  66  |     await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });
  67  | 
  68  |     // This assumes we know the correct first move for the loaded puzzle
  69  |     const moveInput = page.locator('[data-testid="puzzle-input"]');
  70  | 
  71  |     // Try a plausible move
  72  |     await moveInput.fill('e2e4');
  73  |     await moveInput.press('Enter');
  74  | 
  75  |     await page.waitForTimeout(200);
  76  | 
  77  |     // Check for success feedback or error
  78  |     const feedback = page.locator('[data-testid="puzzle-feedback"]');
  79  |     const feedbackVisible = await feedback.isVisible().catch(() => false);
  80  | 
  81  |     expect(feedbackVisible).toBeTruthy();
  82  |   });
  83  | 
  84  |   test('should show "Reveal Solution" button for wrong answer', async () => {
  85  |     await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });
  86  | 
  87  |     const moveInput = page.locator('[data-testid="puzzle-input"]');
  88  | 
  89  |     // Play wrong move (obviously wrong move)
  90  |     await moveInput.fill('a2a3');
  91  |     await moveInput.press('Enter');
  92  | 
  93  |     await page.waitForTimeout(200);
  94  | 
  95  |     // Should show reveal button
  96  |     const revealButton = page.locator('[data-testid="reveal-solution"]');
  97  |     const isVisible = await revealButton.isVisible().catch(() => false);
  98  | 
  99  |     expect(isVisible).toBeTruthy();
  100 |   });
  101 | 
  102 |   test('should show solution when reveal button clicked', async () => {
  103 |     await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });
  104 | 
  105 |     // Make wrong move to show reveal button
  106 |     const moveInput = page.locator('[data-testid="puzzle-input"]');
  107 |     await moveInput.fill('a2a3');
  108 |     await moveInput.press('Enter');
  109 | 
  110 |     await page.waitForTimeout(200);
  111 | 
  112 |     // Click reveal button
```