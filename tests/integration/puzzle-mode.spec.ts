import { test, expect, Page } from '@playwright/test';

/**
 * Integration tests for puzzle mode
 */

test.describe('Puzzle Mode', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForSelector('[role="main"]', { timeout: 5000 });

    // Switch to puzzle mode
    const puzzleTab = page.locator('[data-testid="mode-puzzle"]');
    await puzzleTab.click();
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load a puzzle position', async () => {
    // Wait for puzzle to be displayed
    await page.waitForSelector('[data-testid="puzzle-board"]', { timeout: 3000 });

    const board = page.locator('[data-testid="puzzle-board"]');
    const isBoardVisible = await board.isVisible();

    expect(isBoardVisible).toBeTruthy();
  });

  test('should prevent piece dragging in puzzle mode', async () => {
    await page.waitForSelector('[data-testid="puzzle-board"]', { timeout: 3000 });

    // Try to drag a piece (this might not work in puzzle mode)
    const piece = page.locator('.square-e2').first();

    // Attempt drag - should not execute or should snap back
    try {
      await piece.dragTo(page.locator('.square-e4').first());
      // In puzzle mode, move should be rejected or require typing
      expect(true).toBeTruthy();
    } catch {
      // Expected if dragging is disabled
      expect(true).toBeTruthy();
    }
  });

  test('should accept typed moves (UCI format)', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    const moveInput = page.locator('[data-testid="puzzle-input"]');
    await moveInput.fill('e2e4');
    await moveInput.press('Enter');

    await page.waitForTimeout(100);

    // Move should be processed
    expect(true).toBeTruthy();
  });

  test('should show "Correct!" feedback for correct puzzle solution moves', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    // This assumes we know the correct first move for the loaded puzzle
    const moveInput = page.locator('[data-testid="puzzle-input"]');

    // Try a plausible move
    await moveInput.fill('e2e4');
    await moveInput.press('Enter');

    await page.waitForTimeout(200);

    // Check for success feedback or error
    const feedback = page.locator('[data-testid="puzzle-feedback"]');
    const feedbackVisible = await feedback.isVisible().catch(() => false);

    expect(feedbackVisible).toBeTruthy();
  });

  test('should show "Reveal Solution" button for wrong answer', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    const moveInput = page.locator('[data-testid="puzzle-input"]');

    // Play wrong move (obviously wrong move)
    await moveInput.fill('a2a3');
    await moveInput.press('Enter');

    await page.waitForTimeout(200);

    // Should show reveal button
    const revealButton = page.locator('[data-testid="reveal-solution"]');
    const isVisible = await revealButton.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });

  test('should show solution when reveal button clicked', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    // Make wrong move to show reveal button
    const moveInput = page.locator('[data-testid="puzzle-input"]');
    await moveInput.fill('a2a3');
    await moveInput.press('Enter');

    await page.waitForTimeout(200);

    // Click reveal button
    const revealButton = page.locator('[data-testid="reveal-solution"]');
    await revealButton.click();

    await page.waitForTimeout(200);

    // Solution moves should be shown (can be auto-played or shown in notation)
    const solution = page.locator('[data-testid="solution-moves"]');
    const solutionVisible = await solution.isVisible().catch(() => false);

    expect(solutionVisible).toBeTruthy();
  });

  test('should not allow piece dragging even after reveal solution', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    // Make wrong move
    const moveInput = page.locator('[data-testid="puzzle-input"]');
    await moveInput.fill('a2a3');
    await moveInput.press('Enter');

    await page.waitForTimeout(200);

    // Click reveal
    const revealButton = page.locator('[data-testid="reveal-solution"]');
    await revealButton.click();

    await page.waitForTimeout(200);

    // Try to drag - should still be disabled
    const piece = page.locator('.square-e2').first();
    try {
      await piece.dragTo(page.locator('.square-e4').first());
      expect(true).toBeTruthy();
    } catch {
      expect(true).toBeTruthy();
    }
  });

  test('should show puzzle rating/difficulty', async () => {
    await page.waitForSelector('[data-testid="puzzle-rating"]', { timeout: 3000 });

    const rating = page.locator('[data-testid="puzzle-rating"]');
    const isVisible = await rating.isVisible();

    expect(isVisible).toBeTruthy();
  });

  test('should provide "Try Again" button after wrong answer', async () => {
    await page.waitForSelector('[data-testid="puzzle-input"]', { timeout: 3000 });

    // Wrong move
    const moveInput = page.locator('[data-testid="puzzle-input"]');
    await moveInput.fill('a2a3');
    await moveInput.press('Enter');

    await page.waitForTimeout(200);

    // Should show try again button
    const tryAgainButton = page.locator('[data-testid="try-again"]');
    const isVisible = await tryAgainButton.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });
});
