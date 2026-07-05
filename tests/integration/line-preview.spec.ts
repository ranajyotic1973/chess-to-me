import { test, expect } from './fixtures/electronMock';
import { Chess } from 'chess.js';

/**
 * Integration coverage for the stateless line-preview popup:
 *  - A play icon on each engine line opens a preview popup.
 *  - The popup shows a board, instruction text, and a move counter; the user
 *    steps through the line with the keyboard arrow keys.
 *  - Opening/using the preview never changes the main board (it is stateless).
 *  - The X button closes the popup.
 */

const THEORY = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'];

function buildPosMap() {
  const chess = new Chess();
  const startFen = chess.fen();
  const posMap: Record<string, string> = {};
  posMap[startFen] = THEORY.join(' ');
  for (let i = 0; i < THEORY.length; i++) {
    const m = THEORY[i];
    chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: 'q' });
    posMap[chess.fen()] = THEORY.slice(i + 1).join(' ') || 'd2d4';
  }
  return { posMap, startFen };
}

async function installPositionAwareMock(page: import('@playwright/test').Page) {
  const { posMap, startFen } = buildPosMap();
  await page.addInitScript((cfg: { map: Record<string, string>; startFen: string }) => {
    const norm = (f?: string) => (!f || f === 'start' ? cfg.startFen : f);
    const build = (fen?: string) => {
      const pv = cfg.map[norm(fen)] || 'd2d4 d7d5 c2c4 e7e6 b1c3';
      const lines = [0, 1, 2, 3].map((i) => ({
        rank: i + 1,
        score: { type: 'cp', value: 30 - i * 5 },
        pv: i === 0 ? pv : 'd2d4 d7d5 c2c4 e7e6 b1c3',
      }));
      return { ok: true, analysis: { bestMove: pv.split(' ')[0], lines } };
    };
    const bus = () => { const a: any[] = []; return { a, reg: (cb: any) => { a.push(cb); return () => { const k = a.indexOf(cb); if (k >= 0) a.splice(k, 1); }; } }; };
    const es = bus(), ed = bus();
    const fire = (a: any[], p: any) => a.slice().forEach((cb) => { try { cb(p); } catch { /* noop */ } });
    const patch = () => {
      const api = (window as any).electronAPI;
      if (!api) { setTimeout(patch, 0); return; }
      api.onEngineAnalysisStart = es.reg;
      api.onEngineAnalysisDone = ed.reg;
      api.analyzePosition = async (x: any) => { fire(es.a, { engine: 'stockfish' }); const r = build(x && x.fen); fire(ed.a, { engine: 'stockfish' }); return r; };
      api.analyzeBoardPosition = api.analyzePosition;
      // Return no insights so the popup shows no balloons (mechanics test).
      api.getLinePreviewInsights = async () => ({ ok: true, insights: [] });
    };
    patch();
  }, { map: posMap, startFen });
}

async function bootBoard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="puzzle-board"] .square-e2 img', { timeout: 15000 });
}

function makeSettle(page: import('@playwright/test').Page) {
  const backdrops = page.locator('.MuiBackdrop-root');
  return async () => {
    for (let k = 0; k < await backdrops.count(); k++) {
      await backdrops.nth(k).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    }
  };
}

test.describe('Stateless line-preview popup', () => {
  test('opens from a line, navigates by keyboard, leaves the main board unchanged, and closes', async ({ page }) => {
    await installPositionAwareMock(page);
    await bootBoard(page);
    const settle = makeSettle(page);
    await settle();

    const popup = page.locator('[data-testid="line-preview-popup"]');
    const counter = page.locator('[data-testid="preview-move-counter"]');

    // No preview open initially.
    await expect(popup).toHaveCount(0);

    // The main board is at the start position (e2 pawn present).
    await expect(page.locator('[data-testid="puzzle-board"] .square-e2 img')).toBeVisible();

    // Click the play icon on the first engine line → preview opens.
    await page.locator('[data-testid="preview-line"]').first().click();
    await expect(popup).toBeVisible();
    await expect(page.locator('[data-testid="preview-instruction"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-board"]')).toBeVisible();
    await expect(counter).toHaveText(/Start/);

    // Step forward through the line with the arrow key.
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(/Move 1 \/ /);
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(/Move 2 \/ /);

    // Step back to the start.
    await page.keyboard.press('ArrowLeft');
    await expect(counter).toHaveText(/Move 1 \/ /);

    // The main board must be untouched by previewing (still at the start position).
    await expect(page.locator('[data-testid="puzzle-board"] .square-e2 img')).toBeVisible();

    // Close with the X button.
    await page.locator('[data-testid="close-preview"]').click();
    await expect(popup).toHaveCount(0);
  });
});
