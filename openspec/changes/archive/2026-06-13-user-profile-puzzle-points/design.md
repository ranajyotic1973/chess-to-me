## Context

Chess To Me stores user settings in a JSON file managed by `electron-main` via `electron-store` (or equivalent). The puzzle solve flow is handled in `electron/main.ts` with IPC round-trips to the renderer. Currently there is no concept of a user identity or scoring — each session is anonymous and stateless with respect to progress.

The OS login username is available in Node.js via `os.userInfo().username` and requires no additional dependency.

## Goals / Non-Goals

**Goals:**
- Optional display name in Settings with OS username fallback.
- Profile icon widget in main UI top-right showing current puzzle points.
- Points system: seeded from first-solve puzzle ELO, +5/+10/+15 per difficulty on success, −25 per failure, floor at 0 with a "no more deductions" sentinel once 0 is reached after the first zero.
- Points stored in `puzzle-points.json` beside the settings file (`app.getPath("userData")`).
- In-memory copy survives accidental file deletion without losing the last-known value.

**Non-Goals:**
- Leaderboard or multi-user support.
- Cloud sync or backup.
- Points affecting puzzle difficulty selection or unlock.
- Retroactive scoring from history.

## Decisions

### 1. Separate `puzzle-points.json` file (not merged into settings)
**Decision:** Points live in their own file, not in the existing settings JSON.

**Rationale:** Settings are user-configurable preferences; points are app-managed state. Keeping them separate prevents a user accidentally overwriting their score by editing settings, and allows the points file to be reset independently. The file location (`userData`) is the same directory, satisfying the requirement.

**Alternative considered:** Store in settings JSON. Rejected because it merges user-editable config with app-managed state, complicating both the settings UI and the points logic.

### 2. In-memory write-through cache
**Decision:** `electron/puzzlePoints.ts` maintains a module-level `currentPoints` variable that is updated on every change. On every write, the file is written. On every read, the in-memory value is authoritative; the file is only read at startup. If the file is missing at write time, it is re-created from the in-memory value.

**Rationale:** This satisfies the requirement that if the file is deleted while the app is running, the next write restores it. No file-watcher is needed.

**Alternative considered:** `fs.watch` the file and reload on deletion. Rejected as more complex and still has a race window.

### 3. Points seeding from first-solve ELO
**Decision:** The initial points value is the `rating` field from the puzzle row (or LLM-supplied rating). On every subsequent solve the delta (+5/+10/+15) is added. The "seed" only happens once — when `currentPoints` is `null` (uninitialized state, distinct from 0).

**Rationale:** Using ELO as the seed anchors the starting score to actual ability rather than starting everyone at zero, making the profile icon immediately meaningful on first solve.

**State model:**
- `null` — no puzzle ever solved; profile shows `—`
- `number ≥ 0` — active scoring; profile shows value
- Once points reach 0 after the seed, a `frozenAtZero: true` flag is stored; further failures do not deduct but successes still add.

### 4. Difficulty → delta mapping
| Difficulty label | Points delta |
|-----------------|-------------|
| `easy` (rating < 1200) | +5 |
| `medium` (1200 ≤ rating < 1800) | +10 |
| `hard` (rating ≥ 1800) | +15 |

These thresholds match the child-appropriate framing: easy for beginners, hard for advanced teens.

### 5. IPC surface
New IPC channels:
- `profile:get-display-name` → `string` (display name or OS username)
- `profile:set-display-name` → `void`
- `points:get` → `{ points: number | null, frozenAtZero: boolean }`
- `points:record-solve` `{ rating: number, solved: boolean }` → `{ points: number | null, frozenAtZero: boolean }`

`points:record-solve` is called by the renderer after a puzzle outcome is determined — keeping all points arithmetic server-side (main process) where the file lives.

### 6. Profile icon widget
A small MUI `Avatar`-like chip in the top-right of `App.tsx`'s main layout bar. Shows initials from display name + points badge. Clicking it opens a minimal popover with full display name and total points. Uses MUI `Badge` + `Tooltip` — no new UI library dependency.

## Risks / Trade-offs

- **File write frequency:** Points are written on every solve event. Solves are low-frequency (human-paced) so this is not a performance concern.
- **Concurrent instances:** If the user somehow opens two windows (unlikely in Electron single-window mode), writes could race. Accepted — Electron enforces single instance by default.
- **ELO not always available:** LLM-generated puzzles may not carry an explicit rating. In that case, default seed to `1200` (the mid-range "medium" boundary) rather than blocking the first solve.
- **Difficulty classification relying on rating field:** If `rating` is missing or 0, treat as `medium` (+10). This is a safe fallback for child users.

## Migration Plan

No migration needed — this is additive. Users who have never solved a puzzle start with `points: null`. On first install or first run after update, no `puzzle-points.json` exists and the app behaves as if uninitialized.
