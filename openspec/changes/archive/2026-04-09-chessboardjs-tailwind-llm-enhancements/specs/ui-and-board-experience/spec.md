## ADDED Requirements

### Requirement: UI layout stays within laptop viewport without page scrollbars
The renderer SHALL use Tailwind-driven layout utilities so that the main window fits 1366x768 and larger laptop screens without showing page-level scroll bars. Only the chat text area and analysis log are allowed to scroll internally after their dedicated height limits are exceeded.

#### Scenario: Wide laptop display
- **WHEN** the user opens the app on a 1366x768 screen
- **THEN** no vertical or horizontal scrollbars appear on the page-level container and the board/chat sections each occupy their configured areas

### Requirement: Chat text area shows 10–15 lines before scrolling
The chat input area SHALL reserve enough height to render 10–15 lines of text. After that limit is reached, the textarea SHALL scroll internally while the overall page layout remains fixed.

#### Scenario: Long prompt in chat box
- **WHEN** the user types or pastes more than 12 lines of text into the chat textarea
- **THEN** the textarea displays a vertical scrollbar and the rest of the page remains static

### Requirement: Chessboard renders via chessboardjs with draggable pieces and start default
The board SHALL initialize through chessboardjs, set its default position to `start`, and allow pieces to be dragged without additional click confirmation. Draggable behavior must not disrupt the layout constraints described above.

#### Scenario: Initial render
- **WHEN** the renderer mounts the chessboard component
- **THEN** `chessboardjs` is configured with `draggable: true`, the position is set to `start`, and the board fits within the specified Tailwind container without overflow

### Requirement: FEN input triggers re-render and Stockfish notification
When a FEN string is pasted or submitted, the board SHALL call `setPosition(fen)` on chessboardjs, re-render in the new configuration, and send the same FEN to the Stockfish worker/process via IPC for analysis.

#### Scenario: Paste a valid FEN
- **WHEN** the user pastes `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` into the paste field
- **THEN** the board re-renders with that position, no pieces remain from the previous layout, and the FEN is forwarded to Stockfish before the next analysis request

### Requirement: Tailwind theme enforces consistent spacing and no external scrollbars
All UI sections (board, controls, chat, analysis summary) SHALL use Tailwind classes to enforce margins/padding and share a cohesive theme so the entire viewport feels unified.

#### Scenario: Theme update
- **WHEN** the theme settings change colors or spacing
- **THEN** layout spacing remains consistent, and no new scrollbars appear

