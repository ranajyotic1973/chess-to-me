import { test, expect, DEFAULT_MOCK } from './fixtures/electronMock';

/**
 * Regression: a non-Analysis response (Opening/Middlegame/Endgame/Puzzle) renders
 * a response-type Chip in the ChatPanel. `Chip` must be imported — a missing
 * import crashed the whole panel with "Chip is not defined" when the LLM detected
 * Opening mode (e.g. "I want to learn about the Ruy Lopez").
 */

const OPENING_RESPONSE = JSON.stringify({
  response_type: "Opening",
  opening_name: "Ruy Lopez",
  eco_code: "C60",
  fen: "start",
  moves: [],
  story: "The Ruy Lopez is one of the oldest and most famous chess openings.",
  explanation: "Let's learn the Spanish Opening together!",
});

// Drive askQuestion to return the Opening lesson so the panel renders the badge.
test.use({ mock: { ...DEFAULT_MOCK, answer: OPENING_RESPONSE } });

test('Opening-mode response renders without crashing the ChatPanel', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });

  // Let the boot analysis backdrop (if any) clear so inputs are hittable.
  const backdrops = page.locator('.MuiBackdrop-root');
  for (let k = 0; k < await backdrops.count(); k++) {
    await backdrops.nth(k).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
  }

  // Ask a question that the (mocked) backend answers as an Opening lesson.
  const input = page.getByPlaceholder(/What plans should White consider/i);
  await input.fill('I want to learn about the Ruy Lopez');
  // Enter (without Shift) submits the question — avoids depending on the Ask
  // button's transient enabled/stable state during boot analysis.
  await input.press('Enter');

  // The panel must still be alive and show the Opening content (a crash would
  // blank the subtree and this text would never appear).
  await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="chat-panel"]')).toContainText(/Ruy Lopez|Spanish Opening/, { timeout: 10000 });
});
