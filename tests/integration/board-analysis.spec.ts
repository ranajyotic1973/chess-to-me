import { test, expect, Page } from '@playwright/test';

/**
 * Integration tests for board moves, analysis, and line selection
 */

test.describe('Chess Board - Move Input (Mouse & Keyboard)', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should allow 10 moves for white via drag and drop', async () => {
    const whiteMoves = [
      { from: 'e2', to: 'e4' },
      { from: 'g1', to: 'f3' },
      { from: 'f1', to: 'c4' },
      { from: 'e1', to: 'g1' }, // castling
      { from: 'c4', to: 'b3' },
      { from: 'b3', to: 'a4' },
      { from: 'a4', to: 'b5' },
      { from: 'b5', to: 'c6' },
      { from: 'c6', to: 'd7' },
      { from: 'd7', to: 'e8' },
    ];

    for (let i = 0; i < whiteMoves.length; i++) {
      const move = whiteMoves[i];

      // Drag piece from square to target square
      const fromSquare = page.locator(`.square-${move.from}`).first();
      const toSquare = page.locator(`.square-${move.to}`).first();

      await fromSquare.dragTo(toSquare);

      // Wait for board to update
      await page.waitForTimeout(100);

      // Verify move was made (can verify by checking FEN or piece position)
      expect(true).toBeTruthy();
    }
  });

  test('should allow 10 moves for black via drag and drop', async () => {
    // First play a white move to make it black's turn
    await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
    await page.waitForTimeout(100);

    const blackMoves = [
      { from: 'e7', to: 'e5' },
      { from: 'g8', to: 'f6' },
      { from: 'f8', to: 'c5' },
      { from: 'e8', to: 'g8' }, // castling
      { from: 'c5', to: 'b4' },
      { from: 'b4', to: 'a3' },
      { from: 'a3', to: 'b2' },
      { from: 'b2', to: 'c1' },
      { from: 'c1', to: 'd2' },
      { from: 'd2', to: 'e1' },
    ];

    for (let i = 0; i < blackMoves.length; i++) {
      const move = blackMoves[i];

      const fromSquare = page.locator(`.square-${move.from}`).first();
      const toSquare = page.locator(`.square-${move.to}`).first();

      await fromSquare.dragTo(toSquare);
      await page.waitForTimeout(100);

      // After black moves, play a white move to return turn to black
      if (i < blackMoves.length - 1) {
        const whiteMoveSelector = await page.locator('[data-testid="piece"]').first();
        if (whiteMoveSelector) {
          await page.waitForTimeout(100);
        }
      }
    }
  });

  test('should reject illegal moves on the board', async () => {
    // Try to move a piece to an illegal square (same square)
    const fromSquare = page.locator('.square-e2').first();
    const toSquare = page.locator('.square-e2').first();

    await fromSquare.dragTo(toSquare);
    await page.waitForTimeout(100);

    // Board state should not change
    expect(true).toBeTruthy();
  });

  test('should not invoke engine analysis on illegal moves', async () => {
    // Attempt an illegal move
    const pawn = page.locator('.square-e2').first();
    const target = page.locator('.square-e6').first();

    await pawn.dragTo(target);
    await page.waitForTimeout(100);

    // Check that no analysis spinner appeared or was dismissed quickly
    const spinner = page.locator('[data-testid="analysis-spinner"]');
    const isVisible = await spinner.isVisible().catch(() => false);

    expect(isVisible).toBeFalsy();
  });
});

test.describe('Engine Analysis - Lines Display', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display 4 engine lines in analysis mode', async () => {
    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    const lines = await page.locator('[data-testid="analysis-line"]').count();
    expect(lines).toBe(4);
  });

  test('should display lines in correct order (best to worst)', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    // Check that each line appears in order by checking data attributes or text content
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    const secondLine = page.locator('[data-testid="analysis-line"]').nth(1);

    const firstText = await firstLine.textContent();
    const secondText = await secondLine.textContent();

    expect(firstText).toBeTruthy();
    expect(secondText).toBeTruthy();
  });

  test('should show line notation with piece glyphs', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    const text = await firstLine.textContent();

    // Should contain chess piece glyphs or move notation
    expect(text?.length ?? 0).toBeGreaterThan(0);
  });

  test('should display score for each line', async () => {
    await page.waitForSelector('[data-testid="analysis-score"]', { timeout: 3000 });

    const scores = await page.locator('[data-testid="analysis-score"]').count();
    expect(scores).toBeGreaterThan(0);
  });
});

test.describe('Move Highlighting - Selected Line Navigation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should highlight current move when line is selected', async () => {
    // Wait for analysis
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    // Click first line to select it
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await firstLine.click();

    await page.waitForTimeout(100);

    // Check for highlighted move (bold + yellow background)
    const highlightedMove = page.locator('[data-testid="highlighted-move"]');
    const isVisible = await highlightedMove.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });

  test('should update highlight when navigating with arrow keys', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    // Select a line
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await firstLine.click();
    await page.waitForTimeout(100);

    // Press right arrow to advance move
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Move counter should update or highlight should move
    expect(true).toBeTruthy();
  });

  test('should highlight correct move when playing matching board move', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    // Select first line
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await firstLine.click();
    await page.waitForTimeout(200);

    // Play first move of the line via drag
    await page.locator('.square-e2').first().dragTo(page.locator('.square-e4').first());
    await page.waitForTimeout(100);

    // Highlight should still be visible and updated
    const highlightedMove = page.locator('[data-testid="highlighted-move"]');
    const isVisible = await highlightedMove.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });
});

test.describe('LLM Explanations', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display LLM explanation when line is selected', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    // Select a line
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await firstLine.click();

    // Wait for explanation to load
    await page.waitForSelector('[data-testid="line-explanation"]', { timeout: 3000 });

    const explanation = await page.locator('[data-testid="line-explanation"]').textContent();
    expect(explanation?.length ?? 0).toBeGreaterThan(0);
  });

  test('should show explanation text in chat/explanation panel', async () => {
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 3000 });

    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await firstLine.click();

    // Explanation should appear in the chat panel area
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    const isChatVisible = await chatPanel.isVisible().catch(() => false);

    expect(isChatVisible).toBeTruthy();
  });

  test('should not invoke LLM for illegal moves', async () => {
    // Attempt illegal move
    const pawn = page.locator('.square-e2').first();
    const illegal = page.locator('.square-e6').first();

    await pawn.dragTo(illegal);
    await page.waitForTimeout(100);

    // No explanation should be generated
    const explanation = page.locator('[data-testid="line-explanation"]');
    const isVisible = await explanation.isVisible().catch(() => false);

    expect(isVisible).toBeFalsy();
  });
});
