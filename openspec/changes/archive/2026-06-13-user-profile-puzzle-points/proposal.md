## Why

Chess To Me targets kids aged 4–18 who need motivation to keep practising. A visible points tally tied to puzzle performance gives players a tangible sense of progress and encourages repeated engagement — similar to an ELO ladder but designed to be encouraging rather than punitive.

## What Changes

- Add an optional **display name** field to the Settings page; falls back to the OS login username when left blank.
- Add a **profile icon widget** in the top-right corner of the main page that shows the player's current puzzle points.
- Implement a **puzzle points system**: points are seeded from the ELO rating of the first successfully solved puzzle, then awarded (+5/+10/+15) or deducted (−25, floor 0) based on puzzle difficulty and outcome.
- Store puzzle points in a **dedicated JSON file** next to the settings file, with in-memory fallback if the file is deleted at runtime.

## Capabilities

### New Capabilities
- `user-profile`: Display name setting (optional, OS username fallback) and profile icon widget showing puzzle points on the main screen.
- `puzzle-points`: Point scoring system seeded from first-solve ELO, per-difficulty awards, failure deductions with a zero floor, persistent file storage, and in-memory resilience against file deletion.

### Modified Capabilities
- `puzzle-solve-flow`: Puzzle solve and failure outcomes now trigger point award/deduction side effects in addition to existing feedback.

## Impact

- **`src/components/SettingsPanel.tsx`** — new display name field
- **`src/App.tsx`** / main layout — profile icon widget (top-right)
- **`electron/main.ts`** — IPC handlers for reading/writing display name and puzzle points; OS username lookup; file-watch or write-on-change for points file
- **`src/types/index.ts`** — new types: `UserProfile`, `PuzzlePoints`
- **`electron/preload.ts`** — expose new IPC channels
- New file: **`electron/puzzlePoints.ts`** — points logic (seed, award, deduct, persist, in-memory fallback)
- Settings file directory is reused for the new `puzzle-points.json` file — no new dependency on a different storage path
