# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: modes.spec.ts >> Analysis Modes >> Game mode should support game browsing features
- Location: tests\integration\modes.spec.ts:112:7

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
  4   |  * Integration tests for different analysis modes:
  5   |  * - Opening
  6   |  * - Middlegame
  7   |  * - Endgame
  8   |  * - Game mode
  9   |  */
  10  | 
  11  | test.describe('Analysis Modes', () => {
  12  |   let page: Page;
  13  | 
  14  |   test.beforeEach(async ({ browser }) => {
  15  |     page = await browser.newPage();
> 16  |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  17  |     await page.waitForSelector('[role="main"]', { timeout: 5000 });
  18  |   });
  19  | 
  20  |   test.afterEach(async () => {
  21  |     await page.close();
  22  |   });
  23  | 
  24  |   test('should switch to Opening mode', async () => {
  25  |     const openingTab = page.locator('[data-testid="mode-opening"]');
  26  |     await openingTab.click();
  27  |     await page.waitForTimeout(300);
  28  | 
  29  |     const isSelected = await openingTab.evaluate((el) =>
  30  |       el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
  31  |     );
  32  | 
  33  |     expect(isSelected).toBeTruthy();
  34  |   });
  35  | 
  36  |   test('should switch to Middlegame mode', async () => {
  37  |     const middlegameTab = page.locator('[data-testid="mode-middlegame"]');
  38  |     await middlegameTab.click();
  39  |     await page.waitForTimeout(300);
  40  | 
  41  |     const isSelected = await middlegameTab.evaluate((el) =>
  42  |       el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
  43  |     );
  44  | 
  45  |     expect(isSelected).toBeTruthy();
  46  |   });
  47  | 
  48  |   test('should switch to Endgame mode', async () => {
  49  |     const endgameTab = page.locator('[data-testid="mode-endgame"]');
  50  |     await endgameTab.click();
  51  |     await page.waitForTimeout(300);
  52  | 
  53  |     const isSelected = await endgameTab.evaluate((el) =>
  54  |       el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
  55  |     );
  56  | 
  57  |     expect(isSelected).toBeTruthy();
  58  |   });
  59  | 
  60  |   test('should switch to Game mode', async () => {
  61  |     const gameTab = page.locator('[data-testid="mode-game"]');
  62  |     await gameTab.click();
  63  |     await page.waitForTimeout(300);
  64  | 
  65  |     const isSelected = await gameTab.evaluate((el) =>
  66  |       el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
  67  |     );
  68  | 
  69  |     expect(isSelected).toBeTruthy();
  70  |   });
  71  | 
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
```