## Why

The displayed app version (title bar and splash screen) is maintained by hand and drifts from the actual release tag, so users and support can't trust it. Separately, the auto LLM explanation only appears after White's second move, which now feels late because the model describes positions accurately even earlier. Finally, the analysis panel only surfaces the *played* moves; there is no quick way to read the full move sequence of the engine line a user has selected, and the growing list of controls eats vertical space that can't be reclaimed.

## What Changes

- **Version single-sourced from the git tag.** The version shown in the window title bar and on the splash screen is derived from the git tag at build time instead of a hand-edited literal, so both always match the release and each other.
- **Earlier auto explanation.** Lower the auto LLM explanation trigger so it fires from move 2 (the position after both sides' first move, e.g. after `1.e4 e5`) instead of waiting for move 3.
- **New "Moves of selected line" control.** Add a control, styled like the existing "Moves Played" control, that lists every move of the currently selected engine line (its principal variation) in SAN, updating as the selection changes.
- **Collapsible line list.** Add a collapse/expand icon button to the "Top Lines" list control so the user can hide the list and reclaim vertical space now that an additional control is present.

## Capabilities

### New Capabilities
- `selected-line-moves-panel`: A read-only control that renders the full move sequence (SAN) of the currently selected engine line, mirroring the styling of the "Moves Played" control and clearing/updating when the selection changes.
- `collapsible-line-list`: A collapse/expand icon-button affordance on the analysis "Top Lines" list that toggles its visibility to free vertical space, defaulting to expanded.

### Modified Capabilities
- `analysis-and-llm-guidance`: The auto LLM explanation trigger threshold drops from move 3 to move 2 so explanations begin one move earlier.
- `build-distribution`: The app version displayed in the title bar and splash screen is sourced from the git tag rather than a hardcoded value.

## Impact

- `electron/main.ts` — `getAppVersion()` and the `BrowserWindow` title (`Chess To Me v${version}`).
- `index.html` — hardcoded `<div class="splash-version">v1.6.0</div>` becomes a build-time-injected value; likely a small build/version script plus `vite.config.ts` / `package.json` scripts.
- `src/App.tsx` — the auto-explanation gate (`moveNumber >= 2 && activeColor === 'b'` today) that decides when `fetchExplanations` runs.
- `src/components/ChatPanel.tsx` — hosts the new "Moves of selected line" control and the collapse/expand toggle on the "Top Lines" `SelectableList`.
- New `src/components/SelectedLineMoves.tsx` (+ test) for the moves-of-selected-line control.
- Unit tests for any new pure helpers (SAN derivation of a line's PV) and integration tests for the new control and the collapse/expand interaction (mock engine + mock LLM, headless).
