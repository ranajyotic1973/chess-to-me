## 1. Board Editor Modal - Component Setup

- [x] 1.1 Create `src/components/BoardPositionEditor.tsx` skeleton with modal structure
- [x] 1.2 Add modal state to `App.tsx` (isModalOpen, pendingFen)
- [x] 1.3 Add "Edit Board" icon button to board controls in `App.tsx` (next to Import/Play/Logs)
- [x] 1.4 Wire modal open/close handlers in App.tsx and pass to AnalysisBoard area
- [x] 1.5 Render white and black piece lists as horizontal button arrays in modal
- [x] 1.6 Render board display in modal using ChessboardJS with `draggable: true`
- [x] 1.7 Add Clear Board and Reset to Start buttons to modal
- [x] 1.8 Add OK and Cancel buttons to modal

## 2. Board Editor Modal - Piece List Drag-and-Drop

- [x] 2.1 Make piece list items draggable with `draggable="true"` HTML attribute
- [x] 2.2 Implement `onDragStart` handler on piece buttons to store piece type and color
- [x] 2.3 Implement `onDragOver` handler on board container to allow drops
- [x] 2.4 Implement `onDrop` handler on board to place piece at target square from list
- [x] 2.5 Update chess.js board state when piece is dropped on valid square
- [x] 2.6 Update board display after piece placement
- [x] 2.7 Test placing multiple pieces of same type (e.g., multiple pawns)

## 3. Board Editor Modal - Drag-to-Delete Implementation

- [x] 3.1 Override ChessboardJS `onDrop` handler in modal to detect invalid targets
- [x] 3.2 Implement square validation check: `/^[a-h][1-8]$/` to identify valid board squares
- [x] 3.3 When invalid target detected, remove piece from chess.js instance
- [x] 3.4 Update board display after piece deletion
- [x] 3.5 Test dragging pieces off all board edges
- [x] 3.6 Ensure pieces can be dragged back onto board if released on valid square

## 4. Board Editor Modal - Clear and Reset Controls

- [x] 4.1 Implement Clear Board button handler: create new `Chess()` instance
- [x] 4.2 Update board display to show empty position
- [x] 4.3 Implement Reset to Start button handler: set position to 'start'
- [x] 4.4 Update board display after reset
- [x] 4.5 Test both buttons independently and in sequence

## 5. Board Editor Modal - Position Validation

- [x] 5.1 Implement validation function using chess.js: `new Chess(fen)` to test FEN
- [x] 5.2 Catch errors and extract validation error messages (e.g., "White king is missing")
- [x] 5.3 Create error display component that shows error message in modal
- [x] 5.4 Implement auto-fade-out of error messages (3-4 second timeout)
- [x] 5.5 On OK button click, validate final position using chess.js
- [x] 5.6 If valid: close modal, update main board FEN, run analysis
- [x] 5.7 If invalid: show error message, keep modal open for corrections
- [x] 5.8 Test all common invalid scenarios: missing king, pawn on 1st/8th rank, too many kings

## 6. Chat Keyboard Shortcuts - Enter to Send

- [x] 6.1 Add `onKeyDown` handler to TextField in ChatPanel
- [x] 6.2 Detect Enter key press without Shift
- [x] 6.3 On Enter: trigger `onAskQuestion()` and clear input
- [x] 6.4 Detect Shift+Enter key combination
- [x] 6.5 On Shift+Enter: insert newline character, do NOT send message
- [x] 6.6 Prevent default Enter behavior (form submission)
- [x] 6.7 Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [x] 6.8 Test keyboard behavior with multiline input

## 7. Chat Button Styling - Provider-Aware Ask Button

- [x] 7.1 Extract LLM provider from `formState.llmProvider` in ChatPanel props
- [x] 7.2 Create provider name string ("Ask Ollama", "Ask OpenAI", etc.)
- [x] 7.3 Check if FontAwesome is available; if not, add `@fortawesome/react-fontawesome` dependency
- [x] 7.4 Map provider names to FontAwesome icons or MUI icon equivalents
- [x] 7.5 Update Ask Button to display: `[icon] Ask [Provider]`
- [x] 7.6 Update button styling for consistency with existing UI
- [x] 7.7 Test all 5 providers: ollama, openai, anthropic, grok, gemini
- [x] 7.8 Verify button updates when provider changes in settings

## 8. Chat Button Styling - Icon-Based Clear Button

- [x] 8.1 Replace `<Button>Clear</Button>` with `<IconButton>` in ChatPanel
- [x] 8.2 Choose appropriate icon (Clear icon from @mui/icons-material or FontAwesome)
- [x] 8.3 Add tooltip prop to IconButton: `tooltip="Clear"`
- [x] 8.4 Update button layout/alignment with Ask button
- [x] 8.5 Test click handler still works (calls `onClearQuestion()`)
- [x] 8.6 Verify visual appearance and spacing

## 9. Integration and Testing

- [x] 9.1 Test full board editor workflow: open modal → place pieces → OK → board updates
- [x] 9.2 Test error handling: place invalid position → show error → correct → OK
- [x] 9.3 Test chat Enter key with various message lengths and content
- [x] 9.4 Test provider switching and button update
- [x] 9.5 Test clear button removes all chat input
- [x] 9.6 Verify main analysis board is not affected by modal editing until OK is clicked
- [x] 9.7 Test modal close (Cancel) does not apply changes
- [x] 9.8 Test import dialog still works as alternative to modal editor

## 10. UI Polish and Edge Cases

- [x] 10.1 Test piece drag visual feedback (cursor, ghost image, etc.)
- [x] 10.2 Test error message fade-out timing (3-4 seconds)
- [x] 10.3 Test modal dialog styling and layout on different window sizes
- [x] 10.4 Test keyboard navigation (Tab through buttons, Enter to activate)
- [x] 10.5 Ensure disabled states on buttons when appropriate (e.g., OK with invalid position)
- [x] 10.6 Review color contrast and accessibility of all new UI elements
- [x] 10.7 Test on wide layout (board + chat side-by-side) and narrow layout

## 11. Documentation and Cleanup

- [x] 11.1 Add JSDoc comments to BoardPositionEditor component
- [x] 11.2 Update any relevant README or user guide if applicable
- [x] 11.3 Remove any console.log or debug code
- [x] 11.4 Run linter and fix any style issues
- [x] 11.5 Verify no console errors or warnings in dev tools
