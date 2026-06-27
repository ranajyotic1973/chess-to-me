## ADDED Requirements

### Requirement: Resize board when entering Advanced Analysis mode
When Advanced Analysis mode is activated, the system SHALL automatically reduce the board size to accommodate the chat panel and position notes panel on wide screens.

#### Scenario: Enter Advanced Analysis on wide screen
- **WHEN** user clicks "Advanced Analysis" button on a screen ≥1024px wide
- **THEN** the board width decreases from 60% to 40% of available space, allowing visible space for chat (min 320px) and notes (280-320px) panels

#### Scenario: Enter Advanced Analysis on narrow screen
- **WHEN** user clicks "Advanced Analysis" button on a screen <1024px wide
- **THEN** the board size remains unchanged and panels stack or overflow according to mobile layout

### Requirement: Restore board size on exiting Advanced Analysis mode
When Advanced Analysis mode is closed, the system SHALL restore the board to its original size allocation.

#### Scenario: Exit Advanced Analysis
- **WHEN** user clicks "Stop Analysis" button to close Advanced Analysis mode
- **THEN** the board width returns to 60% of available space and layout reverts to standard analysis view

### Requirement: Board sizing preserves responsiveness
The system SHALL maintain responsive behavior—board dimensions scale proportionally based on window size at all times.

#### Scenario: Resize window during Advanced Analysis
- **WHEN** window is resized while Advanced Analysis is active
- **THEN** board and panels resize proportionally to fill available space; no content disappears or becomes inaccessible

### Requirement: Chat and notes panels remain visible in Advanced Analysis
Both the chat panel and position notes panel SHALL remain continuously visible and accessible while Advanced Analysis mode is active.

#### Scenario: Both panels visible in Advanced Analysis
- **WHEN** Advanced Analysis is active on a wide screen
- **THEN** chat panel, board, and notes panel are all visible and user can interact with all three simultaneously

### Requirement: Mobile layout for narrow screens
On screens narrower than 1024px, the system MAY use a mobile-optimized layout that does not force all three panels to be simultaneously visible.

#### Scenario: Mobile layout on narrow screen
- **WHEN** screen width is <1024px and Advanced Analysis is active
- **THEN** layout adapts appropriately (panels may stack, scroll, or tab between views)
