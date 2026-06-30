## Why

Analysis mode is currently broken in three critical ways: (1) Selecting an engine line immediately drills down to the next position instead of letting users navigate the line step-by-step, breaking line exploration; (2) User moves via drag/drop don't match against engine lines and trigger no LLM analysis, leaving moves completely silent; (3) SelectableList items show multiline text regardless of list size, making single-item lists hard to scan. These issues prevent users from exploring lines interactively and understanding their own moves. The fix restores line-by-line navigation, implements real-time move matching and LLM analysis for every user move, and restricts text wrapping to single-item lists only.

## What Changes

- **Line selection** no longer auto-drills-down — selecting a line plays the first move on the board and shows explanation, user navigates forward/backward with arrow keys
- **User moves via drag/drop** now match against the first moves of engine lines; matching line is auto-selected and LLM explains the move
- **Off-book moves** (no match against engine lines) trigger engine analysis of the new position so candidates are always available
- **LLM is invoked for every user move** — whether matching an engine line, explaining a matched line, or analyzing a new position after an off-book move
- **SelectableList text wrapping** is restricted: multiple items always single-line (ellipsis), only single-item lists allow multiline
- **New `onBoardMove` callback** is implemented in App.tsx and passed to AnalysisBoard to handle user drag/drop moves

## Capabilities

### New Capabilities

- `user-move-matching`: User moves (drag/drop) are matched against engine lines from the current position; matching line is auto-selected
- `user-move-off-book-analysis`: When user move doesn't match any engine line, system invokes engine analysis on the new position and fetches new candidates
- `line-step-navigation`: After selecting an engine line, user can step through moves one-by-one with arrow keys (no auto-drill)
- `selectable-list-text-wrapping`: SelectableList conditionally restricts text wrapping: single item allows multiline, multiple items force single-line with ellipsis

### Modified Capabilities

- `analysis-and-llm-guidance`: LLM is now invoked for every user move (previously only on manual analysis start or line selection). LLM commentary is triggered on: (a) matched engine line selection, (b) arrow-key navigation through a line, (c) analysis of new position after off-book move
- `analysis-panel`: Board move callbacks (`onBoardMove`) are wired to analysis panel behavior — user move triggers line matching and analysis

## Impact

- **App.tsx**: Add `onBoardMove` handler; remove auto-drill-down from `handleSelectEngineLine`; implement move-matching logic to find first-move matches in `analysisLines`
- **AnalysisBoard.tsx**: Pass `onBoardMove` to AnalysisBoard component (prop already exists but unused)
- **SelectableList.tsx**: Update label and sublabel styling to conditionally apply multiline restriction based on item count
- **Main LLM flow**: Now triggered on every user move, not just manual analysis start (but maintains one-pipeline-per-question rule — one LLM call per move event)
