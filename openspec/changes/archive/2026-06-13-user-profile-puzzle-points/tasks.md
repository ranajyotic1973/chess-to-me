## 1. Types and IPC Surface

- [x] 1.1 Add `UserProfile` interface to `src/types/index.ts`: `{ displayName: string }`
- [x] 1.2 Add `PuzzlePointsState` interface to `src/types/index.ts`: `{ points: number | null; frozenAtZero: boolean }`
- [x] 1.3 Add IPC payload/response entries for `profile:get-display-name`, `profile:set-display-name`, `points:get`, and `points:record-solve` to `IpcPayloads` / `IpcResponses` in `src/types/index.ts`
- [x] 1.4 Expose the four new IPC channels in `electron/preload.ts`

## 2. Puzzle Points Module (Main Process)

- [x] 2.1 Create `electron/puzzlePoints.ts` with module-level `currentPoints: number | null` and `frozenAtZero: boolean` variables (in-memory cache)
- [x] 2.2 Implement `loadPoints(userDataPath: string): PuzzlePointsState` — reads `puzzle-points.json` if it exists; returns `{ points: null, frozenAtZero: false }` if missing
- [x] 2.3 Implement `savePoints(userDataPath: string, state: PuzzlePointsState): void` — writes `puzzle-points.json`; if write fails due to missing directory, creates the file (handles recreation after deletion)
- [x] 2.4 Implement `recordSolve(rating: number, solved: boolean, userDataPath: string): PuzzlePointsState` — seeds on first solve, awards/deducts based on difficulty thresholds, enforces floor, sets `frozenAtZero`, updates in-memory cache and writes file
- [x] 2.5 Implement `getPoints(): PuzzlePointsState` — returns current in-memory state without file I/O
- [x] 2.6 Add unit tests in `electron/puzzlePoints.test.ts` covering: seed from first solve, difficulty tiers, deduction to zero, frozenAtZero flag, successive solves after freeze, missing-file recreation

## 3. Main Process IPC Handlers

- [x] 3.1 In `electron/main.ts`, call `loadPoints(app.getPath("userData"))` at startup and store result in in-memory cache
- [x] 3.2 Add `ipcMain.handle("points:get", ...)` returning `getPoints()`
- [x] 3.3 Add `ipcMain.handle("points:record-solve", (_, { rating, solved }) => recordSolve(rating, solved, app.getPath("userData")))`
- [x] 3.4 Add `ipcMain.handle("profile:get-display-name", ...)` — returns saved `displayName` from settings if non-empty, else `os.userInfo().username`
- [x] 3.5 Add `ipcMain.handle("profile:set-display-name", (_, { displayName }) => ...)` — saves `displayName` to settings file

## 4. Settings UI — Display Name Field

- [x] 4.1 Add `displayName` field to `AppSettings` type and default settings in `electron/main.ts`
- [x] 4.2 In `src/components/SettingsPanel.tsx`, add a "Display Name" text input to the existing settings form (optional field, placeholder: OS username shown as hint)
- [x] 4.3 On settings load, populate the display name field by calling `profile:get-display-name`
- [x] 4.4 On save, call `profile:set-display-name` with the field value (empty string is valid — triggers OS username fallback)

## 5. Profile Icon Widget

- [x] 5.1 Create `src/components/ProfileIcon.tsx` — MUI `Avatar` showing initials derived from display name, with a `Badge` overlay showing numeric points (or "—" when `null`)
- [x] 5.2 Add click handler to `ProfileIcon` that opens an MUI `Popover` showing full display name and points total (or "No puzzles solved yet")
- [x] 5.3 Place `<ProfileIcon />` in the top-right of the main layout in `src/App.tsx`
- [x] 5.4 On mount, `ProfileIcon` calls `points:get` and `profile:get-display-name` to initialise its state
- [x] 5.5 Export a `refreshPoints()` callback from `ProfileIcon` (or use a shared React context / prop) so the puzzle solve flow can trigger a badge update

## 6. Puzzle Solve Flow Integration

- [x] 6.1 In the renderer puzzle outcome handler (correct move sequence accepted), call `points:record-solve` with `{ rating: puzzleRating, solved: true }` and refresh the profile badge
- [x] 6.2 In the renderer "Reveal Solution" handler, call `points:record-solve` with `{ rating: puzzleRating, solved: false }` and refresh the profile badge
- [x] 6.3 Ensure `puzzleRating` is stored in app state when a puzzle is loaded (from the puzzle row's `rating` field or LLM response); default to `1200` if absent

## 7. Verification

- [ ] 7.1 Run `npm test` and confirm all new and existing tests pass
- [ ] 7.2 Launch app, solve a puzzle — verify profile badge shows seeded ELO value
- [ ] 7.3 Solve additional puzzles of each difficulty — verify +5/+10/+15 increments
- [ ] 7.4 Fail puzzles until points reach zero — verify floor behaviour and `frozenAtZero` stops further deduction
- [ ] 7.5 Delete `puzzle-points.json` while app is running, solve another puzzle — verify file is recreated with correct value
- [ ] 7.6 Set a custom display name in Settings — verify profile icon initials and popover update
- [ ] 7.7 Clear display name in Settings — verify fallback to OS username
