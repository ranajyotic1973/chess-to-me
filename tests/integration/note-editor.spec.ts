import { test, expect } from './fixtures/electronMock';
import { Chess } from 'chess.js';

/**
 * Integration coverage for the WYSIWYG move-note editor (advanced analysis):
 *  - Clicking a move with no note opens the AI-import prompt, then the editor.
 *  - The editor is a rendering (contentEditable) surface; typed + formatted text
 *    is saved as markdown and round-trips back as rendered HTML on reopen.
 *  - A saved note marks its move and reopens directly (no AI prompt).
 *
 * Drives the real renderer against the mocked engine/LLM bridge with a
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

function makeSettle(page: import('@playwright/test').Page) {
  const backdrops = page.locator('.MuiBackdrop-root');
  return async () => {
    for (let k = 0; k < await backdrops.count(); k++) {
      await backdrops.nth(k).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    }
  };
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

test.describe('WYSIWYG move-note editor', () => {
  test('types + formats a note, saves as markdown, and reopens it rendered', async ({ page }) => {
    await installPositionAwareMock(page);
    await bootBoard(page);
    const dragMove = makeDragMove(page);
    const settle = makeSettle(page);
    const moveSpans = () => page.locator('[data-testid="chat-panel"] [data-testid^="move-"]');

    // Play 1.e4 e5 so there are played moves in the "Moves Played" box.
    await settle();
    await dragMove('e2', 'e4');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(1);
    await settle();
    await dragMove('e7', 'e5');
    await expect.poll(() => moveSpans().count(), { timeout: 8000 }).toBe(2);

    // Enter advanced analysis mode so moves become clickable for notes.
    await settle();
    await page.locator('[aria-label="advanced analysis"]').click();
    await settle();

    // Click the first move → AI import prompt → decline → empty editor opens.
    await page.locator('[data-testid="move-0"]').click();
    const aiDialog = page.getByText('Do you want to copy the AI notes into your notes?');
    await expect(aiDialog).toBeVisible();
    await page.getByRole('button', { name: 'No' }).click();

    const editor = page.locator('[data-testid="note-editor"]');
    await expect(editor).toBeVisible();

    // Type a note, select it, and apply Bold from the toolbar.
    await editor.click();
    await editor.pressSequentially('sharp attack');
    await expect(editor).toContainText('sharp attack');
    await page.keyboard.press('Control+A');
    await page.locator('[aria-label="bold"]').click();

    // Save the note (icon button).
    await page.locator('[aria-label="save note"]').click();
    await expect(editor).toHaveCount(0);

    // Reopen the same move: it now HAS a note, so the editor opens directly
    // (no AI prompt) and the saved markdown renders back as bold HTML.
    await page.locator('[data-testid="move-0"]').click();
    await expect(page.getByText('Do you want to copy the AI notes into your notes?')).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(editor).toContainText('sharp attack');
    const innerHtml = await editor.evaluate((el) => el.innerHTML);
    expect(innerHtml).toMatch(/<(b|strong)>/i);
  });
});
