## 1. Layout restructuring

- [x] 1.1 Update the analysis container to render two flex columns (left 70%, right 30%) that both match the viewport height.
- [x] 1.2 Ensure the right column retains the existing chat/settings content without stacking and enforces a min-width (e.g., 320px) for usability.

## 2. Board presentation

- [x] 2.1 Resize the chess board to fit inside the left column with padding of 5px on every side and retain its drop shadow without extra panels below.
- [x] 2.2 Keep or reposition the + button beneath the board inside the left column so it still launches the FEN dialog.

## 3. Validation & polish

- [x] 3.1 Verify the chat panel now handles analysis updates inside its scrollable area and that the layout fills the viewport height with no extra vertical spacing.
- [x] 3.2 Run `npm run build` (fails: Vite reports `spawn EPERM` while bundling the config).
