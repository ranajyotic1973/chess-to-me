## Context

**Current State:** 
- `handleSelectEngineLine` (App.tsx:1145-1215) immediately drills down after selecting a line, analyzing the position after the first move and replacing the line list. This breaks line exploration.
- User moves via drag/drop call `onMoveAttempt` (puzzle-only callback) but have no handler for matching against engine lines or triggering LLM analysis.
- `onBoardMove` prop is defined in AnalysisBoard but never passed from App.tsx, leaving it unused.
- SelectableList applies `whiteSpace: "nowrap"` to labels, but allows sublabels to wrap and labels to wrap in tight spaces, causing inconsistent text layout.

**Constraints:**
- One LLM pipeline per user event (PASS 1 + PASS 2) per CLAUDE.md — move matching and analysis must be atomic within a single pipeline
- Engine lines are shallow (depth 5) from auto-eval; user moves must be matched against first moves only
- Arrow-key navigation already implemented in `handleKeyboardNavigation` (App.tsx:1242-1403) — must not duplicate logic

**Stakeholders:** End users exploring engine lines, analysis flow orchestration

## Goals / Non-Goals

**Goals:**
- Restore line-by-line interactive exploration: select line → show first move → navigate with arrow keys
- Implement move matching: user drag/drop → match against engine line first moves → auto-select and explain
- Implement off-book analysis: unmatched drag/drop → invoke engine on new position → show new candidates
- Restrict SelectableList wrapping: single item multiline, multiple items single-line

**Non-Goals:**
- Change keyboard navigation (already implemented)
- Change drill-down feature entirely (exploration stack still used for drilling into candidates from navigation)
- Modify engine analysis depth or parameters
- Add new puzzle mode behavior (move matching is analysis-mode only)

## Decisions

### Decision 1: Remove Auto-Drill-Down on Line Selection

**Choice:** After line selection, play the first move and stop. No automatic drill-down.

**Rationale:** 
- User explicitly selected a line to explore it; drilling down breaks the mental model
- Arrow-key navigation already handles move-by-move progression
- Exploration stack is still available if user wants to drill into a different line's continuation

**Implementation:**
- In `handleSelectEngineLine`, remove the drill-down code (lines 1188-1214)
- Keep line selection, first move explanation, and setting `currentMoveIndex = 0`
- Rely on existing effect at line 1468-1472 (`applyLineMove`) to update board when `currentMoveIndex` changes

**Alternatives Considered:**
- Keep drill-down, add a "step through" mode toggle: Too complex; selection should just explore the selected line
- Drill-down only on double-click: Inconsistent with single-click semantics

---

### Decision 2: Implement `onBoardMove` Handler for Move Matching

**Choice:** Create new `handleBoardMove` callback that matches user move against engine line first moves.

**Rationale:**
- AnalysisBoard already passes move to `onBoardMove`; we just need to implement the handler
- Move matching is a distinct concern from puzzle mode (`onMoveAttempt`)
- Single-line matching (only check first move of each line) is fast and deterministic

**Implementation:**
- Add `handleBoardMove` callback in App.tsx:
  ```typescript
  const handleBoardMove = useCallback((fen: string) => {
    // Match logic here
    if (!selectedEngineLineIndex || !analysisLines.length) {
      // No line selected, try to match against current lines
      matchAndAutoSelect(fen);
    }
  }, [analysisLines, selectedEngineLineIndex]);
  ```
- Pass to AnalysisBoard: `<AnalysisBoard ... onBoardMove={handleBoardMove} />`
- Match by comparing the move (from/to squares) against first move UCI of each line
- If match found: auto-select that line, invoke LLM for explanation
- If no match: invoke `runAnalysis` on new FEN, invoke LLM for off-book position analysis

**Alternatives Considered:**
- Synchronous match on Move objects: Would require parsing PV strings in real-time; async match on FEN is cleaner
- Match against all moves in line: Too expensive and unreliable after position diverges

---

### Decision 3: Invoke LLM for Every User Move

**Choice:** Trigger `explainLines` or `askQuestion` for every move event (matched line, navigation, or off-book position).

**Rationale:**
- Requirement: LLM should be invoked for every move
- Current code only explains on line selection and navigation; missing explanation for user drag/drop
- One pipeline per event (not per keystroke) — batching multiple arrow keys into one event would require debouncing

**Implementation:**
- On matched line: call `fetchPerMoveExplanation` with lineIndex, line, baseFen, moveIndex=0
- On arrow-key navigation: already calls `fetchPerMoveExplanation` (existing code OK)
- On off-book move (no match): call `askQuestion` or simpler LLM call to analyze the new position and its candidates

**Alternatives Considered:**
- Debounce rapid arrow-key presses into single LLM call: Would delay feedback; lose granularity; current per-key approach is simpler

---

### Decision 4: Restrict SelectableList Text Wrapping by Item Count

**Choice:** Apply `whiteSpace: "nowrap"` and `textOverflow: "ellipsis"` conditionally based on `items.length`.

**Rationale:**
- When multiple items exist, single-line format is scannable
- When only 1 item, wrapping allows full text visibility (no ambiguity loss)
- CSS-level change is performant and clean

**Implementation:**
- In SelectableList.tsx, compute wrapping mode: `const isSingleItem = items.length === 1`
- Apply to label: `whiteSpace: isSingleItem ? "normal" : "nowrap"`
- Apply to sublabel: `whiteSpace: isSingleItem ? "normal" : "nowrap"`
- Keep `textOverflow: "ellipsis"` and `overflow: "hidden"` in multi-item case

**Alternatives Considered:**
- Add a prop to override wrapping: Overkill for a list-count decision
- Truncate sublabel in multi-item: Would lose info; single-line label + ellipsis is cleaner

---

### Decision 5: Use Existing Arrow-Key Navigation for Line Stepping

**Choice:** Reuse `handleKeyboardNavigation` logic (already distinguishes line navigation from game mode, etc.).

**Rationale:**
- No duplicate logic
- Navigation already checks `selectedEngineLineIndex !== null` to enable line stepping
- FEN sequence and explanation fetching already implemented

**Implementation:**
- No changes to keyboard handler
- Remove auto-drill-down from `handleSelectEngineLine` so user can step through naturally

**Alternatives Considered:**
- Separate navigation handler for selected lines: Duplicates logic; existing handler is sufficient

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Move matching is brittle if UCI format changes** | UCI is stable chess standard; match by comparing from/to squares extracted from PV |
| **Off-book analysis increases LLM load** | Each unique user move = 1 LLM call; acceptable for interactive use (not batch); can be throttled if needed |
| **Auto-select on move match may surprise user** | Matches only when move is first in an engine line; rare; visual feedback (line highlights) helps |
| **Arrow-key navigation + rapid drag/drop could race** | Each move event sets `selectedEngineLineIndex`; last event wins; acceptable for sequential user input |
| **SelectableList wrapping change affects all uses of component** | Component is only used for analysis lines currently; safe to apply globally |

## Migration Plan

**Deployment:**
1. Merge all code changes to main
2. No database or settings changes required
3. No user migration needed (analysis mode behavior change is transparent)

**Rollback:**
- Revert to prior commit; no state corruption
- Users' saved analyses unaffected (saved as PGN, independent of UI state)

## Open Questions

1. **Should off-book analysis use shallow depth (5) or full depth?** Proposal: Use shallow depth to keep UX responsive; user can click "Analyze" button to run deeper
2. **Should explanation cache be cleared on board moves?** Proposal: Yes — new position means new explanations; cache is line-specific
3. **Should matched line auto-select suppress showing the explanation panel, or show it immediately?** Proposal: Show immediately with explanation for move 0
