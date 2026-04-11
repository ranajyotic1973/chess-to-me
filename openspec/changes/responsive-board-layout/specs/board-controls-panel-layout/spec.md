## ADDED Requirements

### Requirement: Maintain dual-panel layout without horizontal overflow
The UI SHALL allocate the chessboard to the left panel and the FEN/chat controls to the right panel so that both panels sit side-by-side when the viewport width is 1024px or wider, and no horizontal scrollbar appears on the page container.

#### Scenario: Wide viewport on laptop
- **WHEN** the user opens the app on a 1366px-wide screen
- **THEN** the chessboard fills the left column, the FEN controls and chat occupy the right column, and the main container shows no horizontal overflow while each column remains fully visible

### Requirement: Enforce viewport height usage so page-level scrollbars do not appear
The renderer SHALL size the board and control panels (including chat, analysis summary, and FEN input controls) so that the combined layout fits within 1366x768 without introducing vertical scrollbars, while allowing the chat log or analysis feed areas to scroll internally if their height limits are exceeded.

#### Scenario: Tall chat transcript
- **WHEN** the chat log grows past its allocated height from repeated LLM responses
- **THEN** only the chat log scrolls internally, no vertical scrollbar appears on the overall page container, and the board plus FEN controls remain in their fixed areas

### Requirement: Responsive stacking preserves no-scroll behavior on narrow screens
When the viewport shrinks below 1024px, the UI SHALL stack the board above the controls while still keeping every element visible without page-level scrollbars, reflowing padding/margin values instead of overflowing content.

#### Scenario: Tablet or small laptop screen
- **WHEN** the viewport width drops to 900px
- **THEN** the chessboard moves above the controls, the controls remain grouped, and the page container remains free of horizontal or vertical scrollbars
