## Context

**Status banner:** `StatusBanner` (`src/components/StatusBanner.tsx`) renders `statusMessage` and `analysisStatus` as `position: fixed` alerts floating over the top of the app. Both strings are plain `useState` in `App.tsx`, set from roughly 40 different call sites (engine detection, settings save, move validation, line selection, etc.). None of those call sites ever clear the message — it persists until some *other* call site happens to overwrite it (or, in some flows, explicitly clears it with `setStatusMessage("")`). The user-visible effect is a banner that often never goes away.

**SelectableList:** `SelectableList` (`src/components/SelectableList.tsx`) is the shared list/detail component used for the Engine Analysis lines list and the Game search list inside `ChatPanel`. Its detail view renders a `position: sticky, top: 0` back-button header followed directly by `children` (the detail content — e.g. deep analysis fields, which can be long). Both the header and the content live inside `ChatPanel`'s single conversation-area `Box`, which has `overflowY: "auto"` and stacks every kind of message (banners, lists, markdown responses) as plain flow siblings. Because `SelectableList` has no height of its own, the sticky header only stays pinned while the user is scrolling *within that one block* — visually it still reads as "the whole control scrolls," especially once detail content is long enough to require scrolling.

## Goals / Non-Goals

**Goals:**
- Floating status/analysis messages disappear on their own 2 seconds after being shown, with one centralized fix rather than touching ~40 call sites.
- `SelectableList`'s detail view keeps its back-button header visually fixed in place while only the content below it scrolls.
- No change to `ChatPanel`'s overall layout or to how other (non-list) message types render.

**Non-Goals:**
- Guaranteeing a restarted timer when the *exact same* status string is set twice in a row (see Risks).
- Reworking `ChatPanel`'s conversation area into a full flex/scroll-region layout — `SelectableList` will own its own scroll behavior instead.
- Changing `StatusBanner`'s visual design, position, or the alert severities it uses.

## Decisions

### Decision 1 — Auto-clear `statusMessage`/`analysisStatus` via a single centralized effect in `App.tsx`

Add one `useEffect` per state value (`statusMessage`, `analysisStatus`) that starts a 2-second `setTimeout` clearing the value whenever it changes to a non-empty string, cleaning up the pending timer on the next change or unmount.

```ts
useEffect(() => {
  if (!statusMessage) return;
  const t = setTimeout(() => setStatusMessage(""), 2000);
  return () => clearTimeout(t);
}, [statusMessage]);
```
(same pattern for `analysisStatus`)

**Why centralize here instead of at each call site?** ~40 call sites set these strings today. Adding `setTimeout` logic to each one is repetitive, easy to get wrong, and easy to forget on the next new call site. A single effect keyed on the state value covers every existing and future call site for free.

**Alternative considered:** Add an `onExpire` callback prop to `StatusBanner` and start the timer inside the component. Rejected — `StatusBanner` is currently a pure presentational component with no callback props; this would require new prop plumbing for the same outcome the App-level effect achieves with less code.

### Decision 2 — `SelectableList` combines a sticky header with a bounded, independently-scrolling content region

In the detail view, the header keeps `position: sticky, top: 0` (its original behavior) AND `children` is wrapped in its own `Box` with `maxHeight: "60vh"` and `overflowY: "auto"`.

**Revision note:** the first implementation attempt *dropped* `position: sticky` in favor of relying solely on the bounded content region, on the theory that the header would then never need to move at all. In practice this made things worse: `SelectableList`'s root element has no height of its own, so once the header (now `flexShrink: 0`, not sticky) plus up to `60vh` of content exceeded the space available in `ChatPanel`'s outer scrolling box, that outer box scrolled the *entire* `SelectableList` — header included — exactly reproducing "the whole control scrolls." Restoring `position: sticky` on the header fixes this: while the user scrolls `ChatPanel`'s outer box and `SelectableList` is in view, the header pins to the top of that scroll container, and the bounded content region underneath it scrolls independently once its own content exceeds `60vh`. The two mechanisms are complementary, not alternatives — sticky handles "the header doesn't leave the screen while this block is in view," and `maxHeight`/`overflowY` handles "very long content gets its own scrollbar instead of growing the page indefinitely."

**Why self-contained instead of restructuring `ChatPanel`?** `ChatPanel`'s conversation area stacks several unrelated content types (status chips, puzzle banners, plain markdown responses, lists) inside one scroll box. Making `SelectableList` respond correctly to "is it the only thing in the box right now" would require conditionally changing the parent's flex/overflow behavior based on which child is active — fragile and invasive. The sticky header + bounded content combination achieves the pinned-header UX without touching `ChatPanel` at all.

**Why `60vh` and not a pixel value or `flex: 1`?** A viewport-relative cap stays reasonable across window sizes without requiring `ChatPanel` to hand `SelectableList` an exact pixel height via flex layout. It is a pragmatic choice, not a precise one — see Open Questions.

### Decision 3 — Discovered during testing: remove the 5-second auto-deselect, and stop routing per-move explanations through the classifier

Two pre-existing issues surfaced while verifying Decision 2 in the running app:

1. `ChatPanel.tsx` had an effect that called `onDeselectLine()` exactly 5 seconds after a line was selected, unconditionally. This directly fights the pinned-header goal — there is no point pinning a header so a user can read long content if the control reverts to the list out from under them after 5 seconds regardless of what they're doing. Removed entirely; returning to the list is now only ever a result of the user clicking the back button (already covered by Decision 2's scenario, now made explicit as its own scenario in the spec).
2. The per-move explanation feature (`fetchPerMoveExplanation` in `App.tsx`) sent its question through `askQuestion`, which runs PASS 1 classification before generating an answer. That classifier was inconsistently routing auto-generated questions like "Explain the move c7c5 (move 1 in the line)..." to the Opening Training agent instead of Analysis — because the line being explained is, by definition, often an opening sequence, the classifier conflates "explaining moves that happen to be opening theory" with "teach me this opening." The result: instead of a tactical/strategic explanation of the selected move, the panel showed an Opening Training intro/story, which read as "detail missing."

   Fixed by switching this call to the existing `llm:explain-lines` IPC channel, which has no classification step — it goes straight to `explainLinesSystemPrompt` + the engine line content. Added an optional `question` field to that channel's payload so the existing per-move question text (which is more specific than the channel's generic "explain this engine line" default) can still be used. This is strictly better than fixing the classifier prompt: there is no ambiguity to resolve in the first place, since the UI action that triggers this call already knows unambiguously that it wants a move explanation, not a chat-routed answer.

### Decision 4 — Scope addition: selecting a line drills into a fresh analysis of the resulting position, with stack-based history

After fixing Decisions 2–3, testing revealed the user's actual expectation went further: selecting a line shouldn't just preview-and-explain its first move — it should run a *new* analysis of the position after that move and present its top candidates as a new list, so the user can keep exploring deeper one move at a time (a drill-down move tree, not a fixed-line replay).

**Mechanism:**
- `handleSelectEngineLine` now: (1) snapshots the current level (`{fen, lines, entries, listResponse}`) onto a new `explorationStack`, (2) awaits the existing per-move explanation, (3) applies the move locally to get the resulting FEN, (4) runs `electronAPI.analyzePosition` (depth 5, multiPv 4 — same parameters as the existing auto-eval) on that FEN, and (5) on success, replaces `analysisLines`/`analysisEntries` with the new candidates and clears the line selection — so the *list* (not a detail view) reappears, now showing the deeper position's options.
- `handleBackFromLine` pops the stack (if non-empty) and restores the popped frame's `fen`/`lines`/`entries`/`listResponse` directly — no re-fetch, matching Decision (issue 2 from testing) that back-navigation should be cache-backed.
- A `drillRequestIdRef` counter invalidates in-flight drill requests if the user navigates away (clicks back) before a drill's analysis call resolves, so a stale result can never overwrite state the user has already navigated past.

**Bug caught before shipping:** the pre-existing auto-eval effect (Decision in the original `selectedEngineLineIndexRef` fix, see task 4.5) is keyed on `currentFen` and unconditionally calls `setExplorationStack([])` on success (it assumes any FEN change is a "real" new position needing a fresh top-level analysis). Both the drill-down's `setCurrentFen(resultingFen)` and the back-handler's `setCurrentFen(parent.fen)` are FEN changes that effect doesn't know are "already handled" — left unguarded, it would immediately re-run, duplicating the engine call and wiping the just-restored/just-built `explorationStack`. Fixed with a one-shot `suppressNextAutoEvalRef` flag, set immediately before each of those two `setCurrentFen` calls and consumed (checked-and-cleared) at the top of the auto-eval effect's timer callback.

**Why a stack instead of a single "previous level"?** The user explicitly wants to keep drilling deeper move by move, each time being able to back out one level — a single saved "previous" value only supports one level of undo. The stack is not meaningfully more complex than a fixed two-level version, just generalized to arbitrary depth.

**Why does the list view need its own back button?** Drilling in *replaces* `analysisLines` rather than hiding the old list behind a detail view (unlike the normal select-a-line flow), so once a drill succeeds the user is looking at a list with no selected item — `SelectableList` previously only ever showed a back button in its detail view. Added `showBackInList`, shown when `explorationStack` is non-empty, using the same `onBack` callback.

## Risks / Trade-offs

- **Identical consecutive status messages won't restart the timer** — `useEffect`'s dependency check is value equality, so calling `setStatusMessage("Position updated.")` twice in a row without an intervening change won't reset the 2-second window the second time. → Accepted: this is rare in practice (most messages are dynamic — engine names, line numbers, error text) and not worth the complexity of a version counter wrapping all 40 call sites.
- **`60vh` is a guess at a good cap** — on very short windows it could feel cramped, on very tall windows it could leave a lot of dead space below if content is short. → Mitigation: the wrapper only scrolls if content actually exceeds the cap; short content just renders at its natural height, so the trade-off only bites for long content on small windows.
- **Two scroll regions (outer `ChatPanel` box + inner `SelectableList` content)** can occasionally both show scrollbars if the page is also long. → Accepted as standard nested-scroll UX; not a functional problem.

## Migration Plan

Renderer-only change, no data or IPC shape changes, no migrations. Rollback is reverting the commit.

## Open Questions

- Is `60vh` the right cap, or should `SelectableList` instead receive an explicit height from `ChatPanel` (e.g. via `flex: 1` once the conversation area is restructured)? Deferred — can be revisited if `60vh` feels wrong once visible in the app.
- Should puzzle/game banners that currently render above `SelectableList` in `ChatPanel` also get pulled out of the scroll flow, or is `SelectableList`'s self-contained fix sufficient? Out of scope for this change — only `SelectableList` itself is being touched.
