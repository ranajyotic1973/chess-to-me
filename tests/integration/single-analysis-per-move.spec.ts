import { test, expect } from './fixtures/electronMock';
import { Chess } from 'chess.js';

/**
 * Regression: a single board move (whether played by dragging a piece or by
 * clicking an engine line) must trigger exactly ONE engine analysis and at most
 * ONE LLM explanation for the resulting position — never two.
 *
 * Previously two paths doubled up:
 *  - drag: AnalysisBoard.onDrop called runAnalysis directly AND via onBoardMove →
 *    handleBoardMove → runAnalysis.
 *  - line click: handleSelectEngineLine ran analysis AND the reactive
 *    "line selected" effect re-ran it for the same FEN.
 * The visible symptom was engine + LLM firing twice on a move mid-game.
 */
test.describe('Single analysis per move (no double engine/LLM invocation)', () => {
  test('each new position is analyzed once and explained at most once (drag + line-click mix)', async ({ page }) => {
    const theory = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7'];
    const chess = new Chess();
    const startFen = chess.fen();
    const posMap: Record<string, string> = {};
    posMap[startFen] = theory.join(' ');
    const fenAfter: string[] = [];
    for (let i = 0; i < theory.length; i++) {
      const m = theory[i];
      chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: 'q' });
      fenAfter.push(chess.fen());
      posMap[chess.fen()] = theory.slice(i + 1).join(' ') || 'd2d4';
    }

    // Position-aware mock: line 0's PV is always the real book continuation, so
    // clicking line 0 or dragging the book move both follow the same game.
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
        (window as any).__analyzeFens = [];
        (window as any).__explainFens = [];
        const origExplain = api.explainLines.bind(api);
        api.explainLines = async (...args: any[]) => {
          (window as any).__explainFens.push(args[0]?.fen);
          return origExplain(...args);
        };
        api.analyzePosition = async (x: any) => {
          (window as any).__analyzeFens.push(x && x.fen);
          fire(es.a, { engine: 'stockfish' });
          const r = build(x && x.fen);
          fire(ed.a, { engine: 'stockfish' });
          return r;
        };
        api.analyzeBoardPosition = api.analyzePosition;
      };
      patch();
    }, { map: posMap, startFen });

    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="analysis-line"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="puzzle-board"] .square-e2 img', { timeout: 15000 });

    const boardBox = (await page.locator('[data-testid="puzzle-board"]').boundingBox())!;
    await page.waitForFunction(
      ([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest('[data-testid="puzzle-board"]'); },
      [boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2],
      { timeout: 15000 }
    );

    const squareHittable = async (sq: string) => {
      const b = (await page.locator(`[data-testid="puzzle-board"] .square-${sq}`).first().boundingBox())!;
      await page.waitForFunction(
        ([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest('[data-testid="puzzle-board"]'); },
        [b.x + b.width / 2, b.y + b.height / 2],
        { timeout: 8000 }
      );
    };
    const dragMove = async (from: string, to: string) => {
      await squareHittable(from);
      await squareHittable(to);
      const s = await page.locator(`[data-testid="puzzle-board"] .square-${from} img`).first().boundingBox();
      const d = await page.locator(`[data-testid="puzzle-board"] .square-${to}`).first().boundingBox();
      if (!s || !d) throw new Error(`missing square ${from}->${to}`);
      const sx = s.x + s.width / 2, sy = s.y + s.height / 2;
      const dx = d.x + d.width / 2, dy = d.y + d.height / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.waitForTimeout(30);
      await page.mouse.move((sx + dx) / 2, (sy + dy) / 2, { steps: 6 });
      await page.mouse.move(dx, dy, { steps: 6 });
      await page.waitForTimeout(30);
      await page.mouse.up();
    };
    const backdrops = page.locator('.MuiBackdrop-root');
    const settle = async () => {
      for (let k = 0; k < await backdrops.count(); k++) {
        await backdrops.nth(k).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
      }
    };

    const methods = ['drag', 'drag', 'select', 'drag', 'select', 'drag', 'select', 'drag', 'select', 'drag'];
    const moveSpans = () => page.locator('[data-testid="chat-panel"] [data-testid^="move-"]');
    for (let i = 0; i < theory.length; i++) {
      await settle();
      await page.waitForTimeout(200);
      if (methods[i] === 'select') {
        await page.locator('[data-testid="analysis-line"]').nth(0).click({ timeout: 10000 });
      } else {
        await dragMove(theory[i].slice(0, 2), theory[i].slice(2, 4));
      }
      await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(i + 1);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    const analyzeFens: string[] = await page.evaluate(() => (window as any).__analyzeFens);
    const explainFens: string[] = await page.evaluate(() => (window as any).__explainFens);
    const countBy = (arr: string[]) => arr.reduce((acc: Record<string, number>, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
    const analyzeCounts = countBy(analyzeFens);
    const explainCounts = countBy(explainFens);

    // Every real game position must be analyzed exactly once and explained at most
    // once. (Ply 1 is intentionally not explained — too early, < 2 plies.)
    for (let i = 0; i < fenAfter.length; i++) {
      const f = fenAfter[i];
      expect(analyzeCounts[f] || 0, `ply ${i + 1} analyze count`).toBe(1);
      expect(explainCounts[f] || 0, `ply ${i + 1} explain count`).toBeLessThanOrEqual(1);
    }
  });
});
