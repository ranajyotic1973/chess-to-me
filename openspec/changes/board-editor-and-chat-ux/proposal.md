## Why

Position setup during analysis is slow and error-prone with the current import-only workflow. Players need a fast way to drag pieces around, place them precisely, and validate positions before analyzing. Additionally, the chat interface lacks standard keyboard shortcuts and visual indicators, making it feel less polished than comparable analysis tools.

## What Changes

- Add a **board editor modal** accessible via an icon button in the board controls. Users can drag pieces from organized lists (White and Black) onto the board, drag pieces off to delete them, and validate the final position using chess.js.
- **Clear Board** and **Reset to Start Position** buttons within the modal for quick position reset during setup.
- **Chat keyboard shortcuts**: Enter sends the message, Shift+Enter creates a newline (standard for chat applications).
- **Provider-aware Ask button**: Replace text button with an icon button that displays the active LLM provider's logo or name badge (using FontAwesome where available).
- **Icon-based Clear button** in chat: Replace text "Clear" button with a small icon-only button for a more compact interface.

## Capabilities

### New Capabilities
- `board-position-editor`: Modal interface for drag-and-drop piece placement, deletion, and position validation using chess.js. Includes Clear Board and Reset to Start controls.
- `chat-message-input-ux`: Keyboard-driven chat input (Enter to send, Shift+Enter for newlines) and provider-aware button styling (Ask button with logo/icon, Clear as icon).

### Modified Capabilities
<!-- No existing capability specs need changes at the requirement level -->

## Impact

**Files Modified:**
- `src/components/AnalysisBoard.tsx` - Board component to support position editor modal integration
- `src/components/ChatPanel.tsx` - Chat input handling, button styling
- `src/App.tsx` - Modal state management, handler integration
- Possibly new component: `src/components/BoardPositionEditor.tsx` (board editor modal)

**Libraries:**
- chess.js (already in use) - for position validation
- @mui/material (already in use) - for modal and button components
- @fortawesome/react-fontawesome (if not present) - for provider logos

**UI/UX Impact:**
- New modal workflow for board setup (non-breaking, additive)
- Chat input behavior more standard (non-breaking, improved UX)
- Button styling refined for consistency
