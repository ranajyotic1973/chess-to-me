## Why

Two UI papercuts in the analysis/chat experience make the app feel unpolished: the floating status banner (`StatusBanner`) never disappears on its own — once a status or analysis message is set, it sits fixed over the top of the app until something else happens to overwrite it. Separately, inside `ChatPanel`'s list/detail control (`SelectableList`, used for Engine Analysis lines and the Game list), selecting an item scrolls its back-button header away with the rest of the page content instead of keeping it pinned, making it awkward to get back to the list while reading a long explanation.

## What Changes

- `statusMessage` and `analysisStatus` (the two strings `StatusBanner` renders as floating alerts) auto-clear 2 seconds after being set, instead of persisting indefinitely until the next status update overwrites them.
- `SelectableList`'s detail view (shown after selecting an item) is restructured so the back-button header stays pinned at the top of its panel, and only the `children` content below it scrolls — instead of the header and content scrolling together with the rest of the chat conversation area.
- **Scope addition, discovered during testing:** selecting an Engine Analysis line now does more than preview its moves and explain the first one — it also runs a fresh engine analysis of the resulting position and presents those candidate moves as a new selectable list, letting the user drill move-by-move into the position tree. Each level is cached on a history stack so backing out is instant (no repeat LLM/engine calls) and restores exactly what was there before drilling in. The list view itself gains a "back" button when a parent level exists, since drilling in replaces the current list rather than just hiding it behind a detail view.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `modular-analysis-layout`: `StatusBanner` messages now auto-dismiss after a fixed delay instead of persisting until overwritten; `SelectableList`'s detail view keeps its header pinned and scrolls only its content region instead of scrolling as one block with the page; selecting an Engine Analysis line drills into a fresh analysis of the resulting position as a new list, with stack-based history for instant, cache-backed "back" navigation through each level explored.

## Impact

- `src/App.tsx` — add a single centralized effect that auto-clears `statusMessage` and `analysisStatus` 2 seconds after each update, replacing the current behavior where ~40 call sites set these strings with no expiry. Adds `explorationStack` (drill-down history), `handleSelectEngineLine`/`handleBackFromLine` rewritten to drill in / pop history, and a one-shot suppression flag so the pre-existing auto-eval effect doesn't redundantly re-analyze (and wipe history) on the FEN changes drilling causes.
- `src/components/SelectableList.tsx` — detail view restructured to a fixed header + independently scrollable content region; list view gains an optional back button for when a parent drill-down level exists.
- `src/components/ChatPanel.tsx` — the conversation area container that hosts `SelectableList` adjusted so the list gets a defined height to scroll within; wires the new drill-down loading indicator and parent-level back button.
- `fetchPerMoveExplanation` switched from the classified `askQuestion` pipeline to the dedicated `llm:explain-lines` channel (no classification step), fixing a misrouting bug where per-move questions were sometimes answered by the Opening Training agent instead of an analysis explanation. Also enriches the prompt with the opening name + a short story when the position is a recognized opening (via the existing deterministic `ecoLookupFen`, not LLM-guessed).
- No backend data-shape changes beyond an additive optional `question` field on the existing `explainLines` IPC payload.
