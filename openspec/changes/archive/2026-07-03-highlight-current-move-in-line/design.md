# Design: Current Move Highlight in Line Detail

## Context

Users navigating through selected engine analysis lines (via keyboard arrows or board moves) cannot easily track their current position within the move sequence. While the "Move N of M" counter exists, it requires conscious reading. The move notation display ("1. e4 e5 2. ♘f3...") is the primary visual representation of the line, making it the natural place to show current position.

The line detail box already displays when a line is selected, alongside the deselect button. The `currentMoveIndex` state variable is already maintained in App.tsx and passed through props to ChatPanel.

## Goals / Non-Goals

**Goals:**
- Highlight the current move in the SAN notation display with bold text and a yellow square indicator
- The indicator moves dynamically as the user navigates (arrow keys, board moves)
- Works in all modes except puzzle mode
- Minimal visual distraction; highlight should enhance readability, not clutter the UI

**Non-Goals:**
- Changing how the move notation is generated (stays SAN with piece glyphs)
- Modifying the move matching or line selection logic
- Adding sound or animations beyond the visual highlight
- Highlighting moves in puzzle mode
- Creating new state variables or complex state management

## Decisions

### Decision 1: Where to implement the highlight rendering
**Choice**: Render the highlight in ChatPanel's selected line detail box (where the move notation is displayed).

**Rationale**: 
- The move notation is displayed in ChatPanel, so the highlight logic should be co-located there
- No need to pass highlighted notation back through props; generate it at the display layer
- Cleaner separation: App.tsx maintains `currentMoveIndex`, ChatPanel renders with the highlight

**Alternative considered**:
- Create a utility function in App.tsx to return pre-highlighted notation
- Rejected: Adds complexity and creates tight coupling between app state and UI formatting

### Decision 2: How to represent the highlight
**Choice**: Bold text + small yellow (#FFD700 or similar) square positioned before the move notation.

**Rationale**:
- Bold alone is sufficient and familiar (standard for emphasis)
- Yellow square provides a secondary visual cue that moves with the position, making it easier to track during rapid navigation
- Small size keeps it non-intrusive

**Alternative considered**:
- Colored background highlight (e.g., yellow background on the move text)
- Rejected: Could obscure the piece glyphs and make the notation harder to read; bold + square is cleaner

### Decision 3: Move notation parsing and highlighting
**Choice**: Create a helper function that takes the move notation string and `currentMoveIndex`, then returns the annotated/highlighted version.

**Rationale**:
- Keeps ChatPanel render code clean
- Reusable if other components need this logic in the future
- Easy to test and maintain separately

**Example approach**:
```
formatHighlightedMoveNotation(notationString, currentMoveIndex)
// Input: "1. e4 e5 2. ♘f3 ♞f6", index: 1
// Output: "1. e4 🟨 **e5** 2. ♘f3 ♞f6"
```

### Decision 4: Highlight in puzzle mode
**Choice**: Disable highlighting entirely in puzzle mode; show moves without any highlight indicator.

**Rationale**:
- Puzzle mode has its own separate move stepping logic and doesn't use the engine lines / line selection flow
- Puzzle solutions are not presented in the line detail box context
- Keeps puzzle mode unchanged and reduces implementation scope

## Risks / Trade-offs

[Risk: Yellow square rendering across different browsers/devices]
→ Mitigation: Use a standard Unicode character (e.g., 🟨 yellow square emoji) or MUI Box with fixed background color. Test on Chrome, Firefox, Safari.

[Risk: Performance if notation string is very long]
→ Mitigation: Highlight computation is O(string length), negligible for typical 10-20 move lines. No memoization needed initially; optimize only if profiling shows an issue.

[Risk: Ambiguity in multi-digit move numbers (e.g., move 10 vs 1)]
→ Mitigation: Parse by move count, not string position. The helper function counts SAN move chunks (ignoring notation markers) to locate the correct move.

[Trade-off: Yellow square takes horizontal space]
→ Accepted: Space cost is minimal (1-2 chars). Alternative (background highlight) would reduce readability of the notation itself.

[Trade-off: Only works in line detail context]
→ Accepted: Puzzle mode and other displays don't need this feature per requirements. Future work can extend if needed.

## Migration Plan

1. Implement the helper function `formatHighlightedMoveNotation()` in a new utilities file or in ChatPanel.
2. Update ChatPanel's selected line detail box to use the helper when rendering `analysisEntries[selectedEngineLineIndex]?.description`.
3. Pass `currentMoveIndex` to the helper.
4. Test highlighting updates when `currentMoveIndex` changes (via arrow keys or board moves).
5. Verify highlight does not appear in puzzle mode (conditional rendering).

No breaking changes or data migrations required.

## Open Questions

- Exact emoji or symbol for the yellow square? (🟨 emoji vs. Unicode square vs. MUI Box)
- Should the highlight update synchronously or with a brief animation transition?
- Color/contrast: Is yellow (#FFD700) sufficient, or should it be brighter (e.g., #FFFF00)?
