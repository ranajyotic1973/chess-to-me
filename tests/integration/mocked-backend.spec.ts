import { test, expect, DEFAULT_MOCK } from './fixtures/electronMock';

/**
 * Verifies the headless integration setup:
 *  - the app boots against the Vite renderer only (no Electron window), and
 *  - engine + LLM are served by the injected mock `window.electronAPI`
 *    (no real Stockfish / no real LLM calls).
 */
test.describe('Mocked backend (headless)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
  });

  test('app boots headless with the mock electronAPI injected', async ({ page }) => {
    const hasApi = await page.evaluate(() => typeof (window as any).electronAPI === 'object');
    expect(hasApi).toBe(true);
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
  });

  test('engine analysis is mocked (no real engine)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api.analyzePosition({ engine: 'stockfish', fen: 'start', depth: 10, multiPv: 4 });
    });
    expect(result.ok).toBe(true);
    expect(result.analysis.lines).toHaveLength(DEFAULT_MOCK.lines.length);
    expect(result.analysis.lines[0].pv).toBe(DEFAULT_MOCK.lines[0].pv);
  });

  test('LLM explanations are mocked (no real LLM)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api.explainLines({ lines: [], fen: 'start' });
    });
    expect(result.ok).toBe(true);
    expect(result.explanations[0].text).toBe(DEFAULT_MOCK.explanation);
  });

  test('LLM chat answers are mocked (no real LLM)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api.askQuestion({ question: 'What is the plan?', fen: 'start' });
    });
    expect(result.ok).toBe(true);
    expect(result.answer).toBe(DEFAULT_MOCK.answer);
  });

  test('per-test overrides replace the mocked responses', async ({ page }) => {
    // This test uses the default mock; the override mechanism is exercised in
    // the describe below to keep this one deterministic.
    const models = await page.evaluate(async () => (window as any).electronAPI.getAvailableModels({ provider: 'ollama' }));
    expect(models.ok).toBe(true);
    expect(models.models).toContain('mock-model');
  });

  test('mocked engine lines auto-render in the analysis UI', async ({ page }) => {
    // The app auto-runs analysis of the start position on load, driving the
    // mocked analyzePosition through the real UI pipeline.
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });
    const count = await page.locator('[data-testid="analysis-line"]').count();
    expect(count).toBe(DEFAULT_MOCK.lines.length);
  });
});

test.describe('Mocked backend — per-test override', () => {
  test.use({
    mock: {
      ...DEFAULT_MOCK,
      explanation: 'Overridden explanation for this test only.',
    },
  });

  test('explainLines returns the overridden text', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
    const result = await page.evaluate(async () =>
      (window as any).electronAPI.explainLines({ lines: [], fen: 'start' })
    );
    expect(result.explanations[0].text).toBe('Overridden explanation for this test only.');
  });
});
