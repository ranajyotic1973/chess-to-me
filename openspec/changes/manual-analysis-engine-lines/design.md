## Context

Currently, analysis starts automatically when pieces are moved on the board, and LLM provides move suggestions alongside engine analysis. Users have no control over analysis timing and must rely on LLM inference for move suggestions, which can be inaccurate. The app needs to separate concerns: engine provides analysis accuracy, LLM provides explanation.

The architecture uses:
- **Board State**: `boardManager` instance (chess.js) tracks current position
- **Analysis**: Engine analysis available via `performAnalysis()`
- **LLM Chat**: `runLlmChat()` receives analysis context
- **UI**: AnalysisBoard, ChatPanel components

## Goals / Non-Goals

**Goals:**
- Give users explicit control over when analysis runs (start/stop buttons)
- Display engine analysis lines with visual indicators (arrows on board)
- Use engine lines as source of truth for move suggestions
- Allow users to select and explore specific variations with keyboard navigation
- Maintain keyboard accessibility and visual clarity of selected line progression

**Non-Goals:**
- Opening book integration (future enhancement)
- Analysis caching/persistence beyond single session
- Cloud-based analysis
- Support for analysis depth modification mid-stream (use settings for depth control)

## Decisions

### 1. Manual Analysis Trigger (Start/Stop Buttons)

**Decision**: Add start/stop buttons to AnalysisBoard; remove auto-analysis on piece movement.

**Rationale**: 
- Users need explicit control to manage when expensive analysis runs
- Prevents unexpected performance impacts from casual board interactions
- Aligns with professional chess software UX patterns

**Alternatives Considered**:
- Toggle button that switches mode (rejected: less clear state)
- Hotkey only (rejected: discoverable for new users)
- Checkbox in settings (rejected: too static, needs runtime control)

**Implementation**:
- Add `isAnalysisRunning` state in App.tsx
- Add start/stop buttons in AnalysisBoard with clear labels
- Remove auto-trigger from `onBoardMove` callback
- Keep analysis button only for manual analysis start

### 2. Arrow Visualization on Board

**Decision**: Check if chessboard.js supports arrow drawing; if yes, draw arrows for first move of each engine line; if no, skip visualization in phase 1.

**Rationale**:
- Visual arrows make variations immediately clear
- chessboard.js is already integrated; reuse existing dependency
- Can defer if library doesn't support it

**Alternatives Considered**:
- Custom canvas overlay (rejected: complexity, maintenance burden)
- SVG layer (rejected: chessboard.js integration better)
- Hide feature until chessboard.js supports it (accepted as fallback)

**Implementation**:
- Investigation task: verify chessboard.js arrow API
- If available: draw arrows from current position to first move of each line
- If not available: display lines as text only (still selectable)
- Add `drawLineArrows()` function to visualize line starts

### 3. Engine-Driven Lines, Not LLM

**Decision**: Pass engine analysis lines directly to LLM context; request LLM provide explanation only, not move suggestions.

**Rationale**:
- Engine analysis is deterministic and accurate
- LLM explanation adds strategic context missing from raw engine lines
- Clear separation of concerns: engine for accuracy, LLM for insight

**Alternatives Considered**:
- Blend LLM and engine suggestions (rejected: confusing, inaccurate)
- Use only LLM without engine (rejected: defeats purpose of engine)
- Use only engine without LLM (rejected: misses strategic understanding)

**Implementation**:
- Update LLM system prompt to emphasize position explanation over move generation
- Include engine lines in every chat context: "Here are the top engine lines: [line 1], [line 2], etc."
- Request: "Explain why each line is strong; what are the ideas?"
- Detect moves in LLM response same as before (for visualization)

### 4. Line Selection and Memorization

**Decision**: Display engine lines with numbers (e.g., "1. e2-e4", "2. d2-d4"); user can click line in UI or tell LLM line number in chat; store selected line in `boardManager` state.

**Rationale**:
- Numbered display is compact and clear
- Clicking gives direct UI selection
- Voice selection through LLM matches existing chat interaction
- Storing in boardManager keeps state management centralized

**Alternatives Considered**:
- Radio buttons for selection (rejected: clutter, not voice-friendly)
- Only keyboard selection (rejected: not discoverable)
- Storing only in React state (rejected: not shared with engine tools)

**Implementation**:
- Add `selectedLineIndex` to `BoardStateManager`
- Render engine lines as clickable elements in ChatPanel
- Parse LLM response for "line X" pattern and set `selectedLineIndex`
- API: `boardManager.setSelectedLine(lineIndex)` and `getSelectedLine()`

### 5. Keyboard Navigation Through Line

**Decision**: Once line selected, use arrow keys (left/right) to navigate moves; update board position and display move number.

**Rationale**:
- Keyboard navigation is fast and accessible
- Arrow keys are standard for move navigation in chess UIs
- Line stays in memory; user can explore variations fluidly

**Alternatives Considered**:
- Click-based navigation only (rejected: slower, less intuitive)
- Pgup/Pgdn keys (rejected: arrow keys more standard)
- Auto-replay when line selected (rejected: user should control pacing)

**Implementation**:
- Add keyboard event listener in App.tsx: left/right arrow keys
- Listener active only when line is selected (`selectedLineIndex !== null`)
- Track current move index within selected line
- Call `applyMove()` for each step; call `getBoardFen()` to update board state
- Display "Move X of Y" indicator in ChatPanel

## Risks / Trade-offs

**[Risk] Chessboard.js may not support arrows**  
→ **Mitigation**: Include task to verify before design is finalized; fallback to text-only line display if unavailable

**[Risk] Arrow clutter if many lines displayed**  
→ **Mitigation**: Draw arrows only for first move of each line; further moves inferred by position

**[Risk] User confusion between LLM-suggested and engine-analyzed moves**  
→ **Mitigation**: Clear labeling in UI: "Engine Lines:" vs "Analysis:"; distinct visual sections

**[Risk] Keyboard nav conflicts with board move entry**  
→ **Mitigation**: Only enable arrow keys when line is selected AND analysis mode is active; fallback to board interaction otherwise

**[Risk] Performance if many deep lines analyzed**  
→ **Mitigation**: Limit display to top 4 lines (already in code); depth setting in SettingsPanel controls analysis depth

## Migration Plan

1. **Phase 1**: Add start/stop buttons; verify chessboard.js arrow support
2. **Phase 2**: Implement arrow visualization (or skip if unavailable)
3. **Phase 3**: Rewrite LLM prompt and line integration
4. **Phase 4**: Add line selection UI and memorization
5. **Phase 5**: Integrate keyboard navigation
6. **Phase 6**: Testing and refinement

**Rollback**: Feature is additive; old flow still works if feature disabled in settings. No database migrations needed.

## Open Questions

1. Does chessboard.js support custom arrow colors? (for visual distinction between lines)
2. Should selected line be persistent across position changes, or reset on board move?
3. Should LLM be able to automatically select a line based on analysis, or always require user selection?
4. Should keyboard nav work across multiple positions, or only after explicit line selection?
