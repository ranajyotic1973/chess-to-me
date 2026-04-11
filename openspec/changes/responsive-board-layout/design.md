## Context

The existing renderer places the chessboard and controls in a single vertically stacked column, but the board container renders so large that the outer page gains a vertical scrollbar on typical laptop screens. FEN input, chat, and analysis controls stay below the oversized board and the page-level scrollbars contradict the requirement in ui-and-board-experience for a single-view layout. Stakeholders want the board visible with all controls beside it on a single screen.

## Goals / Non-Goals
**Goals:**
- Split the interface into a left board panel and a right controls panel so the board is always visible alongside the FEN/chat widgets.
- Enforce Tailwind-based layout constraints that keep the entire viewport free of horizontal or vertical scrollbars while allowing controlled internal scrolling in the chat/log sections.
- Make the layout responsive by stacking the controls beneath the board for narrower viewports without reintroducing page-level scroll.

**Non-Goals:**
- Resizing the board itself to show more squares; the chessboard size should respect its existing aspect ratio.
- Introducing new navigation flows or rewiring the chat/FEN control logic.

## Decisions
- **Two-column grid shell:** Use a grid or flex wrapper (grid grid-cols-[minmax(0,1fr)_minmax(320px,40vh)] or similar) anchored to h-screen and overflow-hidden so the board consumes the left area while the controls live in a fixed-width right column. minmax ensures the controls never shrink below their content height, while overflow-hidden on the page container blocks scrollbars.
- **Internal scroll zones:** Nest each chat/log area inside a div with overflow-y-auto and max-h-[calc(100vh-...)] so only those areas scroll when content grows, keeping the outer layout locked at the viewport height.
- **Responsive breakpoint stack:** At md or lg breakpoints (around 1024px) switch the grid to grid-cols-1 placing the board above a controls block that stays full-width. Padding adjustments prevent overflow on short screens; we can reuse the existing Tailwind spacing scale so the controls still fill the viewport height without scrollbars.
- **Tailwind utility reuse:** Keep Tailwind configuration intact by applying utility classes (h-screen, overflow-hidden, flex, grid, gap-4, etc.) rather than introducing new CSS to keep styling consistent with the Tailwind-driven UI.

## Risks / Trade-offs
- [Risk] Right column may still overflow when long analysis/log entries appear. → Mitigation: give the panel a max-h tied to viewport height and rely on internal scrollbars for the log/chat sections.
- [Risk] Very narrow viewports might squeeze the controls after stacking. → Mitigation: choose a breakpoint that stacks early (e.g., 1024px) and allow the board its own row; confirm via manual resizing.

## Migration Plan
1. Update the layout container component (likely the main app shell or dashboard) to wrap the board and control panes in the two-column structure described above.
2. Adjust FEN/chat container styling so the right column uses flex flex-col with min-h/max-h and internal scroll areas.
3. Add breakpoint-specific classes to stack the panels below the threshold while keeping overflow-hidden on the body container.
4. Verify manually at 1366x768 and 900px widths, and run any available UI/tests to ensure no regression.

## Open Questions
- Should the right-hand controls have a hard-width (e.g., 360px) or flex to the remaining space with a max-width?
