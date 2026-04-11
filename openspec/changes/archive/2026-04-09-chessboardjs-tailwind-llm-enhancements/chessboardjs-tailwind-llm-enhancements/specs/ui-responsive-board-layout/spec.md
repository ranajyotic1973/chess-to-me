## ADDED Requirements

### Requirement: Tailwind-powered responsive layout
The application SHALL import locally built Tailwind CSS and use utility classes to create a two-column layout (board/controls + chat) that fills a laptop viewport without causing horizontal or vertical scrollbars outside the chat textarea.

#### Scenario: Desktop viewport rendering
- **WHEN** the app renders on a typical laptop resolution (~1366x768 or higher)
- **THEN** the board and chat panels stretch to fill the height, the overall viewport has no scrollbars, and only the chat textarea can scroll when its content exceeds the maximum height

### Requirement: Chat textarea height control
The chat input area SHALL expand to show 10–15 lines of text before displaying its own scrollbars, ensuring longer messages remain visible while keeping the rest of the UI fixed.

#### Scenario: Long chat input
- **WHEN** the user types or pastes more than 10 lines of text into the chat textarea
- **THEN** the textarea shows a scrollbar while the rest of the surrounding layout remains stationary and scrollbar-free

### Requirement: Chessboard visibility and control panel spacing
The chessboard panel SHALL always remain visible within the layout, with enough padding/margins so it does not shrink into a collapsed state, and the controls (fen input, analysis state) remain adjacent without introducing extra scrollbars.

#### Scenario: Narrow window width
- **WHEN** the window width approaches the lower bound of a laptop screen
- **THEN** the board resizes proportionally, remains fully visible, and control components wrap or stack without creating overflow outside the viewport
