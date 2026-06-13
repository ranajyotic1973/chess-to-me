# Chess To Me

A chess training app for kids aged 4–18. Play through puzzles, explore master games, ask questions about any position in plain language, and get clear explanations — all running privately on your computer with no account or internet required.

---

## Download

| Platform | Installer |
|----------|-----------|
| **Windows** (64-bit) | [chess-to-me-win-x64.exe](https://github.com/ranajyotic1973/chess-to-me/releases/latest/download/chess-to-me-win-x64.exe) |
| **Windows** (ARM64 — Surface Pro X, Copilot+ PCs) | [chess-to-me-win-arm64.exe](https://github.com/ranajyotic1973/chess-to-me/releases/latest/download/chess-to-me-win-arm64.exe) |
| **macOS** (Intel + Apple Silicon universal) | [chess-to-me-mac-universal.dmg](https://github.com/ranajyotic1973/chess-to-me/releases/latest/download/chess-to-me-mac-universal.dmg) |
| **Linux** (x64 AppImage) | [chess-to-me-linux-x64.AppImage](https://github.com/ranajyotic1973/chess-to-me/releases/latest/download/chess-to-me-linux-x64.AppImage) |
| **Linux** (ARM64 AppImage) | [chess-to-me-linux-arm64.AppImage](https://github.com/ranajyotic1973/chess-to-me/releases/latest/download/chess-to-me-linux-arm64.AppImage) |

All releases are free. [View all releases →](https://github.com/ranajyotic1973/chess-to-me/releases)

---

## Installation

### Windows

1. Download the `.exe` file for your processor (x64 for most PCs).
2. Double-click the installer and follow the prompts.
3. Choose your installation folder (or keep the default) and click **Install**.
4. Launch **Chess To Me** from the Start menu or desktop shortcut.

> Windows may show a SmartScreen warning on first run ("Windows protected your PC"). Click **More info → Run anyway**. This appears because the app is not yet code-signed.

---

### macOS

1. Download the `.dmg` file.
2. Open the downloaded file — a window appears showing the app icon.
3. Drag **Chess To Me** into your **Applications** folder.
4. Open it from Launchpad or Applications.

> On first launch macOS Gatekeeper may say the app is from an unidentified developer. To open it:
> - Right-click (or Control-click) the app icon → **Open** → **Open**.
> - You only need to do this once.

---

### Linux

1. Download the `.AppImage` file for your architecture.
2. Open a terminal and make it executable:
   ```bash
   chmod +x Chess-To-Me-*.AppImage
   ```
3. Run it:
   ```bash
   ./Chess-To-Me-*.AppImage
   ```

Alternatively, right-click the file in your file manager → **Properties → Permissions** → tick **Allow executing as program**, then double-click to launch.

> Ubuntu/Debian users can also download the `.deb` package from the [releases page](https://github.com/ranajyotic1973/chess-to-me/releases) and install it with:
> ```bash
> sudo dpkg -i Chess-To-Me-*.deb
> ```

---

## First-time Setup

When the app opens for the first time it shows the **Settings** screen. You need to configure two things before you can start:

### 1. Chess Engine

Chess To Me uses a chess engine to analyse positions. You can choose between:

| Engine | Best for | Download |
|--------|----------|----------|
| **Stockfish** | Most players — fast, reliable, no extra files needed | [stockfishchess.org](https://stockfishchess.org/download/) |
| **LC0 (Leela Chess Zero)** | Neural network style — requires an extra ~800 MB weights file | [lc0.org](https://lc0.org) |

**Steps:**
1. Download and install (or unzip) the engine of your choice.
2. In the Settings screen, select **Stockfish** or **LC0** from the Engine dropdown.
3. Click **Auto-detect** — the app will find the engine automatically if it is installed in a standard location.
4. If auto-detect doesn't find it, click **Browse** and navigate to the engine executable manually.

### 2. AI Provider (for explanations and chat)

The app uses a large language model (LLM) to answer questions and explain moves. You can use a free local model or a cloud provider:

| Provider | Cost | Privacy | Setup |
|----------|------|---------|-------|
| **Ollama** (local) | Free | Everything stays on your computer | Install [Ollama](https://ollama.com), run `ollama pull qwen3:8b` |
| **OpenAI** (ChatGPT) | Paid API | Data sent to OpenAI | Paste your API key from [platform.openai.com](https://platform.openai.com/api-keys) |
| **Grok** (xAI) | Paid API | Data sent to xAI | Paste your API key from [console.x.ai](https://console.x.ai) |
| **Anthropic** (Claude) | Paid API | Data sent to Anthropic | Paste your API key from [console.anthropic.com](https://console.anthropic.com) |
| **Google Gemini** | Paid API | Data sent to Google | Paste your API key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |

Once the engine and AI provider are configured, click **Go to analysis** to open the main screen.

---

## Features

### Position Analysis

The chess board is shown in the centre of the screen. You can:

- **Load any position** — type or paste a FEN string to jump to any board position.
- **Step through engine lines** — the engine shows up to 4 best moves with their evaluations. Click any line to walk through it on the board with the ← → arrow keys.
- **Ask about the position** — type a question in the chat box (e.g. *"Why is this position good for White?"* or *"What should I play next?"*) and get a plain-language explanation.

### Puzzle Training

Ask the chat for a puzzle, for example:

- *"Give me a fork puzzle"*
- *"I want a checkmate in 2"*
- *"Show me a pin puzzle around 1200 rating"*

When a puzzle loads:

- The board shows the puzzle position.
- **Type your moves** into the chat box in standard notation (e.g. `Rh8+` or `e2e4`). Piece dragging is intentionally disabled so you visualise the move before playing it.
- If your move is **correct**, the board updates and shows the opponent's response.
- If your move is **wrong**, you get a message with a hint and can try again.
- Click **Reveal Solution** to see the full answer explained step by step.
- After solving (or revealing), a new puzzle loads automatically.

### Master Game Database

You can search and replay games from a local database of master-level games. Ask the chat, for example:

- *"Show me games by Kasparov"*
- *"Find a game where Carlsen beat Nakamura"*
- *"I want to see a King's Indian game"*

The app returns a list of matching games. Type the **number** of the game you want to load, and it appears on the board with the players' names and ratings shown above and below the board. Use the ← → arrow keys to step through the moves.

> The games database is not included in the installer due to its size. See [Setting up the Games Database](#setting-up-the-games-database) below.

---

## Settings Reference

Open settings at any time by clicking the **⚙ gear icon** in the top-right corner of the chat panel.

### Chess Engine

| Setting | Description |
|---------|-------------|
| **Engine** | Choose Stockfish or LC0 |
| **Auto-detect** | Finds the engine automatically |
| **Browse** | Manually locate the engine executable |
| **Analysis depth** | How deeply the engine analyses (6–30). Higher = stronger but slower. Default: 16 |
| **Engine timeout** | Maximum seconds the engine runs per analysis (5–300 s). Useful on slower computers |

### AI (LLM) Analysis

| Setting | Description |
|---------|-------------|
| **LLM Provider** | Ollama (local), OpenAI, Grok, Anthropic, or Google Gemini |
| **API Key** | Required for cloud providers — not needed for Ollama |
| **Model** | Click **Save API Key** to fetch available models, then pick one from the list |
| **Language** | Language for all explanations: English, German, Dutch, Spanish, Norwegian, Mandarin Chinese, Japanese, or Korean |

### Puzzle Settings

| Setting | Description |
|---------|-------------|
| **Puzzle difficulty range** | ELO rating range for puzzle selection (400–3000). Lower numbers = easier puzzles |

### Databases

| Action | Description |
|--------|-------------|
| **Puzzle Database — Download** | Downloads ~3 million puzzles from Lichess (required for puzzle mode) |
| **Puzzle Database — Check for updates** | Checks whether a newer puzzle set is available |
| **Games Database — Import PGN / .7z…** | Import a PGN or compressed archive of master games |
| **Delete** | Removes the local database file to free disk space |

---

## Setting up the Games Database

The master games database is not bundled with the installer because it can be very large (hundreds of MB to several GB). To use the games search feature:

1. Visit [lumbrasgigabase.com](https://lumbrasgigabase.com/en/download-in-pgn-format-en/) and download the latest OTB (over-the-board) game file. The file will be in `.7z` or `.pgn` format.
2. Open **Settings → Databases** in Chess To Me.
3. Click **Import PGN / .7z…** and select the downloaded file.
4. The import runs in the background — you can start using the app while it processes. A progress indicator is shown in the Databases section.
5. Once complete, the game count is displayed and games search is ready.

> If you ask for games while the import is still running, the app will tell you the current progress and ask you to try again shortly.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **← Left arrow** | Previous move (when stepping through an engine line or game) |
| **→ Right arrow** | Next move |
| **Enter** | Submit chat message |

---

## System Requirements

| | Minimum | Recommended |
|-|---------|-------------|
| **OS** | Windows 10, macOS 12, Ubuntu 20.04 | Windows 11, macOS 14, Ubuntu 22.04 |
| **RAM** | 4 GB | 8 GB+ (16 GB if using Ollama) |
| **Disk** | 500 MB (app + Stockfish) | 5 GB+ (with Ollama model and games database) |
| **Internet** | Not required | Only needed to download puzzle DB or use a cloud AI provider |

---

## Frequently Asked Questions

**Do I need an internet connection?**
No — the app runs entirely offline once set up. An internet connection is only needed to download the puzzle database, import a games database from Lumbra's Gigabase, or use a cloud AI provider (OpenAI, Grok, etc.).

**Which AI provider should I use?**
For privacy and no ongoing cost, install [Ollama](https://ollama.com) and use `qwen3:8b`. For the best explanation quality, use a cloud provider like OpenAI or Anthropic with your own API key.

**The engine wasn't auto-detected. What do I do?**
Click **Browse** in Settings and navigate to the engine's executable file. On Windows it's usually `stockfish.exe`; on macOS/Linux it has no extension.

**Puzzle moves aren't being accepted.**
Make sure you type moves in the chat box — piece dragging is disabled in puzzle mode by design. Type in standard chess notation (e.g. `Rh8+`, `Qh5`, `e2e4`) and press Enter.

**How do I update the app?**
Download the latest installer from the [releases page](https://github.com/ranajyotic1973/chess-to-me/releases) and run it. Your settings are preserved.

---

## License

MIT — see [LICENSE](LICENSE). Use, modify, and distribute freely.
