import { test as base, expect } from '@playwright/test';

/**
 * Deterministic mock for the Electron `window.electronAPI` bridge.
 *
 * Integration tests run against the renderer served by Vite (no Electron main
 * process, no real engine, no real LLM). This fixture injects a fake
 * `window.electronAPI` *before* the app bundle loads (App.tsx captures
 * `window.electronAPI` at module scope), so the app boots against mocked engine
 * analysis and LLM responses.
 *
 * Per-test overrides: `test.use({ mock: { ...DEFAULT_MOCK, explanation: 'x' } })`.
 */
export interface MockConfig {
  /** Engine lines returned by analyzePosition; pv is space-separated UCI. */
  lines: Array<{ rank: number; scoreCp: number; pv: string }>;
  /** Text returned by explainLines for a selected line. */
  explanation: string;
  /** Text returned by askQuestion for a chat question. */
  answer: string;
}

export const DEFAULT_MOCK: MockConfig = {
  lines: [
    { rank: 1, scoreCp: 30, pv: 'e2e4 e7e5 g1f3 b8c6 f1b5' },
    { rank: 2, scoreCp: 20, pv: 'd2d4 d7d5 c2c4 e7e6 b1c3' },
    { rank: 3, scoreCp: 12, pv: 'c2c4 e7e5 b1c3 g8f6 g1f3' },
    { rank: 4, scoreCp: 5, pv: 'g1f3 d7d5 d2d4 g8f6 c2c4' },
  ],
  explanation: 'Mock analysis: White fights for the centre and prepares to castle.',
  answer: 'Mock answer: develop your pieces and control the centre.',
};

/**
 * Runs in the browser context before any app script. Must be fully
 * self-contained (Playwright serialises it) — no imports or outer references
 * other than the injected `config` argument.
 */
function installElectronMock(config: MockConfig) {
  const noopUnsub = () => () => {};
  const lines = config.lines.map((l) => ({
    rank: l.rank,
    score: { type: 'cp', value: l.scoreCp },
    pv: l.pv,
  }));
  const bestMove = (lines[0]?.pv || 'e2e4').split(' ')[0];

  const api: Record<string, any> = {
    // ── Engine analysis ──────────────────────────────────────────────
    analyzePosition: async () => ({ ok: true, analysis: { bestMove, lines } }),
    analyzeBoardPosition: async () => ({ ok: true, analysis: { bestMove, lines } }),
    deepAnalyzeLines: async () => ({ ok: true, results: [] }),
    // `configured: true` + a `settings` object are required for the app to
    // leave the Settings view and render the analysis UI (App.tsx gate).
    getEngineStatus: async () => ({
      configured: true,
      ready: true,
      name: 'Stockfish (mock)',
      selectedEngine: 'stockfish',
      stockfishPath: '/mock/stockfish',
      settings: {
        llmProvider: 'ollama',
        ollamaModel: 'mock-model',
        ollamaBaseUrl: 'http://localhost:11434',
        llmModel: 'mock-model',
        analysisDepth: 20,
        explainLanguage: 'English',
        llmApiKeyLength: 0,
        puzzleRatingMin: 1000,
        puzzleRatingMax: 1500,
      },
    }),
    detectEngine: async () => ({ found: true, path: '/mock/stockfish' }),
    detectStockfish: async () => ({ found: true, path: '/mock/stockfish' }),
    browseForEngine: async () => ({ selected: true, valid: true, path: '/mock/stockfish' }),
    browseStockfish: async () => ({ selected: true, valid: true, path: '/mock/stockfish' }),
    setEnginePath: async () => ({ ok: true, path: '/mock/stockfish' }),
    stopEngine: async () => ({ ok: true }),
    ecoLookupFen: async () => null,

    // ── LLM ──────────────────────────────────────────────────────────
    explainLines: async () => ({ ok: true, explanations: [{ rank: 1, text: config.explanation }] }),
    askQuestion: async () => ({ ok: true, answer: config.answer, linesUsed: lines.length }),
    getAvailableModels: async () => ({ ok: true, models: ['mock-model'] }),
    setOllamaModel: async () => ({ ok: true, activeModel: 'mock-model' }),
    openingAsk: async () => ({ ok: true }),
    endgameAsk: async () => ({ ok: true }),
    puzzleExplainIncorrect: async () => ({ ok: true, explanation: config.explanation }),

    // ── Settings / system ────────────────────────────────────────────
    updateAppSettings: async (p: any) => ({ ok: true, settings: p || {} }),
    checkSettingsExist: async () => ({ exists: true }),
    getSystemStatus: async () => ({}),
    getProcessLogs: async () => ({ stockfish: [], ollama: [] }),
    openExternalUrl: async () => ({ ok: true }),

    // ── Chess tool bridge ────────────────────────────────────────────
    getBoardFen: async () => ({ fen: 'start' }),
    getLegalMoves: async () => ({ moves: [] }),
    validateMove: async () => ({ valid: true }),
    applyMove: async () => ({ ok: true }),

    // ── Database ─────────────────────────────────────────────────────
    dbStatus: async () => ({}),
    dbSearchPuzzles: async () => [],
    dbSearchGames: async () => [],
    dbImportStatus: async () => ({}),

    // ── Profile / points / conversation / notes ──────────────────────
    getDisplayName: async () => 'Tester',
    setDisplayName: async () => ({ ok: true }),
    getPoints: async () => ({ totalPoints: 0, streak: 0, solved: 0 }),
    recordSolve: async () => ({ totalPoints: 0, streak: 0, solved: 0 }),
    loadConversation: async () => ({ ok: true, history: [] }),
    saveConversation: async () => ({ ok: true }),
    notesGet: async () => null,
    notesSet: async () => {},
    saveAnalysisPgn: async () => ({ ok: true, path: 'mock.pgn' }),
    exportAnalysisPgn: async () => ({ ok: true, path: 'mock.pgn' }),
    loadAnalysisPgn: async () => ({ ok: false, cancelled: true }),
  };

  // Any un-enumerated method: `on*`/`onceX` → no-op unsubscribe; otherwise an
  // async no-op returning `{ ok: true }`. Keeps the app from ever hitting an
  // undefined electronAPI method during boot.
  const handler: ProxyHandler<Record<string, any>> = {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && prop.startsWith('on')) return noopUnsub;
      return async () => ({ ok: true });
    },
  };

  (window as any).electronAPI = new Proxy(api, handler);
}

export const test = base.extend<{ mock: MockConfig }>({
  mock: [DEFAULT_MOCK, { option: true }],
  page: async ({ page, mock }, use) => {
    await page.addInitScript(installElectronMock, mock);
    await use(page);
  },
});

export { expect };
