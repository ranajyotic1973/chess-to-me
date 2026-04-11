## Context

The current analysis view stacks board, controls, and chat within a single column, making it harder to ensure the board has a proportional area. Users expect the board to remain prominent while the chat lives in a fixed-width column, so layout changes should adopt a deterministic left/right split.

## Goals / Non-Goals

**Goals:**
- Divide the analysis view into equally tall left/right sections, with the left containing the board and the right hosting chat/settings components.
- Ensure the left column consumes ~70% of the width and the board stays square with 5px padding on all sides so the drop shadow is visible without additional panels.
- Keep the + button anchored beneath the board column to open the existing FEN dialog.

**Non-Goals:**
- Redesigning the chat controls or LLM workflow beyond ensuring they remain inside the right column.
- Changing the popup content or adding new controls beyond repositioning the trigger.

## Decisions

1. **Layout strategy:** Use a flex container whose two children take lex: 7 and lex: 3 respectively, ensuring both stretch to the viewport height and letting the left column contain only the board plus the popup button.
2. **Board sizing:** Calculate the board’s width/height to be the minimum of the left column’s dimensions after padding; embed it inside a centered wrapper with 5px padding to maintain the drop shadow without extra panels.
3. **Popup placement:** Keep the existing dialog component but position its trigger inside the left column under the board so the control stays visually tied to the board area.

## Risks / Trade-offs

- [Risk] If the viewport is extremely tall, the left column could push the board beyond comfortable dimensions ? Mitigation: constrain board size using min/max values and rely on the surrounding flex container for overflow handling.
- [Risk] Right column chat panel might shrink too much on narrow windows ? Mitigation: give it a min-width (e.g., 320px) and allow horizontal scrolling only if necessary, while keeping the overall flex container responsive.

## Migration Plan

Not applicable; layout change occurs entirely in the renderer.

## Open Questions

- Should the right column continue to host system status chips or should they move onto the left column? Currently the focus remains on fitting existing panels within the new split.
