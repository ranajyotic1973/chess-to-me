## Context

Four small, mostly independent UI/build tweaks bundled into one change:

1. **Version drift.** `getAppVersion()` in [electron/main.ts](electron/main.ts) reads `package.json` `version` (`1.6.0`) for the window title (`Chess To Me v${version}`), while the splash screen in [index.html](index.html) hardcodes `<div class="splash-version">v1.6.0</div>`. Two independent literals that must be kept in sync by hand and drift from the git release tag.
2. **Late auto explanation.** The auto LLM explanation gate in [src/App.tsx](src/App.tsx) currently fires only when `moveNumber >= 2 && activeColor === 'b'` — i.e. after White's *second* move (move 3 territory). A ply-based refactor (`pliesFromFen` + `AUTO_EXPLAIN_MIN_PLIES = 2`) already exists in the working tree.
3. **No selected-line move list.** [src/components/SelectedLineDetail.tsx](src/components/SelectedLineDetail.tsx) shows the *played* moves ("Moves Played"), but nothing lists the full move sequence of the selected engine line.
4. **Vertical space pressure.** [src/components/ChatPanel.tsx](src/components/ChatPanel.tsx) renders the "Top Lines" `SelectableList` always-expanded; adding another control makes vertical space scarce.

Constraints from project rules: buttons are FontAwesome icon buttons unless otherwise noted; keep components lean with no unnecessary wrappers; event-driven with minimal state; all logic files need matching unit tests; all board/panel interactions need headless integration tests with mock engine + mock LLM; web assets use relative paths only.

## Goals / Non-Goals

**Goals:**
- Single source of truth (the git tag) for the version shown in the title bar and splash screen.
- Auto LLM explanation begins one move earlier (from the position after `1.e4 e5`).
- A "Moves of selected line" control styled like "Moves Played".
- A collapse/expand icon button on the Top Lines list.

**Non-Goals:**
- Changing the version *scheme* or release/tagging workflow (`release.yml` already triggers on `v*.*.*`).
- Changing engine analysis timing, depth, multiPV, or the LLM prompt content.
- Persisting the collapse state across sessions.
- Reworking `SelectedLineDetail` beyond what's needed to share SAN derivation.

## Decisions

### 1. Version from git tag — build-time propagation via package.json
A prebuild step derives the version from the git tag and writes it into `package.json` `version`; both surfaces then read from that single value.

- A small script (e.g. `scripts/sync-version.mjs`) runs `git describe --tags --abbrev=0` (or exact-match on CI), strips the leading `v`, and writes it to `package.json` `version`. Fallback to the existing `package.json` version (or `0.0.0-dev`) when no tag is reachable.
- Wire it as a `pre`-step of `build`/`dist:*` in `package.json` scripts so it runs before Vite and electron-builder.
- **Title bar**: no change needed — `getAppVersion()` already reads `package.json`, which the script keeps in sync.
- **Splash**: replace the hardcoded literal with a placeholder (`%APP_VERSION%`) and add a tiny `transformIndexHtml` hook in [vite.config.ts](vite.config.ts) that substitutes the `package.json` version at build and dev-serve time.

*Alternatives considered:* (a) Inject the splash version at runtime via IPC — rejected: the splash renders before React/IPC is ready, so it must be static at build time. (b) A Vite `define` global consumed by the renderer — doesn't help the pre-React splash markup and adds a second source; the package.json path keeps one source that electron-builder also honors.

### 2. Auto-explanation threshold — ply-based gate at 2 plies
Replace the `moveNumber >= 2 && activeColor === 'b'` condition with a ply-count check: explain once the position has at least 2 plies (the position after `1.e4 e5`). This is exactly the `pliesFromFen(...) >= AUTO_EXPLAIN_MIN_PLIES` (`= 2`) form already present in the working tree.

- The apply step SHALL **reconcile with the existing working-tree refactor** rather than re-introduce a parallel gate — confirm both the effect gate and any duplicate gate inside `handleAnalysisSuccess` use the single ply threshold.
- Keep the FEN-dedupe (`explanationFenRef`) and the "entries describe this FEN" guard unchanged so each position is still explained exactly once.

*Alternative considered:* keep the color+fullmove condition and just relax it — rejected: the ply count is unambiguous and already the direction the code is moving.

### 3. "Moves of selected line" control — new lean component reusing parsed line moves
Add `src/components/SelectedLineMoves.tsx` (+ `.test` for any pure helper) rendering the selected line's move sequence in SAN, styled to match the "Moves Played" block in `SelectedLineDetail`.

- Source the moves from the already-parsed selected line entry (`AnalysisEntry.moves` / the selected line's PV) so we reuse existing parsing instead of re-deriving from raw engine strings.
- If SAN derivation is needed from UCI + base FEN, extract a shared pure helper (e.g. `lineMovesToSan(baseFen, uciMoves)`) so both `SelectedLineDetail` and the new control use one tested code path, with a raw-token fallback on unparseable moves (mirroring the existing `try/catch` in `convertToSAN`).
- Render conditionally in `ChatPanel` only when a line is selected; no wrapper beyond the styled box.

*Alternative considered:* add a second section inside `SelectedLineDetail` — rejected: that component is keyed to `playedMoves`; a separate component keeps responsibilities clean and testable.

### 4. Collapse/expand — local state in ChatPanel, FontAwesome icon button
Add a `collapsed` `useState` (default `false`, i.e. expanded) in `ChatPanel`. Render a FontAwesome chevron icon button (`chevron-up` when expanded, `chevron-down` when collapsed) adjacent to the "Top Lines" heading; gate the `SelectableList` body on `!collapsed`.

- Only the list body is gated — the "Moves Played", "Moves of selected line", and explanation sections stay rendered.
- Local UI toggle is acceptable minimal state; no store/event plumbing needed for a view-only affordance.

## Risks / Trade-offs

- **Working-tree conflict on the threshold** → The auto-explain refactor is already partly present uncommitted; apply must edit in place, not duplicate the gate. Verify with a focused diff before/after.
- **CI has no tags on shallow clones** → `git describe` can fail on shallow checkouts; the script must fall back to the `package.json` version (or `0.0.0-dev`) and never hard-fail the build. Ensure release CI fetches tags (`fetch-depth: 0` / `fetch-tags`).
- **Splash placeholder in dev** → If the Vite transform isn't wired for `serve`, dev shows the literal `%APP_VERSION%`; the transform must run in both dev and build.
- **Vertical layout regressions** → Collapsing changes panel height; integration test should assert siblings remain visible when collapsed.

## Open Questions

- Should the version fallback for an untagged local build be `0.0.0-dev`, the current `package.json` value, or `git describe` with commit suffix (e.g. `1.6.0-3-gabc123`)? Defaulting to the current `package.json` value keeps existing behavior; confirm during apply.
- Should the collapse state be remembered for the session (component-level) only, or is a fresh expand on each analysis acceptable? Spec defaults to expanded on new lines; session persistence is out of scope unless requested.
