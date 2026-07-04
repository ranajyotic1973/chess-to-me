## Context

Currently, in the chat panel, the list of lines, moves played, and LLM responses are stacked vertically one after another. This layout makes it difficult for users to notice when an LLM response has appeared unless they actively watch the scroll bar. Additionally, there is a bug where the LLM is analyzing the next move that will be played in the selected line, rather than analyzing the board position resulting from the moves already played.

The application architecture requires the Electron main process (`electron/main.ts`) to handle all LLM routing and classification per CLAUDE.md guidelines.

## Goals / Non-Goals

**Goals:**
- Make LLM analysis responses more visible and prominent by displaying them in a dedicated modal overlay
- Fix the LLM analysis bug so it only analyzes the current board position (from moves already played), not future moves
- Automatically show the analysis modal after the 3rd move in a selected line
- Allow users to close and reopen the analysis modal at will
- Maintain full chat interface functionality regardless of modal state

**Non-Goals:**
- Redesign the entire chat panel layout
- Change how analysis is triggered (still happens at the same points in the flow)
- Modify the structure of returned analysis data beyond restricting it to current position

## Decisions

### Decision: Analysis modal as an overlay component
The analysis modal SHALL be implemented as a full-screen or large overlay container positioned over the chat panel area (using `position: fixed` or absolute positioning). The modal will be a separate React component (`AnalysisModal.tsx` or similar) managed by the parent `ChatPanel`.

**Rationale:** A dedicated overlay ensures the analysis content has maximum visual prominence and doesn't compete for space with the chat list and input. It's also easier to implement toggle/close logic with a separate component.

**Alternatives considered:**
- Split the chat panel into two permanent side-by-side sections: rejected because it reduces chat area and forces a layout change.
- Show analysis in a collapsible panel below the chat: rejected because users might miss it (same issue as current implementation).

### Decision: Modal visibility triggered by move count and LLM response availability
The modal SHALL be hidden until BOTH conditions are met: (1) the current move index is >= 2 (i.e., user is viewing move 3 or later), AND (2) an LLM analysis response has been received and is ready for display.

**Rationale:** Waiting until move 3 ensures there's enough position complexity to warrant detailed analysis. Tying visibility to response availability prevents showing an empty modal.

**Alternatives considered:**
- Show modal after any move: rejected because early positions have little to analyze.
- Always show modal if any move has been played: rejected because early analysis might not be ready.

### Decision: Update LLM system prompt in main process to restrict analysis to current position
In `electron/main.ts`, the system prompt builder (or the function that constructs the LLM request for move analysis) SHALL be updated to:
1. Explicitly state that the LLM should analyze ONLY the position defined by the provided FEN and moves already played.
2. Explicitly forbid prediction or analysis of future moves in the line.

**Rationale:** Per CLAUDE.md, the main process owns all LLM routing and classification. This ensures the restriction is enforced at the source and the LLM receives clear, unambiguous instructions.

**Alternatives considered:**
- Parse and filter LLM response in the renderer: rejected because it's a post-hoc band-aid and doesn't prevent the LLM from generating unwanted content in the first place.
- Add a post-process step in the renderer: same issue.

### Decision: Pass only current FEN and moves already played to LLM
When the renderer requests analysis (via IPC), it SHALL pass:
- The current board FEN (not a list of future FENs)
- An array of moves already played (from line details)

The renderer SHALL NOT pass the full line's future moves.

**Rationale:** Reducing the data sent to the LLM minimizes the chance the LLM uses lookahead context. This is simpler and clearer than trying to instruct the LLM to ignore data it has been given.

### Decision: Modal state managed in ChatPanel component
The open/closed state of the analysis modal SHALL be managed via a boolean state variable in the parent `ChatPanel` component. The toggle button and close button (X) will both update this state.

**Rationale:** Centralizing state at the parent ensures the chat and modal stay in sync and simplifies prop passing.

## Risks / Trade-offs

**Risk: Modal obscures the lines list while open** → Mitigation: The X button is always visible in the modal header, and the reopening icon button is visible in the chat area when the modal is closed. Users can quickly toggle.

**Risk: Chat input might be hidden behind modal on small screens** → Mitigation: The modal design should ensure the chat input area remains accessible (e.g., not covering the bottom of the viewport, or allowing scroll within the modal).

**Risk: Sudden appearance of the modal after move 3 might surprise users** → Mitigation: The modal appears only when LLM response is ready (not before), which is already a noticeable event. A brief visual cue (e.g., highlight or animation) can draw attention without being jarring.

**Trade-off: Modal is another state to manage** → We accept this because the benefit (making analysis visible) outweighs the complexity of an additional boolean state.

## Migration Plan

1. Create `AnalysisModal.tsx` component with close button and content layout
2. Add modal state and toggle handler to `ChatPanel.tsx`
3. Update Electron main process LLM prompt to include position-restriction language
4. Update renderer IPC call to pass only current FEN and moves already played
5. Test manual flow: create a line, play moves 1 and 2 (modal hidden), play move 3 (modal visible once LLM response arrives)
6. Test close/reopen toggle
7. Test that chat remains functional with modal open
8. Verify LLM analysis text reflects current position only (e.g., references moves 1–3 but not move 4)

## Open Questions

1. Should the modal have a specific size (full overlay vs. centered box vs. right-side panel)? (Deferred to design review with UI team)
2. Should there be any animation/transition when the modal appears or closes? (Deferred to UX preference)
3. How should the reopening icon button be styled and positioned? (Deferred to design review)
