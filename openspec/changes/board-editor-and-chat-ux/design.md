## Context

The chess analysis app currently uses ChessboardJS for board rendering and react-chessboard for interactivity. Position setup is limited to FEN/PGN import via a dialog. The chat interface uses standard MUI Button components with text labels and a multiline TextField. The app already validates positions using chess.js, has LLM provider switching (Ollama, OpenAI, Anthropic, Grok, Gemini), and maintains conversation history.

## Goals / Non-Goals

**Goals:**
- Add a dedicated board editor modal for faster position setup via drag-and-drop
- Validate positions in real-time before applying to main board
- Implement standard chat keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Improve chat UI polish with provider-aware Ask button and icon-based Clear button
- Maintain backward compatibility with existing import workflow

**Non-Goals:**
- Replace ChessboardJS or chess.js libraries
- Add position templates or preset scenarios
- Implement undo/redo within the modal
- Change the main board rendering or analysis behavior
- Support touch-based drag-and-drop (desktop-focused implementation is acceptable)

## Decisions

### Decision 1: Board editor as separate modal component
**Choice:** Create `BoardPositionEditor.tsx` as a dedicated, reusable component that wraps the board in a controlled state.

**Rationale:** 
- Keeps board setup logic isolated from the main analysis flow
- Allows independent state management for the editing session
- Modal can be opened/closed without affecting main board until user confirms
- Testable in isolation

**Alternatives considered:**
- Inline editor in the main board area (too complex, affects layout)
- Edit mode toggle on main board (risky, could lose work if accidentally clicked)

### Decision 2: Drag-and-drop detection for piece deletion
**Choice:** Detect invalid drop targets in ChessboardJS's `onDrop` callback. If the target square is not in the range [a1-h8], treat it as a delete action.

**Rationale:**
- ChessboardJS's `onDrop` always fires, even for out-of-bounds drags
- Simple square-range check (regex: `/^[a-h][1-8]$/`) detects valid squares
- No need for custom drag listeners or visual drop zones
- Mirrors standard chess UI behavior (pieces snap back if invalid)

**Alternatives considered:**
- Visual trash zone next to board (requires more UI, less intuitive)
- Manual drag detection with mouse events (complex, fragile)

### Decision 3: Position validation with chess.js
**Choice:** Use chess.js's existing validation (instantiate `new Chess()` with the final FEN) and catch errors for invalid positions.

**Rationale:**
- Already a dependency, no new library needed
- Covers all rules: king count, pawn placement, side-to-move, castling rights, etc.
- Clear error messages can be extracted from error types

**Alternatives considered:**
- Custom validation logic (incomplete, duplicates chess.js logic)
- Validate piece counts only (misses many edge cases like pawns on 1st/8th rank)

### Decision 4: Piece picker UI structure
**Choice:** Render piece lists as clickable/draggable chip buttons in two horizontal rows (White and Black), each showing one instance of each piece type (K, Q, R, B, N, P).

**Rationale:**
- Simple, visual, organized layout
- Piece lists are visually distinct from the board
- Each piece type appears once (users understand they can place multiple copies)
- Horizontal layout fits modal width constraints

**Alternatives considered:**
- Piece count display (adds complexity, less intuitive)
- Vertical lists (less space-efficient in modal)
- Icon-only pieces (less accessible)

### Decision 5: Chat Enter key handling
**Choice:** Add `onKeyDown` handler to the TextField in ChatPanel. Check for Enter key; if Shift+Enter, allow newline; if Enter alone, send message.

**Rationale:**
- Standard chat UX pattern (Discord, Slack, etc.)
- Preserves multiline input for longer messages
- Can be toggled per settings if needed later

**Alternatives considered:**
- Modifier key (Ctrl+Enter to send) - less discoverable
- Button-only (current behavior) - less convenient
- Auto-send on Enter always (loses multiline support)

### Decision 6: Provider-aware Ask button styling
**Choice:** Render the Ask button as `<Button>` (not IconButton) with text + optional icon. The button text dynamically shows the provider name ("Ask Ollama", "Ask OpenAI", etc.). Use MUI icons or FontAwesome for provider logos.

**Rationale:**
- Text label is clearer than icon-only for new users
- Provider switching is visible at a glance
- FontAwesome has icons for major providers (OpenAI, Anthropic, etc.)
- MUI has built-in icon support for simplicity

**Alternatives considered:**
- Icon-only button (less discoverable, requires tooltip)
- Badge overlay on generic button (more complex styling)

### Decision 7: Clear chat as icon button
**Choice:** Replace the current "Clear" Button with a small IconButton, tooltip="Clear" showing a clear/trash icon.

**Rationale:**
- Reduces visual clutter in chat controls
- Tooltip provides discoverability
- Consistent with other compact icon buttons in the app (board controls)

**Alternatives considered:**
- Text button (current approach, less compact)
- Context menu (overengineering for a single action)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **ChessboardJS drag detection limits** - Out-of-bounds drag detection may not work perfectly on all browsers/versions | Test extensively on target browsers. Provide clear feedback on success/failure. Add fallback: if user drags outside bounds, piece snaps back and user can try again. |
| **Complex FEN handling** - User-constructed positions might have invalid FEN syntax (castling rights, en passant, turn) | Validate only the piece placement; let chess.js infer other fields. If user wants specific castling/en passant, extend modal later. |
| **Modal state sync** - If main board changes while editor modal is open, should we refresh the modal? | Store copy of FEN when modal opens. On OK, compare with main board; warn user if main board changed. For MVP, assume modal is used in isolation. |
| **Performance with many pieces** - Dragging pieces with 32+ on board could lag on slow devices | ChessboardJS handles this well. Test with full board. No optimization needed unless profiling shows issues. |
| **Keyboard accessibility** - Drag-and-drop is mouse-only, inaccessible to keyboard users | Add OK/Cancel buttons and Clear/Reset buttons for alternatives. Consider adding a "place by coordinates" input (e.g., "♔ on e1") in future iteration. |

## Migration Plan

1. **Phase 1 - Add modal component:**
   - Create `BoardPositionEditor.tsx` with board and piece lists
   - Wire up state management in App.tsx (modal open/close, editing state)
   - Add icon button to board controls to trigger modal

2. **Phase 2 - Implement drag-and-drop:**
   - Override `onDrop` in modal's board instance
   - Detect valid/invalid targets
   - Update local board state on successful drops

3. **Phase 3 - Add validation and controls:**
   - Implement chess.js validation on OK
   - Add Clear/Reset buttons
   - Add error display with fade-out

4. **Phase 4 - Chat improvements:**
   - Add `onKeyDown` handler to TextField
   - Update Ask button styling with provider name
   - Replace Clear button with IconButton

5. **Testing & Polish:**
   - Manual testing on board editor workflow
   - Chat keyboard shortcuts on different devices
   - Visual regression testing for button styling

6. **Rollback strategy:**
   - Modal is additive; if disabled, users fall back to import dialog
   - Chat changes are backward-compatible (same functionality, different UX)
   - No database/state migrations needed

## Open Questions

1. **Provider logos:** Should we use FontAwesome icons, or download official provider logos? FontAwesome is simpler; official logos are more branded.
2. **Error message style:** Should validation errors fade out automatically, or require user dismiss? MVP: auto-fade after 3-4 seconds.
3. **Piece drag UX:** Should the dragged piece show as semi-transparent/ghost? MVP: standard ChessboardJS behavior (piece follows cursor).
4. **Mobile support:** Drag-and-drop is harder on touch. Should we add an alternative "click to place" mode? Defer to future if needed.
