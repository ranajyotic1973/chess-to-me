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

## Choosing an AI Model

The AI model handles chess **explanations**, position questions, puzzle generation, and opening/endgame training sessions. The chess engine (Stockfish or LC0) does the actual move calculation — the model only needs to explain what the engine finds and guide the learning conversation.

After saving your API key in Settings, click **Save API Key** to load the available model list. The tables below guide your choice for each provider.

> **Cheapest useful** = a model that handles everyday chess questions and puzzles well at minimal cost.  
> **Strongest chess analysis** = the model with the best positional understanding, step-by-step reasoning, and teaching quality.

---

### OpenAI

| Model | Cost | Best for |
|-------|------|----------|
| `gpt-4o-mini` | Low | Budget pick — handles questions, puzzles, and simple analysis well |
| `gpt-4.1-mini` | Low | Newer budget option; comparable to gpt-4o-mini with improved instruction-following |
| `gpt-4o` | Medium | Noticeably better positional explanations and endgame understanding |
| `gpt-4.1` | Medium | Solid all-rounder with strong chess reasoning |
| `o3-mini` | Medium | Reasoning model — thinks before responding; excellent for endgames and tactics |
| `o4-mini` | Medium | Latest compact reasoning model; very strong chess analysis |

**Cheapest useful:** `gpt-4o-mini` or `gpt-4.1-mini`  
**Strongest chess analysis:** `o4-mini` or `o3-mini`

> Reasoning models (`o3-mini`, `o4-mini`) take longer to respond because they reason step-by-step before answering. This app automatically extends their timeout to 5 minutes. The wait is usually worth it for complex positions and training.

---

### Anthropic (Claude)

| Model | Cost | Best for |
|-------|------|----------|
| `claude-haiku-4-5` | Lowest | Fast, very affordable; good for quick questions and puzzle hints |
| `claude-sonnet-4-6` | Medium | Strong balance of speed and quality — recommended for daily use |
| `claude-opus-4-8` | High | Highest quality; best for detailed opening and endgame training |

**Cheapest useful:** `claude-haiku-4-5`  
**Strongest chess analysis:** `claude-opus-4-8`

---

### Google Gemini

| Model | Cost | Best for |
|-------|------|----------|
| `gemini-2.0-flash` | Very low | Fast, free-tier eligible; good for everyday questions and puzzles |
| `gemini-2.5-flash` | Low | Better reasoning than 2.0-flash at still very low cost |
| `gemini-2.5-pro` | Medium | Strongest Gemini model; excellent chess understanding and teaching quality |

**Cheapest useful:** `gemini-2.0-flash` (Google AI Studio includes a generous free tier)  
**Strongest chess analysis:** `gemini-2.5-pro`

---

### Grok (xAI)

| Model | Cost | Best for |
|-------|------|----------|
| `grok-3-mini` | Low | Budget option; handles straightforward questions well |
| `grok-3-mini-fast` | Low | Same budget tier with faster responses |
| `grok-3` | Medium | Best Grok model; strong positional reasoning and game commentary |
| `grok-3-fast` | Medium | Faster variant of grok-3 with similar quality |

**Cheapest useful:** `grok-3-mini`  
**Strongest chess analysis:** `grok-3`

---

### Ollama (Local — Free, No API Key)

Running locally means no API costs and complete privacy — no chess position data ever leaves your computer. You need enough RAM for the model to fit comfortably.

| Model | RAM needed | Best for |
|-------|-----------|----------|
| `qwen3:8b` | ~8 GB | Recommended starter — good quality, fast on most computers |
| `qwen3:14b` | ~16 GB | Noticeably better explanations; worth it if you have the RAM |
| `qwen3:32b` | ~32 GB | Near cloud quality on high-end machines |
| `gemma3:12b` | ~12 GB | Google's local model; clear, child-friendly explanations |
| `llama3.3:70b` | ~40 GB | Strongest local option; requires a powerful workstation |

**Cheapest useful (minimum RAM):** `qwen3:8b`  
**Strongest local chess analysis:** `llama3.3:70b` or `qwen3:32b`

To download a model, open a terminal and run (replace the model name as needed):
```bash
ollama pull qwen3:14b
```

---

### Quick Recommendation Summary

| Goal | Provider | Model |
|------|----------|-------|
| No cost, private | Ollama | `qwen3:8b` |
| Low cost, cloud | Google Gemini | `gemini-2.0-flash` |
| Best balance of cost and quality | Anthropic | `claude-sonnet-4-6` |
| Strongest chess reasoning (cloud) | OpenAI | `o4-mini` |
| Strongest overall | Google Gemini | `gemini-2.5-pro` |

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

## For Advanced Players — Advanced Analysis

Advanced Analysis is a deep-dive mode designed for club players and above who want more than just best-move suggestions.

### Activating Advanced Analysis

Click the **Advanced Analysis** button (▶ icon) in the toolbar below the board. The button is only visible when no game or puzzle is active (free analysis mode). The engine runs at the full depth configured in your Settings (`Analysis Depth`, default 16). Click the same button again (now showing a ■ stop icon) to exit the mode.

### Seven-Dimension Analysis

Once the engine finishes, the app sends each top engine line to your configured AI (LLM) provider for a structured seven-point analysis. Select any line to see:

| Dimension | What it tells you |
|---|---|
| **Strategy** | The strategic or tactical idea behind this line for both sides |
| **Pros & Cons** | Advantages and drawbacks of following this line |
| **Counter-attack** | How the opposing side can fight back |
| **Sacrifice** | Any piece sacrifice hidden in this variation |
| **Novelty** | A possible novelty move that diverges from known theory |
| **Endgame chances** | Which side holds the advantage in the resulting endgame, or whether it draws |
| **Alternatives** | Other strategic approaches the player could choose instead |

> Advanced players sometimes prefer to play a suboptimal engine line to sidestep their opponent's preparation. The seven-dimension breakdown helps you evaluate those tradeoffs analytically.

### Position Notes

When Advanced Analysis is active a **Position Notes** panel appears to the right of the chat area. Type anything — your own analysis, opening ideas, plans to remember. Notes are saved automatically (500 ms after you stop typing) and are **keyed to the exact board position**: navigate to the same FEN in any future session and your notes reappear.

Notes are stored in `<userData>/chess-to-me/position-notes.json`.

### Saving and Loading Analysis

**Save** — Click the 💾 save icon (visible only in Advanced Analysis mode) to write the current game and all position notes to a PGN file. The file is saved as `analysis-<dd-mm-yyyy_hh>.pgn` in `<userData>/chess-to-me/`. A toast notification confirms the save and shows the full file path.

**Load** — Click the 📂 folder icon (always visible in analysis mode) to open a file picker. Select any `.pgn` file saved by the app; the game is replayed on the board and all embedded notes are restored.

---

## License

MIT — see [LICENSE](LICENSE). Use, modify, and distribute freely.
