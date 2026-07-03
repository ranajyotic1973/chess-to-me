## 1. Component Creation

- [x] 1.1 Create `src/components/AnalysisModal.tsx` with title, close (X) button, and content area for moves and analysis
- [x] 1.2 Add prop interface to accept `moves: string[]`, `analysis: string`, `onClose: () => void`, and `isOpen: boolean`
- [x] 1.3 Style the modal as a full-screen overlay or centered container with appropriate z-index and background

## 2. ChatPanel Integration

- [x] 2.1 Add state variable `isAnalysisModalOpen` to `ChatPanel.tsx`
- [x] 2.2 Add toggle function `toggleAnalysisModal()` and `closeAnalysisModal()` to `ChatPanel.tsx`
- [x] 2.3 Render `<AnalysisModal />` component inside `ChatPanel`, passing moves, analysis, and modal state
- [x] 2.4 Add icon button near the chat input to reopen the modal when closed (visible only after move 3)
- [x] 2.5 Pass analysis data (moves played and LLM response) to `AnalysisModal` when available

## 3. Move Count and Modal Visibility Logic

- [x] 3.1 Add logic to `ChatPanel` to determine current move index in the selected line
- [x] 3.2 Conditionally hide the modal if current move index < 2 (before move 3)
- [x] 3.3 Auto-show modal when LLM analysis response arrives AND current move index >= 2
- [x] 3.4 Hide/show the reopen icon button based on move count and modal state

## 4. Electron Main Process LLM Prompt Fix

- [x] 4.1 Locate the system prompt builder in `electron/main.ts` for move analysis requests
- [x] 4.2 Add explicit text to the system prompt: "Analyze ONLY the board position shown by this FEN and the moves provided. Do NOT predict or analyze moves beyond what has already been played."
- [x] 4.3 Add instruction: "Determine strategy, risks, and plans for both White and Black based strictly on the current position."
- [x] 4.4 Document the prompt change with a comment explaining the bug fix

## 5. Renderer IPC Request Update

- [x] 5.1 Identify the renderer code that calls the Electron main process for move analysis (likely in `ChatPanel.tsx` or a utility)
- [x] 5.2 Modify the IPC request to pass only the current FEN and an array of moves already played (not future moves)
- [x] 5.3 Ensure the renderer extracts "moves already played" from the line details (current position, not lookahead)
- [x] 5.4 Test that the IPC payload structure matches what the main process expects

## 6. Testing and Verification

- [x] 6.1 Manually test: Select a line and play moves 1 and 2 — verify modal is hidden
- [x] 6.2 Manually test: Play move 3 — verify modal appears once LLM response is received
- [x] 6.3 Manually test: Click X button — verify modal closes and chat is visible
- [x] 6.4 Manually test: Click reopen icon button — verify modal reappears with same content
- [x] 6.5 Manually test: Verify chat input and messages are functional with modal open
- [x] 6.6 Manually test: Verify LLM analysis text mentions only moves 1–3, not move 4 (current position analysis)
- [x] 6.7 Run `npm test` to ensure no unit tests are broken
- [x] 6.8 Run `npm run build` to verify no TypeScript errors

## 7. Documentation and Comments

- [x] 7.1 Add a comment in `ChatPanel.tsx` explaining the modal visibility logic (move 3 threshold and LLM response dependency)
- [x] 7.2 Add a comment in `electron/main.ts` near the updated prompt explaining the bug fix (was analyzing next move, now analyzes current position only)
