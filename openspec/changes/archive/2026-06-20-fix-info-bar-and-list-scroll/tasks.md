## 1. Status banner auto-dismiss

- [x] 1.1 In `src/App.tsx`, add a `useEffect` keyed on `statusMessage` that starts a 2-second `setTimeout` calling `setStatusMessage("")` whenever it changes to a non-empty value, clearing the previous timer on the next change or unmount
- [x] 1.2 Add the equivalent `useEffect` for `analysisStatus` (independent timer, same 2-second delay, same cleanup pattern)
- [x] 1.3 Manually verify: trigger a status message (e.g. via engine auto-detection or an invalid move) and confirm the floating `StatusBanner` alert disappears on its own after ~2 seconds without any further interaction
- [x] 1.4 Manually verify: trigger two different status messages in quick succession and confirm the banner shows the second message for its own full 2 seconds (the first message's timer does not cut the second one short)

## 2. SelectableList pinned header + scrollable content

- [x] 2.1 In `src/components/SelectableList.tsx`, keep `position: "sticky"` / `top: 0` on the detail-view header `Box` (first attempt removed this; restored after testing showed the header needs both sticky positioning *and* a bounded content region — see design.md Decision 2 revision note)
- [x] 2.2 Wrap the detail view's `{children}` in a new `Box` with `flexShrink: 1`, `minHeight: 0`, `maxHeight: "60vh"`, and `overflowY: "auto"`, keeping the header as a plain non-shrinking flex item above it
- [x] 2.3 Manually verify with Engine Analysis lines: enable advanced analysis mode, select a line so its deep-analysis content (Strategic Plans / Tactical Threats / etc.) is long enough to overflow, and confirm the back-button header stays fixed in place while only the content beneath it scrolls
- [x] 2.4 Manually verify with the Game list: select a game and confirm the back button remains visible and clickable regardless of how much detail content is shown
- [x] 2.5 Manually verify short content (a list item whose detail content is short) renders with no internal scrollbar and no extra empty space

## 3. Regression check

- [x] 3.1 Run the full test suite (`npm test`) and both typechecks (`tsc -p tsconfig.json --noEmit`, `tsc -p tsconfig.electron.json --noEmit`) to confirm no regressions
- [x] 3.2 Manually smoke-test via `npm run dev`: confirm other status messages (settings save, engine errors, move validation, line selection) still display correctly and now auto-dismiss after 2 seconds
- [x] 3.3 Manually confirm clicking the back button from a scrolled-down detail view returns to the full list (not a scrolled list view)

## 4. Issues discovered during testing

- [x] 4.1 Removed a pre-existing effect in `src/components/ChatPanel.tsx` that force-deselected the selected Engine Analysis line exactly 5 seconds after selection regardless of user activity — this directly fought the pinned-header/scrollable-content feature (the list would revert out from under the user while they were still reading)
- [x] 4.2 Found that `fetchPerMoveExplanation` in `src/App.tsx` sent its auto-generated "explain this move" question through the classified `askQuestion` pipeline, where it was being misrouted to the Opening Training agent (returning an opening intro/story instead of tactical analysis) — switched it to the existing dedicated `explainLines` IPC channel (`llm:explain-lines`), which bypasses classification entirely and is unambiguous for this UI-driven action; added an optional `question` override field to that channel for this purpose
- [x] 4.3 Manually verify: select an Engine Analysis line and confirm the explanation shown is a tactical/strategic analysis of that specific move, not an opening-lesson introduction
- [x] 4.4 Manually verify: select a line and wait/read for longer than 5 seconds — confirm the detail view no longer reverts to the list on its own
- [x] 4.5 Found that selecting a line previews its first move by updating `currentFen` (`applyLineMove`), which also re-triggers the pre-existing "auto-eval" effect in `App.tsx` — causing a second, redundant chess-engine analysis (its own spinner) and silently overwriting `analysisLines`/`analysisEntries` with a fresh analysis of the post-move position. Fixed by skipping auto-eval whenever an analysis line is currently selected (added `selectedEngineLineIndexRef`, mirroring the existing ref-sync pattern for `currentResponseTypeRef`)
- [x] 4.6 Found that the per-move explanation (now via `explainLinesSystemPrompt`) never included the line's move sequence — the prompt only asks for 3 short bullets, no SAN header. Rather than asking the LLM to reliably format SAN (unreliable, per earlier fixes this session), display the already-computed `analysisEntries[selectedEngineLineIndex].description` (glyphed SAN, same value already used for the list's sublabel) directly in `ChatPanel.tsx`'s detail view
- [x] 4.7 Manually verify: select a line and confirm only one spinner appears (LLM explanation), and the line's SAN move sequence is visible in the detail view alongside the explanation
- [x] 4.8 Manually verify: after selecting a line and reading the explanation, click back — confirm the original list of lines (same content as before selecting) is still shown, not a list recomputed from the previewed position
- [x] 4.9 Found that the per-move explanation never identified the opening or told any story — `explainLinesSystemPrompt` only asks for 3 tactical bullets. Fixed in `fetchPerMoveExplanation` (`App.tsx`) by looking up the opening name deterministically via the existing `electronAPI.ecoLookupFen` (same mechanism already used for the board's opening label) on the first move of a newly-selected line, and — only when a named opening is actually recognized — asking the LLM to name it and share a short story before the tactical explanation. Deliberately not forced for unrecognized (non-opening) positions, to avoid the LLM inventing an opening name/fact
- [x] 4.10 Manually verify: select a line starting from a recognized opening position and confirm the explanation now names the opening and includes a short story before the tactical bullets
- [x] 4.11 Manually verify: select a line starting from a non-opening (deep middlegame/endgame) position and confirm no fabricated opening name/story appears — just the tactical bullets

## 5. Scope addition: drill-down exploration with history stack

- [x] 5.1 Added `explorationStack` state in `App.tsx` (array of `{fen, lines, entries, listResponse}` frames) and reset it to `[]` at every point a fresh top-level analysis begins (auto-eval on a real move, manual "Start Analysis", a new question's engine lines, loading a game, puzzle reset, returning to a game list)
- [x] 5.2 Rewrote `handleSelectEngineLine` to push the current level onto `explorationStack` before drilling in, await the per-move explanation, then run `electronAPI.analyzePosition` (depth 5, multiPv 4) on the resulting position and replace `analysisLines`/`analysisEntries` with its candidates on success — clearing the line selection so the new list (not a detail view) is shown
- [x] 5.3 Added `drillRequestIdRef` to invalidate an in-flight drill if the user navigates away (clicks back) before it resolves
- [x] 5.4 Rewrote the back-button handler (`handleBackFromLine`) to pop `explorationStack` and restore the parent frame's fen/lines/entries/response directly (cache-backed, no fresh call) when the stack is non-empty; falls back to the prior simple "clear selection" behavior at the top level
- [x] 5.5 Added `showBackInList` to `SelectableList.tsx` so the list view (not just the detail view) shows a back button when a parent drill-down level exists, reusing the same `onBack` callback
- [x] 5.6 Added `isDrillLoading` state and a separate, sequential (not concurrent) loading indicator in `ChatPanel.tsx`, shown only after the per-move explanation finishes
- [x] 5.7 Found and fixed a critical bug before this could ship: the pre-existing auto-eval effect is keyed on `currentFen` and unconditionally clears `explorationStack`. Both the drill's `setCurrentFen(resultingFen)` and the back-handler's `setCurrentFen(parent.fen)` would have immediately re-triggered it, duplicating the engine call and wiping the history stack just built/restored. Fixed with a one-shot `suppressNextAutoEvalRef` flag set before each of those two calls and consumed at the top of the auto-eval effect
- [x] 5.8 Manually verify: after a real move, select line 1 — confirm a new list of candidate replies appears after the explanation loads, with no second/overlapping spinner
- [x] 5.9 Manually verify: drill into a line two levels deep, then click back twice — confirm each click instantly restores the previous level (lines, board position, response text) with no loading spinner
- [x] 5.10 Manually verify: after drilling in, the list view itself shows a back button (not just the detail view), and clicking it works
- [x] 5.11 Manually verify: making a new real board move after drilling in clears the drill-down history (no stale back button/levels left over)
