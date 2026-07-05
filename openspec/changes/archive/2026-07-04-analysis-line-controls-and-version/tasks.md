## 1. Version from git tag

- [x] 1.1 Add `scripts/sync-version.js` that reads the git tag (`git describe --tags --exact-match`, then `--abbrev=0`), strips the leading `v`, and writes it to `package.json` `version`; fall back to the current `package.json` version (or `0.0.0-dev`) when no tag is reachable.
- [x] 1.2 Wire the script as a pre-step (`sync:version`) of `build` in `package.json` scripts so it runs before Vite and electron-builder (all `dist:*` call `build`).
- [x] 1.3 Replace the hardcoded `<div class="splash-version">v1.6.0</div>` in `index.html` with a `%APP_VERSION%` placeholder.
- [x] 1.4 Add a `transformIndexHtml` hook in `vite.config.ts` that substitutes the `package.json` version for `%APP_VERSION%` in both dev-serve and build.
- [x] 1.5 Ensure release CI fetches tags (`fetch-depth: 0`) on all four build jobs so `git describe` succeeds; `getAppVersion()` still drives the title bar unchanged (reads `package.json`).
- [x] 1.6 Verify title bar and splash both read the derived version and match (script synced `package.json` to nearest tag `v1.5.0`; untagged HEAD exercised the fallback without failing).

## 2. Auto LLM explanation from move 2

- [x] 2.1 Auto-explanation gate is the ply-based `pliesFromFen(currentFen) >= AUTO_EXPLAIN_MIN_PLIES` (`= 2`); extracted `pliesFromFen` into `analysisHelpers.ts` (exported, imported by `App.tsx`) so it is unit-testable. No duplicate gate remains.
- [x] 2.2 Confirmed `handleAnalysisSuccess` has no move-number LLM gate (its `moveNumber > 1` check only auto-selects a line); the `explanationFenRef` dedupe and entries-describe-this-FEN guard are intact.
- [x] 2.3 Added `pliesFromFen` unit tests (start = 0, 1.e4 = 1, 1.e4 e5 = 2, 2.Nf3 = 3, malformed = 0) in `analysisHelpers.test.ts`.
- [x] 2.4 Covered by the existing `single-analysis-per-move` and `app-happy-path` "Per-position LLM explanation" integration tests, which already assert ply 0/1 are not explained and ply 2 (after 1.e4 e5) is.

## 3. "Moves of selected line" control

- [x] 3.1 Added `src/components/SelectedLineMoves.tsx` rendering the selected line's SAN moves (from the parsed entry's `description`), styled to match the "Moves Played" block; renders only when a line is selected and has moves.
- [x] 3.2 No new UCI→SAN derivation needed: the parsed `AnalysisEntry.description` already carries move-numbered SAN and `parseStockfishLine` guarantees only legal moves. Added `selectedLineMovesText(entry)` helper that surfaces it (empty when no entry/no moves).
- [x] 3.3 Added unit tests for `selectedLineMovesText` (description passthrough, null/undefined → "", empty moves → "") in `analysisHelpers.test.ts`.
- [x] 3.4 Wired `SelectedLineMoves` into `ChatPanel.tsx` (labelled "Moves of selected line") right after the "Moves Played" section, passing the selected line entry.
- [x] 3.5 Added `analysis-line-controls.spec.ts` test asserting the control is absent with no selection, appears once a line is selected (ply 2), and updates as the line changes.

## 4. Collapsible Top Lines list

- [x] 4.1 Added a `linesCollapsed` `useState` (default expanded) to `ChatPanel.tsx` and a chevron icon button (`ExpandLess`/`ExpandMore`, MUI icons to match the codebase — FontAwesome is not a project dependency) adjacent to the "Top Lines" heading.
- [x] 4.2 Gated only the `SelectableList` body on `!linesCollapsed`; "Moves Played", "Moves of selected line", and the explanation section stay rendered.
- [x] 4.3 Added `analysis-line-controls.spec.ts` collapse/expand test: clicking hides the list, clicking again restores it, and the played-moves sibling + chat panel stay intact while collapsed.

## 5. Verification

- [x] 5.1 `npm test` — 555 passed, 31 suites, 0 failures.
- [x] 5.2 `npx playwright test` — 27 passed, 0 failures (includes the 2 new control tests).
- [x] 5.3 `npm run build` — TypeScript + Vite succeed; splash renders `v1.5.0` (matches git tag & title bar).
- [x] 5.4 `graphify update .` — graph refreshed (4714 nodes, 4879 edges).
