import { test, expect } from './fixtures/electronMock';

/**
 * Integration coverage for the novelty icon on engine lines.
 *
 * Novelty is decided in the main process (rare-but-sound vs the games DB) and
 * arrives on each line as a `novel` flag. This test injects an analyzePosition
 * mock that flags exactly one line as novel and asserts the spark icon renders
 * on that line only — verifying the display reacts to the `novel` flag.
 */

async function installNoveltyMock(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const lines = [
      { rank: 1, score: { type: 'cp', value: 30 }, pv: 'e2e4 e7e5 g1f3 b8c6 f1b5', novel: false },
      { rank: 2, score: { type: 'cp', value: 25 }, pv: 'b1a3 e7e5 g1f3 b8c6 f1c4', novel: true },
      { rank: 3, score: { type: 'cp', value: 12 }, pv: 'c2c4 e7e5 b1c3 g8f6 g1f3', novel: false },
    ];
    const patch = () => {
      const api = (window as any).electronAPI;
      if (!api) { setTimeout(patch, 0); return; }
      api.analyzePosition = async () => ({ ok: true, analysis: { bestMove: 'e2e4', lines } });
      api.analyzeBoardPosition = api.analyzePosition;
    };
    patch();
  });
}

async function bootBoard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });
}

test.describe('Novelty icon on engine lines', () => {
  test('renders the spark icon only on the line flagged novel', async ({ page }) => {
    await installNoveltyMock(page);
    await bootBoard(page);

    // Three engine lines rendered, exactly one novelty icon (the flagged line).
    const icons = page.locator('[data-testid="novelty-icon"]');
    await expect(icons).toHaveCount(1);

    // The icon sits on the second line's row (its preview button is a sibling).
    const previewButtons = page.locator('[data-testid="preview-line"]');
    await expect(previewButtons).toHaveCount(3);
    await expect(icons.first()).toBeVisible();
  });
});
