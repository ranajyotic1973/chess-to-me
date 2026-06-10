## 1. Dependencies & Project Setup

- [x] 1.1 Add `better-sqlite3`, `@types/better-sqlite3`, `fzstd`, and `adm-zip` to `package.json` dependencies
- [x] 1.2 Add `electron-rebuild` to `package.json` devDependencies and add a `postinstall` script: `"postinstall": "electron-rebuild -f -w better-sqlite3"`
- [x] 1.3 Verify `npm install` completes without errors and `better-sqlite3` native module builds successfully
- [x] 1.4 Ensure `data/puzzles/` and `data/games/` directories exist in `.gitignore` (DB files should not be committed)

## 2. Puzzle Database — Schema & Import

- [x] 2.1 Create `electron/database/puzzleDb.ts`: export `initPuzzleDb(dbPath: string): Database` — opens or creates `puzzles.db`, creates the `puzzles` table and indexes on `rating`, and FTS5 virtual table (`puzzles_fts`) for `themes` and `opening_tags`
- [x] 2.2 In `puzzleDb.ts`, export `importPuzzlesFromCsv(db: Database, csvText: string, onProgress: (pct: number) => void): number` — stream-parse CSV line-by-line, batch-insert 1000 rows per transaction, call `onProgress` every 5%, return total row count
- [x] 2.3 In `puzzleDb.ts`, export `searchPuzzles(db: Database, params: { theme?: string, minRating?: number, maxRating?: number, opening?: string, limit?: number }): PuzzleRow[]` — builds parameterised SQL query with all applicable filters, returns up to `limit` (default 5) random matching rows
- [x] 2.4 In `puzzleDb.ts`, export `getPuzzleDbStats(dbPath: string): { count: number, sizeBytes: number } | null` — returns row count and file size, or `null` if DB does not exist

## 3. Games Database — Schema & Import

- [x] 3.1 Create `electron/database/gamesDb.ts`: export `initGamesDb(dbPath: string): Database` — opens or creates `games.db`, creates the `games` table with indexes on `white`, `black`, `eco`, `white_elo`, `black_elo`
- [x] 3.2 In `gamesDb.ts`, export `importPgnText(db: Database, pgnText: string): number` — parse multi-game PGN text, batch-insert all games, return count of games imported
- [x] 3.3 In `gamesDb.ts`, export `searchGames(db: Database, params: { player?: string, eco?: string, minElo?: number, limit?: number }): GameRow[]` — parameterised query returning up to `limit` (default 10) matching games
- [x] 3.4 In `gamesDb.ts`, export `getGamesDbStats(dbPath: string): { count: number, latestTwicIssue: number, sizeBytes: number } | null`

## 4. Downloader Utilities

- [x] 4.1 Create `electron/database/downloader.ts`: export `downloadPuzzleCsv(onProgress: (phase: string, pct: number) => void): string` — downloads `https://database.lichess.org/lichess_db_puzzle.csv.zst`, decompresses with `fzstd`, returns the full CSV string; saves `Last-Modified` header to `data/puzzles/.version`
- [x] 4.2 In `downloader.ts`, export `checkPuzzleUpdate(): Promise<{ hasUpdate: boolean, serverDate: string }>` — sends HTTP HEAD to the Lichess puzzle URL, compares `Last-Modified` header with `data/puzzles/.version` content
- [x] 4.3 In `downloader.ts`, export `getTwicLatestIssue(): Promise<number>` — fetches the TWIC index page and parses the latest issue number
- [x] 4.4 In `downloader.ts`, export `downloadTwicIssues(fromIssue: number, toIssue: number, onProgress: (pct: number) => void): string[]` — downloads each TWIC ZIP in the range, extracts using `adm-zip`, returns array of PGN text strings; updates `data/games/.version` with `toIssue`
- [x] 4.5 In `downloader.ts`, export `checkGamesUpdate(): Promise<{ hasUpdate: boolean, newIssues: number }>` — reads stored issue from `.version`, fetches latest TWIC issue number, returns delta

## 5. IPC Handlers in electron/main.ts

- [x] 5.1 Add IPC handler `db:status` — calls `getPuzzleDbStats` and `getGamesDbStats`, returns `{ puzzles: ..., games: ... }`
- [x] 5.2 Add IPC handler `db:download-puzzles` — calls `downloadPuzzleCsv` (streaming progress events via `event.sender.send("db:progress", ...)`) then `importPuzzlesFromCsv`, returns `{ ok: boolean, count?: number, error?: string }`
- [x] 5.3 Add IPC handler `db:check-puzzle-update` — calls `checkPuzzleUpdate`, returns `{ hasUpdate, serverDate }`
- [x] 5.4 Add IPC handler `db:download-games` — calls `getTwicLatestIssue`, then `downloadTwicIssues` for missing range, then `importPgnText` for each, returns `{ ok: boolean, count?: number, error?: string }`
- [x] 5.5 Add IPC handler `db:check-games-update` — calls `checkGamesUpdate`, returns `{ hasUpdate, newIssues }`
- [x] 5.6 Add IPC handler `db:search-puzzles` — accepts `{ theme, minRating, maxRating, opening, limit }`, calls `searchPuzzles`, returns array of `PuzzleRow`
- [x] 5.7 Add IPC handler `db:search-games` — accepts `{ player, eco, minElo, limit }`, calls `searchGames`, returns array of `GameRow`
- [x] 5.8 Add IPC handler `db:delete-puzzles` — deletes `data/puzzles/puzzles.db` and `data/puzzles/.version`
- [x] 5.9 Add IPC handler `db:delete-games` — deletes `data/games/games.db` and `data/games/.version`

## 6. LLM Intent Extraction

- [x] 6.1 In `src/utils/systemPromptGenerator.ts`, add a new function `buildPuzzleIntentExtractionPrompt(question: string): string` — returns a system prompt instructing the LLM to return JSON `{ theme?: string, minRating?: number, maxRating?: number, opening?: string }` given the user's question
- [x] 6.2 In `electron/main.ts` `handlePuzzleRequest`, before any DB or LLM generation call: if a puzzle DB exists, call the LLM with `buildPuzzleIntentExtractionPrompt` and parse the JSON result into search params; if the call fails or returns no valid JSON, use empty params `{}`
- [x] 6.3 In `handlePuzzleRequest`, after extracting intent params: call `searchPuzzles` with those params; if a result is returned, store it as `dbPuzzle`

## 7. LLM Puzzle Presentation with DB Context

- [x] 7.1 In `src/utils/systemPromptGenerator.ts`, add `buildPuzzlePresentationPrompt(puzzle: PuzzleRow): string` — returns a system prompt that includes the DB puzzle's `fen`, `moves`, `themes`, `opening_tags` as context and instructs the LLM to write a story/walkthrough (NOT generate a new puzzle); requires the LLM to return the same JSON schema as today (`response_type: "Puzzle"`, `fen`, `solution`, `explanation`, `hidden_solution: true`)
- [x] 7.2 In `handlePuzzleRequest`, if `dbPuzzle` was found: call the LLM with `buildPuzzlePresentationPrompt(dbPuzzle)` and use its JSON response as the puzzle result (passing through the existing `tryParseAndValidate` logic)
- [x] 7.3 In `handlePuzzleRequest`, if `dbPuzzle` was NOT found (or DB absent): continue with existing LLM generation flow unchanged

## 8. Settings UI — Database Section

- [x] 8.1 In `src/components/SettingsPanel.tsx`, add a "Databases" section below existing settings with two subsections: "Puzzle Database" and "Games Database"
- [x] 8.2 For each subsection, show status fetched via `db:status` IPC call: row count, last updated, file size, or "Not downloaded"
- [x] 8.3 Add "Download" button (visible when DB absent) and "Check for Updates" button (visible when DB present) for each database
- [x] 8.4 Wire "Download Puzzle Database" button to call `db:download-puzzles` via IPC, subscribing to `db:progress` events to update a MUI `LinearProgress` and status message in real time
- [x] 8.5 Wire "Download Games Database" button to call `db:download-games` via IPC with progress display
- [x] 8.6 Wire "Check for Updates" buttons to `db:check-puzzle-update` / `db:check-games-update` and display results inline
- [x] 8.7 Add "Delete" button for each installed DB with a confirmation dialog before calling `db:delete-puzzles` / `db:delete-games`
- [x] 8.8 Expose `db:progress` IPC listener in the renderer: add `ipcRenderer.on("db:progress", ...)` in the preload or use existing IPC bridge pattern

## 9. pgnmentor.com Script Fix

- [x] 9.1 Investigate correct pgnmentor.com URL pattern (check whether `/players/Name.pgn` is still valid or has changed format)
- [x] 9.2 Update `scripts/fetch-reference-games.ps1` to verify each URL returns a valid PGN (size > 1 KB and starts with `[Event`) before counting as success
- [x] 9.3 Import any successfully downloaded pgnmentor PGNs into `games.db` by calling the `importPgnText` function (add a Node.js script `scripts/import-pgnmentor.js` that opens the DB and runs the import)

## 10. TypeScript Types

- [x] 10.1 Add `PuzzleRow` type to `src/types/index.ts`: `{ puzzle_id: string, fen: string, moves: string, rating: number, rating_deviation: number, popularity: number, nb_plays: number, themes: string, game_url: string, opening_tags: string }`
- [x] 10.2 Add `GameRow` type to `src/types/index.ts`: `{ game_id: number, white: string, black: string, result: string, white_elo: number, black_elo: number, eco: string, opening: string, date: string, event: string, pgn_moves: string }`
- [x] 10.3 Add `DbStatus` type and `DbProgressEvent` type to `src/types/index.ts`
- [x] 10.4 Run `npm run build` (or `tsc --noEmit`) and fix any TypeScript errors (all errors are pre-existing in renderer; electron/ files have zero errors)

## 11. Manual Verification

- [ ] 11.1 Download puzzle DB from Settings, verify row count matches expected (~6M), verify a themed search returns results within 50ms
- [ ] 11.2 Ask for a fork puzzle at 1600 rating in the app — verify puzzle comes from DB (check logs), verify FEN is applied to board, verify solution navigation works
- [ ] 11.3 Ask for a puzzle with an unusual theme that yields no DB results — verify LLM fallback fires correctly
- [ ] 11.4 Download games DB from Settings, verify TWIC import completes, verify a player name search returns games
- [ ] 11.5 Verify "Check for Updates" for puzzle DB correctly reports "Up to date" vs "Update available"
- [ ] 11.6 Delete puzzle DB from Settings, verify status resets to "Not downloaded" and puzzle requests fall back to LLM
