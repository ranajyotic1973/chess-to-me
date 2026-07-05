import { test, expect } from './fixtures/electronMock';
import { Chess } from 'chess.js';

/**
 * Integration coverage for two analysis-panel controls:
 *  - "Moves of selected line": lists the SAN move sequence of the selected engine
 *    line; appears on selection, updates as the selection/position changes, and is
 *    absent when nothing is selected.
 *  - Collapsible "Top Lines" list: a toggle hides/shows the list body to reclaim
 *    vertical space while sibling controls stay intact.
 *
 * Both drive the real renderer against the mocked engine/LLM bridge, using a
 * position-aware engine mock so book moves stay legal across plies.
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

// Injects a position-aware mock: line 0's PV is always the remaining book line for
// the current FEN, and the engine lifecycle events fire so the spinner backdrop
// clears (otherwise it intercepts drags/clicks).
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
    };
    patch();
  }, { map: posMap, startFen });
}

async function bootBoard(page: import('@playwright/test').Page) {
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
}

function makeDragMove(page: import('@playwright/test').Page) {
  const squareHittable = async (sq: string) => {
    const b = (await page.locator(`[data-testid="puzzle-board"] .square-${sq}`).first().boundingBox())!;
    await page.waitForFunction(
      ([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest('[data-testid="puzzle-board"]'); },
      [b.x + b.width / 2, b.y + b.height / 2],
      { timeout: 8000 }
    );
  };
  return async (from: string, to: string) => {
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
    await page.waitForTimeout(30);
    await page.mouse.move(dx, dy, { steps: 6 });
    await page.waitForTimeout(30);
    await page.mouse.up();
  };
}

function makeSettle(page: import('@playwright/test').Page) {
  const backdrops = page.locator('.MuiBackdrop-root');
  return async () => {
    for (let k = 0; k < await backdrops.count(); k++) {
      await backdrops.nth(k).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    }
  };
}

test.describe('"Moves of selected line" control', () => {
  test('is absent with no selection, appears once a line is selected, and updates as the line changes', async ({ page }) => {
    await installPositionAwareMock(page);
    await bootBoard(page);
    const dragMove = makeDragMove(page);
    const settle = makeSettle(page);
    const control = page.locator('[data-testid="selected-line-moves"]');
    const moveSpans = () => page.locator('[data-testid="chat-panel"] [data-testid^="move-"]');

    // At the starting position nothing is selected → control hidden.
    await expect(control).toHaveCount(0);

    // 1.e4 e5 reaches ply 2, where the first engine line auto-selects.
    await settle();
    await dragMove('e2', 'e4');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(1);
    await settle();
    await dragMove('e7', 'e5');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(2);

    // Control now shows the selected line's remaining book moves (starts 2.Nf3;
    // SAN is rendered with figurine glyphs, so assert on the glyph-free square).
    await expect(control).toBeVisible();
    const afterE5 = (await control.innerText()).trim();
    expect(afterE5).toContain('f3');

    // Advancing keeps the selection but changes the line's move sequence.
    await settle();
    await dragMove('g1', 'f3');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(3);
    await expect(control).toBeVisible();
    await expect.poll(async () => (await control.innerText()).trim(), { timeout: 8000 }).not.toBe(afterE5);
  });

  test('stays visible after selecting a line from the start position (post-analysis)', async ({ page }) => {
    // Regression: selecting a line near the start re-analyses the after-first-move
    // FEN whose move number is still 1. handleAnalysisSuccess used to deselect on
    // that branch, making the "Moves of selected line" box vanish once analysis
    // completed. It must survive because the user explicitly selected the line.
    await installPositionAwareMock(page);
    await bootBoard(page);
    const settle = makeSettle(page);
    const control = page.locator('[data-testid="selected-line-moves"]');
    const lines = page.locator('[data-testid="analysis-line"]');

    // No selection at the start → box hidden.
    await settle();
    await expect(control).toHaveCount(0);

    // Explicitly select the top engine line from the start position.
    await expect.poll(() => lines.count(), { timeout: 8000 }).toBeGreaterThan(0);
    await lines.first().click();

    // Box appears immediately on selection.
    await expect(control).toBeVisible();

    // ...and remains after the follow-up engine analysis settles (the bug).
    await settle();
    await page.waitForTimeout(200);
    await expect(control).toBeVisible();
  });
});

test.describe('Collapsible "Top Lines" list', () => {
  test('toggle hides and restores the list while sibling controls stay intact', async ({ page }) => {
    await installPositionAwareMock(page);
    await bootBoard(page);
    const dragMove = makeDragMove(page);
    const settle = makeSettle(page);
    const lines = page.locator('[data-testid="analysis-line"]');
    const toggle = page.locator('[data-testid="toggle-top-lines"]');
    const moveSpans = () => page.locator('[data-testid="chat-panel"] [data-testid^="move-"]');

    // Play one move so the "Moves Played" sibling control is present.
    await settle();
    await dragMove('e2', 'e4');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(1);

    // List starts expanded.
    await expect.poll(() => lines.count(), { timeout: 8000 }).toBeGreaterThan(0);
    await expect(toggle).toBeVisible();

    // Collapse: list body hidden, but the move-list sibling and chat panel remain.
    await toggle.click();
    await expect.poll(() => lines.count(), { timeout: 8000 }).toBe(0);
    expect(await moveSpans().count()).toBe(1);
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();

    // Expand: list body restored.
    await toggle.click();
    await expect.poll(() => lines.count(), { timeout: 8000 }).toBeGreaterThan(0);
  });
});
