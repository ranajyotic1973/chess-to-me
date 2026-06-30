## Context

Chess To Me is an Electron-based chess training application for children (ages 4-18). The application features:
- Real-time engine analysis using Stockfish or LC0
- Interactive board with drag-and-drop piece movement
- LLM-powered explanations and puzzle generation
- Advanced Analysis mode for deep position study with notes and PGN tracking

Current issues stem from:
1. Fixed notation format (SAN only) with no user control
2. Static board sizing that doesn't account for advanced mode panels
3. Auto-selection of lines triggered by LLM mentions of "line 1/2/3"
4. Chessboard.js configuration allowing invalid piece placement
5. Missing save prompt for unsaved notes on mode exit
6. No PGN tracking during move navigation

The codebase uses React hooks for state management with refs for closure-safe value access (formStateRef, engineStatusRef, etc.). Board sizing is calculated in App.tsx and passed down to child components.

## Goals / Non-Goals

**Goals:**
- Enable users to view analysis lines in both SAN and UCI formats with a display toggle
- Automatically adjust board size when entering/exiting Advanced Analysis mode to prevent UI crowding
- Save position notes and prompt user on exit if unsaved changes exist
- Track PGN state in real-time as user navigates moves forward and backward
- Restrict drag-and-drop piece placement to legal squares only
- Eliminate automatic line selection from LLM response parsing
- Ensure all changes remain backward compatible and child-appropriate

**Non-Goals:**
- Adding new analysis features beyond fixing current bugs
- Changing the LLM provider or model selection logic
- Modifying puzzle generation or difficulty calculations
- Adding new training modes or game variants

## Decisions

### 1. Notation Display (SAN vs UCI)

**Decision:** Add a state variable `notationFormat` that toggles between "san" and "uci". Update `parseStockfishLine()` in analysisHelpers.ts to generate both formats. Display the current format in the SelectableList and provide a toggle button in ChatPanel.

**Rationale:** Users need visual choice without duplicating data. Generating both formats during parsing (once per analysis) is more efficient than converting on-demand during rendering.

**Alternatives considered:**
- Store both formats in AnalysisEntry upfront (chosen approach)
- Convert format on-the-fly during rendering (less efficient)
- Only support one format (doesn't meet user needs)

### 2. Advanced Analysis Board Sizing

**Decision:** Modify the `boardSize` calculation in App.tsx to reduce the board dimension when `advancedAnalysisMode === true`. Account for visible chat panel (min 320px) and notes panel (280-320px) by reducing the available width for board sizing from 60% to 40%.

**Rationale:** Advanced mode shows 3 panels side-by-side (board, chat, notes). Reducing board width from 60% to 40% of available space keeps the interface usable and prevents overflow.

**Alternatives considered:**
- Stack panels vertically in advanced mode (breaks wide-screen layout)
- Make board smaller/larger dynamically (chosen approach balances usability)
- Show/hide panels at breakpoints (requires mobile-first redesign)

### 3. Position Notes Save Prompt

**Decision:** Add state `advancedAnalysisNotesModified` to track if notes changed. Before closing Advanced Analysis mode, check this flag. If true, show Dialog asking "Save notes to PGN annotation?" with Save/Discard options. On Save, call `electronAPI?.annotateGamePgn()` to update the PGN with note metadata.

**Rationale:** Users may spend time writing analysis notes and expect them to persist. A prompt prevents accidental loss while respecting user choice.

**Alternatives considered:**
- Auto-save all notes (can clutter PGN with incomplete thoughts)
- Discard notes on exit silently (loses data)
- Show prompt for every exit (annoying; chosen approach only prompts on modifications)

### 4. Real-Time PGN Tracking

**Decision:** Update `currentRawPgn` state on every board move by:
- Appending moves to PGN during forward navigation
- Rebuilding PGN from move history during backward navigation
- Use chess.js's `.pgn()` method to generate canonical PGN format

**Rationale:** PGN must reflect the current position state so that Advanced Analysis saves the correct game state with notes. Move-by-move updates keep PGN in sync.

**Alternatives considered:**
- Update PGN only on explicit save (misses intermediate state)
- Generate PGN from scratch every move (inefficient)
- Store moves list and generate PGN on demand (chosen approach via incremental updates)

### 5. Legal Moves Only Drag-and-Drop

**Decision:** Update `onDrop` handler in AnalysisBoard.tsx to validate move legality. The existing chess.js instance already handles validation (returns null for illegal moves). Keep the current snapback behavior. Additionally, consider constraining visual drop feedback via chessboard.js configuration if available (onDragMove callback to show valid square hints).

**Rationale:** chess.js already validates moves; we just need to ensure the snapback mechanism works correctly. For improved UX, add visual feedback showing valid destination squares during drag.

**Alternatives considered:**
- Highlight valid squares before drag (complex, requires pre-computing legal moves)
- Disable dragging entirely in certain modes (too restrictive)
- Use snapback only (current approach; most compatible with chessboard.js)

### 6. Remove Auto-Selection Logic

**Decision:** Delete lines 2227-2246 in App.tsx that auto-detect line numbers in LLM responses and auto-select those lines. This includes:
- `detectLineNumberInText()` calls on user question and LLM response
- `setSelectedEngineLineIndex()` and `setSelectedEngineLineData()` auto-calls

**Rationale:** Auto-selection bypasses user intent and causes unwanted move playback. Explicit user clicks provide full control.

**Alternatives considered:**
- Add setting to toggle auto-selection (adds complexity for rare use case)
- Keep logic but add confirmation before auto-playing (better but still hidden)
- Remove entirely (chosen approach; simpler, matches user expectations)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Board becomes too small in Advanced Analysis mode on narrow screens | Use breakpoint: only show 3-column layout on screens ≥1024px wide. Below that, stack panels or hide notes |
| Changing notation format mid-analysis breaks reference moves | Add clear label showing current format; don't auto-switch format |
| PGN updates on every move may impact performance | Use `chess.js.pgn()` which is O(n) in move count; for typical games (40-80 moves), negligible |
| Removing auto-selection breaks workflows for users who relied on it | No users reported relying on auto-selection; this was filed as a bug, not a feature request |
| Legal-moves validation may cause edge cases with promotion logic | Preserve current promotion handling in onDrop (uses "q" default); no change to promotion flow |

## Migration Plan

1. **Prepare:** Create feature flags for each capability in case rollback needed
2. **Deploy:** Roll out changes in order: notation → legal moves → auto-selection removal → advanced layout → notes saving → PGN tracking
3. **Validation:** Test on narrow (375px) and wide (1920px) screens; test with 2-4 analysis lines; verify notes save on mode exit
4. **Rollback:** Each feature can be disabled independently via feature flag if issues arise

## Open Questions

- Should notation preference be persisted to localStorage across sessions, or reset per session?
- For Advanced Analysis notes, should we support exporting annotated PGN as a file download?
- Should PGN updates happen in memory only, or also sync to ElectronAPI for disk persistence?
