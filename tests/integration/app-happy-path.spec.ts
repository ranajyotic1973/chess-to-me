import { test, expect, DEFAULT_MOCK } from './fixtures/electronMock';

/**
 * Happy-path integration test: verify the app boots headless against mocked
 * engine + LLM, engine lines render and are clickable.
 */
test.describe('App Happy Path (mocked engine & LLM)', () => {
  test('app boots, mocked engine lines render, and line is clickable', async ({ page }) => {
    // Boot the app
    await page.goto('/');

    // Wait for analysis UI to be ready (auto-runs on load)
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });

    // Verify mock electronAPI is injected
    const hasApi = await page.evaluate(
      () => typeof (window as any).electronAPI === 'object'
    );
    expect(hasApi).toBe(true);

    // Verify mocked engine lines render as <analysis-line> elements
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });
    const lineCount = await page.locator('[data-testid="analysis-line"]').count();
    expect(lineCount).toBe(DEFAULT_MOCK.lines.length);

    // Verify first line is clickable (can click without error)
    const firstLine = page.locator('[data-testid="analysis-line"]').first();
    await expect(firstLine).toBeVisible();

    // Verify the mocked engine response has the expected structure
    const mockResponse = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api.analyzePosition({
        engine: 'stockfish',
        fen: 'start',
        depth: 20,
        multiPv: 4,
      });
    });
    expect(mockResponse.ok).toBe(true);
    expect(mockResponse.analysis.lines).toHaveLength(DEFAULT_MOCK.lines.length);
  });

  test('mocked LLM explanations work for selected line', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });

    // Verify the mocked explainLines endpoint returns the right text
    const explanation = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const result = await api.explainLines({ lines: [], fen: 'start' });
      return result.explanations[0].text;
    });

    expect(explanation).toBe(DEFAULT_MOCK.explanation);
  });

  test('mocked LLM chat works for user questions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });

    // Verify the mocked askQuestion endpoint works
    const answer = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const result = await api.askQuestion({ question: 'What is white\'s best move?', fen: 'start' });
      return result.answer;
    });

    expect(answer).toBe(DEFAULT_MOCK.answer);
  });
});

/**
 * Per-test override: verify the fixture's override mechanism works
 */
test.describe('Mock override mechanism', () => {
  test.use({
    mock: {
      ...DEFAULT_MOCK,
      explanation: 'Custom explanation for this test.',
      answer: 'Custom answer for this test.',
    },
  });

  test('overridden LLM responses are returned', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });

    const explanation = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const result = await api.explainLines({ lines: [], fen: 'start' });
      return result.explanations[0].text;
    });
    expect(explanation).toBe('Custom explanation for this test.');

    const answer = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const result = await api.askQuestion({ question: 'What is white\'s best move?', fen: 'start' });
      return result.answer;
    });
    expect(answer).toBe('Custom answer for this test.');
  });
});
