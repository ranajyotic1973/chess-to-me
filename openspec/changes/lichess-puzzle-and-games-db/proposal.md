## Why

Chess training is more effective when puzzles and reference games come from a verified, rated corpus rather than being generated on-the-fly by an LLM. The app currently generates puzzles via LLM alone, which produces inconsistent difficulty and unverifiable positions. A local database of 6M+ Lichess puzzles (rated, themed, tagged by opening) and a curated OTB games library (TWIC + famous players) gives users access to high-quality, real-game material while keeping the LLM as the presentation and fallback layer.

## What Changes

- **Puzzle DB**: Download the Lichess puzzle CSV (~300 MB compressed, 6M+ puzzles), decompress, and import into a local SQLite database. Puzzles are queried by theme, rating range, and opening before any LLM call is made.
- **Puzzle LLM flow**: LLM extracts search intent (theme, rating, opening) from the user's question, DB is queried, and the matched puzzle is fed back to the LLM to write the story/walkthrough explanation. Falls back to LLM-generated puzzle if no DB match.
- **Games DB**: Download TWIC weekly OTB game archives (GM/IM level) and fix the broken pgnmentor.com player collection scripts. Index games in SQLite by player, ECO code, opening, and Elo range.
- **Database updater**: On-demand (Settings UI trigger) and optional periodic background check for new puzzle DB versions and new TWIC issues.
- **New dependencies**: `better-sqlite3` (SQLite driver, rebuilt by electron-builder per platform), `fzstd` (pure-JS zstd decompression for Lichess CSV), `adm-zip` (standard ZIP extraction for TWIC archives).

## Capabilities

### New Capabilities

- `puzzle-database`: Local SQLite database of Lichess puzzles — download, decompress, import, index, and query by theme/rating/opening. Includes version tracking and update detection.
- `games-database`: Local SQLite database of OTB reference games from TWIC weekly archives and pgnmentor.com player collections — download, extract, import, and query by player/ECO/Elo.
- `database-updater`: Settings-triggered and optional auto-check mechanism that detects new puzzle DB versions (Last-Modified header) and new TWIC issues (sequential issue number), downloads, and reimports.

### Modified Capabilities

- `puzzle-solve-flow`: Puzzle request flow gains a DB-first lookup step. LLM now extracts structured search parameters (theme, minRating, maxRating, opening) from the user's question before any DB query. The matched puzzle row is injected into the LLM context for story/explanation generation. LLM generation is retained as fallback when DB returns no match.
- `analysis-and-llm-guidance`: LLM system prompt for puzzle classification gains a structured intent-extraction pass that outputs `{ theme, minRating, maxRating, opening }` alongside the existing `response_type` classification.

## Impact

- **`electron/main.ts`**: New IPC handlers for `db:search-puzzles`, `db:search-games`, `db:update-puzzles`, `db:update-games`, `db:status`. Modified `handlePuzzleRequest` to query puzzle DB first.
- **`src/components/SettingsPanel.tsx`**: New "Database" section with download/update controls and status display (puzzle count, games count, last updated).
- **`src/utils/systemPromptGenerator.ts`**: Updated puzzle system prompt to include intent-extraction instructions.
- **`data/`**: New `data/puzzles/puzzles.db` (~350 MB) and `data/games/games.db` (~50–200 MB depending on TWIC coverage).
- **`scripts/`**: Updated `fetch-reference-games.ps1` to fix pgnmentor.com URLs; new TWIC download script.
- **Dependencies**: `better-sqlite3`, `fzstd`, `adm-zip` added to `package.json`.
- **`package.json` build config**: `better-sqlite3` native rebuild via electron-builder; `data/` excluded from packaged files (DBs are downloaded post-install, not bundled).
