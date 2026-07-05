# Chess To Me

[![Latest Release](https://img.shields.io/github/v/release/ranajyotic1973/chess-to-me?label=latest&color=blue)](https://github.com/ranajyotic1973/chess-to-me/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A chess training app for kids aged 4–18. Solve puzzles, explore master games, learn openings, middlegames and endgames, and ask questions about any position in plain language — with clear, encouraging explanations. Everything runs privately on your own computer; no account is required and no internet is needed once it is set up.

This page is a complete user guide. It explains every button, screen, and interaction in the app.

---

## Contents

- [Security warnings on Windows and macOS](#security-warnings-on-windows-and-macos)
- [Download](#download)
- [Installation](#installation)
- [First-time setup](#first-time-setup)
- [Choosing an AI model](#choosing-an-ai-model)
- [A tour of the main screen](#a-tour-of-the-main-screen)
- [Moving and exploring on the board](#moving-and-exploring-on-the-board)
- [Reading the engine lines](#reading-the-engine-lines)
- [The line preview window](#the-line-preview-window)
- [Asking questions — the four coaching modes](#asking-questions--the-four-coaching-modes)
- [Puzzle training](#puzzle-training)
- [Points and your profile](#points-and-your-profile)
- [Master game database](#master-game-database)
- [Advanced Analysis](#advanced-analysis)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings reference](#settings-reference)
- [Setting up the puzzle database](#setting-up-the-puzzle-database)
- [Setting up the games database](#setting-up-the-games-database)
- [System requirements](#system-requirements)
- [Frequently asked questions](#frequently-asked-questions)
- [Credits and data sources](#credits-and-data-sources)
- [License](#license)

---

## Security warnings on Windows and macOS

> **This is completely free, open-source software. The developer cannot afford the code-signing certificates ($300–500/year for Windows, $99/year for macOS) that would suppress these warnings. The app is safe to run — you can review every line of source code in this repository.**

### Windows — "Windows protected your PC"

When you run the installer you may see a Microsoft Defender SmartScreen dialog saying *"Windows protected your PC"*. This appears for any installer that is not digitally signed by a paid certificate authority, regardless of whether the software is safe.

**To proceed:**
1. Click **More info** (below the warning message).
2. Click **Run anyway**.

You only need to do this once, during installation.

### macOS — "unidentified developer"

macOS Gatekeeper may say the app is from an unidentified developer. This appears for any app distributed outside the Mac App Store that is not signed with a paid Apple Developer ID.

**To proceed:**
1. Right-click (or Control-click) the `.dmg` file → **Open**.
2. Click **Open** again in the dialog that appears.

You only need to do this once.

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

> If Windows shows a SmartScreen warning, see [Security warnings](#security-warnings-on-windows-and-macos) at the top of this page.

### macOS

1. Download the `.dmg` file.
2. Open the downloaded file — a window appears showing the app icon.
3. Drag **Chess To Me** into your **Applications** folder.
4. Open it from Launchpad or Applications.

> If macOS shows an "unidentified developer" warning, see [Security warnings](#security-warnings-on-windows-and-macos) at the top of this page.

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

## First-time setup

When the app opens for the first time it shows the **Settings** screen. You need to set up two things before you can start.

### 1. Chess engine

Chess To Me uses a chess engine to calculate the best moves and evaluate positions. Choose one:

| Engine | Best for | Where to get it |
|--------|----------|-----------------|
| **Stockfish** | Most players — fast, reliable, no extra files needed | [stockfishchess.org](https://stockfishchess.org/download/) |
| **LC0 (Leela Chess Zero)** | A neural-network style of play — needs an extra ~800 MB weights file | [lc0.org](https://lc0.org) |

**Steps:**
1. Download and install (or unzip) the engine you chose.
2. In Settings, pick **Stockfish** or **LC0** from the Engine dropdown.
3. Click **Auto-detect** — the app finds the engine automatically if it is in a standard location.
4. If auto-detect can't find it, click **Browse** and point to the engine program yourself.

### 2. AI provider (for explanations and chat)

The app uses an AI language model to answer your questions, explain moves, create puzzles, and run the opening/middlegame/endgame coaching. You can use a free local model or a paid cloud provider:

| Provider | Cost | Privacy | Setup |
|----------|------|---------|-------|
| **Ollama** (local) | Free | Everything stays on your computer | Install [Ollama](https://ollama.com), run `ollama pull qwen3:8b` |
| **OpenAI** (ChatGPT) | Paid API | Data sent to OpenAI | Paste your key from [platform.openai.com](https://platform.openai.com/api-keys) |
| **Grok** (xAI) | Paid API | Data sent to xAI | Paste your key from [console.x.ai](https://console.x.ai) |
| **Anthropic** (Claude) | Paid API | Data sent to Anthropic | Paste your key from [console.anthropic.com](https://console.anthropic.com) |
| **Google Gemini** | Paid API | Data sent to Google | Paste your key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |

Once the engine and AI provider are set, click **Go to analysis** to open the main screen. You can reopen Settings at any time with the **⚙ gear icon** in the top-right of the chat panel.

---

## Choosing an AI model

The AI model handles **explanations**, position questions, puzzle creation, and the opening/middlegame/endgame coaching. The chess engine (Stockfish or LC0) does the actual move calculation — the model's job is to explain what the engine finds and guide the conversation.

After saving your API key in Settings, click **Save API Key** to load the list of available models. The tables below help you choose.

> **Cheapest useful** = handles everyday chess questions and puzzles well at minimal cost.
> **Strongest chess analysis** = the best positional understanding, step-by-step reasoning, and teaching quality.

### OpenAI

| Model | Cost | Best for |
|-------|------|----------|
| `gpt-4o-mini` | Low | Budget pick — questions, puzzles, simple analysis |
| `gpt-4.1-mini` | Low | Newer budget option with better instruction-following |
| `gpt-4o` | Medium | Noticeably better positional and endgame explanations |
| `gpt-4.1` | Medium | Solid all-rounder with strong chess reasoning |
| `o3-mini` | Medium | Reasoning model — thinks before answering; great for endgames and tactics |
| `o4-mini` | Medium | Latest compact reasoning model; very strong analysis |

**Cheapest useful:** `gpt-4o-mini` or `gpt-4.1-mini` · **Strongest:** `o4-mini` or `o3-mini`

> Reasoning models (`o3-mini`, `o4-mini`) take longer because they reason step-by-step. The app automatically gives them a longer time to answer — the wait is usually worth it for complex positions.

### Anthropic (Claude)

| Model | Cost | Best for |
|-------|------|----------|
| `claude-haiku-4-5` | Lowest | Fast and very affordable; quick questions and puzzle hints |
| `claude-sonnet-4-6` | Medium | Great balance of speed and quality — recommended for daily use |
| `claude-opus-4-8` | High | Highest quality; best for detailed opening and endgame training |

**Cheapest useful:** `claude-haiku-4-5` · **Strongest:** `claude-opus-4-8`

### Google Gemini

| Model | Cost | Best for |
|-------|------|----------|
| `gemini-2.0-flash` | Very low | Fast, free-tier eligible; everyday questions and puzzles |
| `gemini-2.5-flash` | Low | Better reasoning at still very low cost |
| `gemini-2.5-pro` | Medium | Strongest Gemini; excellent understanding and teaching |

**Cheapest useful:** `gemini-2.0-flash` (Google AI Studio has a generous free tier) · **Strongest:** `gemini-2.5-pro`

### Grok (xAI)

| Model | Cost | Best for |
|-------|------|----------|
| `grok-3-mini` | Low | Budget option for straightforward questions |
| `grok-3-mini-fast` | Low | Same budget tier, faster responses |
| `grok-3` | Medium | Best Grok; strong positional reasoning and commentary |
| `grok-3-fast` | Medium | Faster variant of grok-3 with similar quality |

**Cheapest useful:** `grok-3-mini` · **Strongest:** `grok-3`

### Ollama (local — free, no API key)

Running locally means no cost and complete privacy — no chess data ever leaves your computer. You need enough RAM for the model to fit comfortably.

| Model | RAM needed | Best for |
|-------|-----------|----------|
| `qwen3:8b` | ~8 GB | Recommended starter — good quality, fast on most computers |
| `qwen3:14b` | ~16 GB | Noticeably better explanations if you have the RAM |
| `qwen3:32b` | ~32 GB | Near cloud quality on high-end machines |
| `gemma3:12b` | ~12 GB | Google's local model; clear, child-friendly explanations |
| `llama3.3:70b` | ~40 GB | Strongest local option; needs a powerful workstation |

To download a model, open a terminal and run (change the name as needed):
```bash
ollama pull qwen3:14b
```

### Quick recommendation

| Goal | Provider | Model |
|------|----------|-------|
| No cost, private | Ollama | `qwen3:8b` |
| Low cost, cloud | Google Gemini | `gemini-2.0-flash` |
| Best balance | Anthropic | `claude-sonnet-4-6` |
| Strongest reasoning (cloud) | OpenAI | `o4-mini` |
| Strongest overall | Google Gemini | `gemini-2.5-pro` |

---

## A tour of the main screen

The main screen has a few parts:

- **The chess board** — in the centre. This is where everything happens: you move pieces, step through lines, solve puzzles, and replay master games here.
- **The evaluation bar** — a tall bar beside the board. It fills toward white or black to show who the engine thinks is winning, and by how much. It updates after every move.
- **The chat / analysis panel** — to the right of the board. It has three parts, from top to bottom:
  1. **Top Lines** — the engine's best moves for the current position (you can collapse this to save space).
  2. **The conversation** — where you type questions and read the AI's answers.
  3. **The message box** — where you type questions or, in puzzle mode, your moves.
- **The status bar** — along the bottom. Its left-most label shows the current **mode** (Analysis, Opening, Middlegame, or Endgame) and it also shows background activity such as a database import.
- **The profile avatar** — a round badge in the top bar showing your initials and your puzzle points. Click it to see your name and score.
- **The ⚙ gear icon** — opens Settings at any time.

---

## Moving and exploring on the board

In normal **Analysis** mode the board is fully interactive:

- **Make a move** — drag a piece from one square to another. The move is played, the evaluation bar updates, and the engine re-analyses the new position.
- **Go back and forth** — use the **← / → arrow keys** to step backward and forward through the moves you've made or the line you're viewing.
- **Load any position** — paste or type a **FEN** string to jump straight to a specific position. There is also a board editor for setting pieces up by hand.
- **See the opening name** — when your position matches a known opening, its name and ECO code are shown (for example, *Sicilian Defense, Najdorf Variation (B90)*).

> In **Puzzle** mode dragging is turned off on purpose — you type your move instead, so you picture it in your head first. See [Puzzle training](#puzzle-training).

---

## Reading the engine lines

The **Top Lines** section lists the engine's best continuations for the current position, strongest first. Each row shows:

- **The moves** in normal chess notation (with piece symbols), so it reads the way you'd say it out loud.
- **The evaluation** — a number in pawns (for example `+1.2` means white is ahead by about a pawn) or `M5` (checkmate in 5).
- **A spark ✨ icon** on a line that is a **novelty** — a rare-but-sound move that the engine likes but that almost never appears in the master games database. These are creative ideas worth a look. (The spark only appears once you have imported a games database.)
- **A play ▶ icon** at the end of the row — opens the [line preview window](#the-line-preview-window).

**Click a line** to walk through its moves on the main board with the ← / → arrow keys. When a line is selected, a **Moves of selected line** panel and a short detail appear so you can follow it move by move. You can collapse the whole Top Lines list with the arrow button next to its title to make more room for the conversation.

---

## The line preview window

Click the **play ▶ icon** on any engine line to open a preview window. This is a safe, separate place to study a line — **it never changes your main board or game.**

Inside the preview window:

- A **small board** shows the line, starting from its first position.
- An **evaluation bar** shows who stands better at the move you're looking at.
- **Step through the moves** with the **← / → arrow keys**. You stop automatically at the first and last move. You cannot drag pieces here — it is for viewing only.
- **Insight balloons** — the AI reads the whole line and points out the few **critical moves** that decide the outcome. When you step onto one of those moves, a short, child-friendly note pops up near the board explaining why that move matters. It updates as you navigate.
- Close the window with the **✕** in the top-right corner; you return to exactly where you were.

---

## Asking questions — the four coaching modes

Type any chess question into the message box and press **Enter**. The app reads what you *mean* and automatically switches to the right coaching mode. The current mode is shown at the bottom-left of the screen.

Switching is based on your intent, not just keywords — for example *"What is the name of this opening?"* stays in **Analysis**, while *"Teach me the Ruy Lopez"* switches to **Opening**. Every answer is written to be clear, encouraging, and appropriate for ages 4–18, and the coach always stays on chess topics.

### Position analysis

The default mode. Ask about the position in front of you and get a plain-language explanation grounded in what the engine found. Examples:

- *"Why is this position good for White?"*
- *"What should I play next?"*
- *"Is my king safe here?"*
- *"Who is winning and why?"*

### Opening training

Ask to learn or explore an opening and a dedicated opening coach takes over. Examples:

- *"Teach me the Sicilian Defence"*
- *"What's a good opening for White?"*
- *"Explain the Ruy Lopez"*

The coach walks you through the main line move by move from the starting position, explaining the idea behind each move — why that square, why that piece — and often sharing a real story about a famous grandmaster or tournament. Use **← / →** to move at your own pace and ask follow-up questions any time.

### Middlegame training

Ask about plans and strategy once a real game is under way and the coach focuses on the **position on your board**. Examples:

- *"What's the plan here?"*
- *"How do I attack?"*
- *"What does this pawn structure mean?"*

It explains which pieces are active, what both sides should aim for, and shows illustrative moves step by step. Middlegame coaching becomes available once enough moves have been played (about ten moves for each side); before that, strategy questions are answered as ordinary analysis.

### Endgame training

Ask about endgame technique — or how to win the endgame in front of you — and an endgame coach helps out. Examples:

- *"Teach me king and pawn endings"*
- *"How do I checkmate with a rook?"*
- *"Explain the Lucena position"*
- *"How do I win this endgame?"*

For a "how do I win/draw this?" question about your current position, the coach reads the engine's evaluations of every candidate line and shows you the winning path for your side — or, if no win exists, the best way to hold a draw — and explains why, using the numbers. For a general request it sets up the relevant theoretical position and demonstrates the correct technique from both sides. Technical terms — *zugzwang, opposition, key squares, Philidor position* — are defined the moment they appear, so vocabulary builds naturally.

---

## Puzzle training

Ask the chat for a puzzle. Examples:

- *"Give me a fork puzzle"*
- *"I want a checkmate in 2"*
- *"Show me a pin puzzle around 1200 rating"*

When a puzzle loads:

- The board shows the puzzle position.
- **Type your move** into the message box — in standard notation (e.g. `Rh8+`) or coordinate form (e.g. `e2e4`) — and press **Enter**. Dragging is disabled on purpose so you visualise the move first.
- If your move is **correct**, the board plays it and shows the opponent's reply.
- If your move is **wrong**, you get an encouraging hint and can try again — a **Try again** option is always available.
- Click **Reveal Solution** to see the full answer explained step by step. Stepping forward through the solution is locked until you choose to reveal it.
- After you solve it (or reveal it), a new puzzle loads automatically.

> Puzzle mode needs the puzzle database. See [Setting up the puzzle database](#setting-up-the-puzzle-database).

---

## Points and your profile

The round **avatar** in the top bar shows your initials, with your **puzzle points** on a small badge. Solve puzzles to earn points. Click the avatar to open a small card showing your name and current score. If your score is at zero, the card gently encourages you to keep solving.

Set your **display name** in Settings — it controls the initials shown on the avatar.

---

## Master game database

You can search and replay real games played by masters. Ask the chat, for example:

- *"Show me games by Kasparov"*
- *"Find a game where Carlsen beat Nakamura"*
- *"I want to see a King's Indian game"*

The app returns a clickable list of matching games. Click any game to load it on the board, with the players' names and ratings shown above and below the board. Step through it with the **← / →** arrow keys, and ask questions about any position along the way.

> The games database is not included in the installer because of its size. See [Setting up the games database](#setting-up-the-games-database).

---

## Advanced Analysis

Advanced Analysis is a deep-dive mode for stronger players who want more than a best-move suggestion.

### Turning it on

Click the **Advanced Analysis** button (▶ icon) in the toolbar below the board. It is only available in free analysis (not during a puzzle or a loaded game). The engine runs to the full depth set in Settings. Click the same button again (now a ■ stop icon) to leave the mode.

### Seven-dimension breakdown

When the engine finishes, the app sends each top line to your AI provider for a structured, seven-point explanation. Select any line to read:

| Dimension | What it tells you |
|---|---|
| **Strategy** | The strategic or tactical idea behind this line for both sides |
| **Pros & Cons** | Advantages and drawbacks of following it |
| **Counter-attack** | How the opponent can fight back |
| **Sacrifice** | Any piece sacrifice hidden in the variation |
| **Novelty** | A possible move that departs from known theory |
| **Endgame chances** | Which side is better in the resulting endgame, or whether it draws |
| **Alternatives** | Other approaches you could choose instead |

### Position notes

In Advanced Analysis a **Position Notes** panel appears next to the conversation. Type anything — your own analysis, opening ideas, reminders. Notes save automatically a moment after you stop typing, and they are **tied to the exact position**: return to the same position later and your notes reappear.

### Saving and loading analysis

- **Save** — click the 💾 save icon (shown in Advanced Analysis) to write the current game and all your notes to a PGN file in your Chess To Me folder. A message confirms the save and shows the file location.
- **Load** — click the 📂 folder icon to pick any PGN file the app saved earlier; the game replays on the board with your notes restored.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **→ (Right arrow)** | Advance one move (engine lines, puzzle solutions, master games, line preview) |
| **← (Left arrow)** | Go back one move |
| **Enter** | Submit your typed move or question |

These work whenever a game, puzzle solution, engine line, or preview window is on the board. You can always type a question in the chat while navigating.

---

## Settings reference

Open Settings any time with the **⚙ gear icon** in the top-right of the chat panel.

### Chess engine

| Setting | Description |
|---------|-------------|
| **Engine** | Choose Stockfish or LC0 |
| **Auto-detect** | Finds the engine program automatically |
| **Browse** | Point to the engine program yourself |
| **Analysis depth** | How deeply the engine thinks (6–30). Higher is stronger but slower. Default 16 |
| **Engine timeout** | The longest the engine will run on one position before stopping. Minimum 120 seconds — raise it on a slower computer or for very deep analysis |

### AI (assistant)

| Setting | Description |
|---------|-------------|
| **LLM Provider** | Ollama (local), OpenAI, Grok, Anthropic, or Google Gemini |
| **API Key** | Needed for cloud providers; not needed for Ollama. Click **Save API Key** to load the model list |
| **Model** | Pick from the loaded list |
| **Language** | Language for all explanations: English, German, Dutch, Spanish, Norwegian, Mandarin Chinese, Japanese, or Korean |

### Profile

| Setting | Description |
|---------|-------------|
| **Display name** | Sets the initials on your profile avatar |

### Puzzles

| Setting | Description |
|---------|-------------|
| **Puzzle difficulty range** | The rating range puzzles are chosen from (400–3000). Lower numbers = easier puzzles |

### Databases

| Action | Description |
|--------|-------------|
| **Puzzle database — Import from file** | Import a puzzle file you already downloaded (`.csv` or `.csv.zst`) |
| **Puzzle database — Download** | Download the puzzle set automatically from Lichess |
| **Puzzle database — Check for updates** | See whether a newer puzzle set is available |
| **Games database — Import folder of OTB archives** | Point to a folder of `OTB *.7z` files and import them all |
| **Games database — Import a single PGN or .7z file** | Import one game file |
| **Delete** | Remove a local database to free disk space |

---

## Setting up the puzzle database

Puzzle mode needs the Lichess puzzle set (over four million puzzles). You have two ways to get it — you only need one.

**Option A — Import a file you already have (recommended if you've downloaded it)**
1. Download `lichess_db_puzzle.csv.zst` from the [Lichess Open Puzzle Database](https://database.lichess.org/#puzzles) using your browser.
2. Open **Settings → Databases**.
3. Click **Import from file** (the upload icon in the Puzzle Database row) and select the file. Both the compressed `.csv.zst` and a plain `.csv` work.
4. The app imports and indexes the puzzles, showing progress as it goes.

**Option B — Let the app download it**
1. Open **Settings → Databases**.
2. Click **Download** in the Puzzle Database row. The app fetches and imports the set for you.

If an import is interrupted (for example you close the app partway through), the app knows it was not finished and re-imports next time rather than leaving you with a partial set.

---

## Setting up the games database

The master games database is not bundled with the installer because it can be very large (hundreds of MB to several GB). The easiest way to build a full library is to import a whole folder of archives.

**Recommended — import a folder of OTB archives**
1. Visit [lumbrasgigabase.com](https://lumbrasgigabase.com/en/download-in-pgn-format-en/) and download the **`OTB *.7z`** files into a single folder on your computer.
2. Open **Settings → Databases**.
3. Under *Build a complete OTB games library*, click the folder button and select that folder.
4. The app extracts and imports every archive in the folder, in the background — you can keep using the app. Archives you've already imported are skipped automatically next time, so you can add new files later without redoing everything.
5. When it finishes, the game count is shown and games search is ready. The app also builds a small index in the background so it can highlight novelty moves in your analysis.

**Or — import a single file**
- Click **Import a single PGN or .7z file** and choose one `.pgn` or `.7z` file.

> If you ask for games while an import is still running, the app tells you the current progress and asks you to try again shortly.

---

## System requirements

| | Minimum | Recommended |
|-|---------|-------------|
| **OS** | Windows 10, macOS 12, Ubuntu 20.04 | Windows 11, macOS 14, Ubuntu 22.04 |
| **RAM** | 4 GB | 8 GB+ (16 GB if using Ollama) |
| **Disk** | 500 MB (app + Stockfish) | 5 GB+ (with an Ollama model and the games database) |
| **Internet** | Not required | Only to download the puzzle/games data or use a cloud AI provider |

---

## Frequently asked questions

**Do I need an internet connection?**
No — the app runs entirely offline once it is set up. Internet is only needed to download the puzzle or games data, or to use a cloud AI provider.

**Which AI provider should I use?**
For privacy and no ongoing cost, install [Ollama](https://ollama.com) and use `qwen3:8b`. For the best explanations, use a cloud provider such as OpenAI or Anthropic with your own API key.

**The engine wasn't auto-detected. What do I do?**
Click **Browse** in Settings and point to the engine program. On Windows it's usually `stockfish.exe`; on macOS/Linux it has no file extension.

**My puzzle moves aren't being accepted.**
Type your move into the message box and press Enter — dragging is disabled in puzzle mode by design. Use standard notation (`Rh8+`, `Qh5`) or coordinate form (`e2e4`).

**What does the spark ✨ on a line mean?**
It marks a *novelty* — a rare but sound move the engine likes that almost never appears in your imported master games. It only shows once a games database is imported.

**Is it safe to close the app while a database is importing?**
Yes. The import stops cleanly and picks up where it left off (or re-imports if needed) the next time you open the app.

**How do I update the app?**
Download the latest installer from the [releases page](https://github.com/ranajyotic1973/chess-to-me/releases) and run it. Your settings are kept.

---

## Credits and data sources

Chess To Me would not be possible without these excellent open resources.

### Puzzle database — [Lichess](https://lichess.org)

Puzzles come from the [Lichess Open Puzzle Database](https://database.lichess.org/#puzzles), published under a [Creative Commons CC0 licence](https://creativecommons.org/publicdomain/zero/1.0/) (public domain) — over four million puzzles, each with a crowd-sourced difficulty rating and tactical theme tags.

### Games database — [Lumbrasgigabase](https://lumbrasgigabase.com)

Historical over-the-board (OTB) master games are provided by Lumbrasgigabase, a freely available collection of millions of classical games. Download the `OTB *.7z` archives from [lumbrasgigabase.com](https://lumbrasgigabase.com/en/download-in-pgn-format-en/) and import them via Settings → Databases.

---

## License

MIT — see [LICENSE](LICENSE). Use, modify, and distribute freely.
