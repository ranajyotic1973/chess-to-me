## Context

The app currently generates chess puzzles on-the-fly via LLM. LLM-generated puzzles have inconsistent difficulty, unverifiable positions, and no rating system. The Lichess puzzle database (6M+ puzzles, Glicko2-rated, tagged by theme and opening) and TWIC OTB game archives (GM/IM level, weekly) provide high-quality real-game material. The goal is to make these the primary source, with LLM generation retained as fallback.

**Current state:**
- `handlePuzzleRequest` in `electron/main.ts` calls LLM directly with a structured JSON schema
- No local database exists; storage is file-based (PGN files in `data/reference-games/`)
- `better-sqlite3` is not yet a dependency

## Goals / Non-Goals

**Goals:**
- Local SQLite puzzle DB from Lichess CSV (6M puzzles, indexed by theme/rating/opening)
- Local SQLite games DB from TWIC weekly archives + pgnmentor.com player collections
- DB-first puzzle lookup with LLM as intent parser and presenter
- On-demand DB update checker in Settings UI

**Non-Goals:**
- Lichess monthly standard games DB (too large — 3–30 GB/month)
- Full-text search of PGN move sequences (out of scope for v1)
- Puzzle DB bundled in the installer (downloaded post-install to keep app size small)
- Automatic background DB updates on a schedule (Settings-triggered only for v1)

## Decisions

### D1: better-sqlite3 over sql.js or DuckDB

**Decision:** Use `better-sqlite3` as the SQLite driver.

| Option | Rejected reason |
|---|---|
| `sql.js` (WebAssembly SQLite) | Loads entire DB into RAM — fatal for 1.8 GB uncompressed puzzle DB |
| `DuckDB` | 30 MB binary footprint; designed for analytics, not simple indexed lookups |
| `better-sqlite3` | Synchronous, <1ms queries, ~1 MB overhead, proven in VS Code/Obsidian/Electron |

Native rebuild per platform is handled automatically by electron-builder (`npmRebuild: true` default). Same pattern as Stockfish in `vendor/`.

### D2: fzstd for zstd decompression (pure JS)

**Decision:** Use `fzstd` (pure JS, ~20 KB) to decompress Lichess `.csv.zst` files.

| Option | Rejected reason |
|---|---|
| Bundled `zstd.exe` | Windows-only; cross-platform requires per-platform binaries |
| `@mongodb-js/zstd` (native) | Requires node-gyp compilation; another native module to manage |
| `fzstd` | Pure JS, cross-platform, no compilation; import is a one-time operation so speed is acceptable |

### D3: adm-zip for TWIC archives

**Decision:** Use `adm-zip` (pure JS) for extracting TWIC `.zip` files.

TWIC archives are standard ZIP, not zstd. `adm-zip` requires no native compilation and handles ZIP extraction reliably.

### D4: Databases downloaded post-install, not bundled

**Decision:** `data/puzzles/puzzles.db` and `data/games/games.db` are NOT included in the Electron installer. Users download them via the Settings UI.

Rationale: The puzzle DB is ~350 MB. Bundling it would make the installer ~350 MB larger and require re-shipping it on every Lichess update. Post-install download with progress reporting is a better UX.

**Fallback:** If no puzzle DB is present, `handlePuzzleRequest` falls back to LLM generation exactly as it does today.

### D5: LLM is used twice for puzzle requests — intent extraction + presentation

**Decision:** When a puzzle DB is available, `handlePuzzleRequest` makes two LLM calls (or one combined call with structured output):

1. **Intent extraction** (lightweight): Given the user's question, extract `{ theme, minRating, maxRating, opening }` as JSON. This can be the existing PASS 1 classification extended with intent fields.
2. **Presentation** (full): LLM receives the DB puzzle row as context and writes the story + step-by-step walkthrough. Same output format as today.

If the DB returns no match, step 2 runs with no puzzle context — LLM generates the puzzle from scratch (current behavior).

### D6: Puzzle CSV import is streaming, batch-inserted

**Decision:** The 6M-row CSV is parsed and inserted in batches of 1000 rows using `better-sqlite3` prepared statements inside a transaction. This keeps peak memory low (~50 MB) regardless of CSV size.

### D7: TWIC issue tracking via sequential numbering

TWIC issues are numbered sequentially (current: ~1567+). The latest downloaded issue number is stored in `data/games/.version`. On update check, we fetch the TWIC index page, extract the latest issue number, and download any issues beyond what's stored.

### D8: pgnmentor.com fix via URL verification

The existing `fetch-mega-reference-db.ps1` fails for all 50 players. The correct URL pattern appears to need verification (the script uses `/players/Name.pgn` which may have changed). The fix is to validate URLs programmatically and fall back to alternative sources (e.g., 365chess.com) or skip gracefully.

## Risks / Trade-offs

- **[Risk] Puzzle import duration** — Importing 6M rows may take 5–15 minutes on slow hardware → Mitigation: Show progress in Settings UI; import runs in a background worker thread; user can cancel.
- **[Risk] `better-sqlite3` native rebuild failures on some platforms** → Mitigation: Wrap DB init in try/catch; if SQLite unavailable, fall back to LLM-only mode gracefully.
- **[Risk] TWIC website structure changes** → Mitigation: TWIC has been stable since 1994; we parse it defensively with multiple fallback patterns.
- **[Risk] Disk space** — Puzzle DB ~350 MB + games DB ~200 MB → Mitigation: Show sizes clearly in Settings before download; allow deleting individual DBs.
- **[Trade-off] Two LLM calls per puzzle request** — Adds ~1–3s latency for intent extraction → Mitigation: Intent extraction can be merged into PASS 1 classification (single call) by extending the existing classification prompt to also return intent fields.

## Open Questions

- Should TWIC imports be cumulative (all issues) or rolling (last N months)? Starting with last 6 months (~26 issues, ~200 MB) seems reasonable for v1.
- pgnmentor.com URL fix: investigate correct URL pattern before implementing the script fix.
