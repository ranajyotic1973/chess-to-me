# Chess To Me (Electron + Local Stockfish)

Desktop chess trainer that runs a locally installed Stockfish executable and lets you:

- Auto-detect Stockfish first (saved path, common folders, `where/which` lookup)
- Browse and select Stockfish executable if auto-detect fails
- Paste a FEN and load board position instantly
- Drag pieces on a standard black/white chessboard
- Analyze current position with up to 4 Stockfish PV lines (best line first)
- Set analysis depth from app settings
- Generate per-line natural-language explanations in user-selected language using local Ollama
- Select a line and step forward/backward through the line on the board
- View line moves in figurine-style chess notation (piece symbols)
- Open a tabbed `Reference Games` panel and replay games from a PGN database

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run development mode:

```bash
npm run dev
```

3. The UI styling now comes from Material UI with a shared theme, so no separate CSS build step is required—just install the npm dependencies and the renderer applies the Material design system automatically.

4. If Stockfish is not auto-detected:

- Click `Browse Executable` and pick `stockfish.exe` (Windows), or
- Paste the executable path in `Manual path` and click `Save Path`.

4. For AI explanations, make sure Ollama is running locally and a model is pulled (for example `qwen3`):

```bash
ollama pull qwen3
ollama serve
```

## Project Structure

- `electron/main.js`: app window + IPC + Stockfish process manager
- `electron/preload.js`: secure renderer bridge API
- `src/App.jsx`: React UI, analysis tab + reference games tab
- `src/styles.css`: responsive layout and styles
- `vite.config.js`: renderer bundler config
- `data/reference-games/world-champions-mini.pgn`: bundled sample reference games

## Notes

- This starter runs everything locally; no cloud engine is required.
- Engine path is persisted with `electron-store`.
- UI fonts and icons are bundled locally via npm (`@fontsource/*`, `@fortawesome/fontawesome-free`) with no CDN dependency.
- Styling is handled through Blueprint.js components/CSS imported from `@blueprintjs/core`, so no Tailwind/PostCSS build is required.

## OpenSpec workflow

- This project now lives in OpenSpec: see `openspec/specs/chess-trainer/spec.md` for the current scope and guarantees.
- Run `openspec list --json` (or `openspec list`) to view the active change and its status; the onboarding change is recorded under `openspec/changes/convert-to-openspec`.
- Because the BMAD skills have been removed, contributors should use the spec/change files above to understand requirements before editing application code.

## Windows Installer (Open Source)

This project now includes `electron-builder` (NSIS target) as the installer maker.

1. Prepare bundled assets:

```powershell
# Example: download Ollama setup and copy Stockfish executable
npm run prepare:installer-assets -- -DownloadOllama -StockfishExePath "C:\path\to\stockfish.exe"
```

2. Optional: include local qwen3 payload from your Ollama models directory:

```powershell
npm run prepare:installer-assets -- -IncludeQwen3FromLocalOllama
```

3. Build installer:

```bash
npm run dist:win
```

Installer output is written to `release/`.

### NSIS Tooling Note

- `.nsh` is an include/macro file and is not run directly.
- It is consumed by NSIS (`makensis`) when building an `.nsi` script.
- Local NSIS binary is available in this repo at `tools/nsis/`.
- Check install with:

```bash
npm run nsis:version
```

## Reference Game Databases

The app can load any local `.pgn` database from the `Reference Games` tab.

### Bundled Sample

- A small PGN sample is shipped in `data/reference-games/world-champions-mini.pgn`.

### Download Free Databases

- Script to download free player PGNs:

```bash
npm run fetch:reference-games
```

- This downloads PGNs into `data/reference-games/downloaded`.

### Runtime Database (No Massive Download Needed)

In the `Reference Games` tab, you can fetch games directly from Lichess at runtime:

- Enter a comma-separated list of usernames
- Set minimum Elo (for example `2600`)
- Set max games per user
- Click `Fetch 2600+ Games Now`

This avoids bundling very large PGN archives inside the installer.

You can optionally provide an API token in app settings (`Reference API key`) for authenticated requests.
For security, avoid hardcoding keys in source code or installer artifacts.


