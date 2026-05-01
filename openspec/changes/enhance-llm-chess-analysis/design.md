## Context

The LLM integration in the app consists of two main flows:
1. `explainLines(lines)` — Explains pre-computed engine analysis lines to the user
2. `askQuestion(question)` — Answers user questions about positions with optional line context

Currently, engine output (Stockfish UCI PV moves + scores) is sent directly to the LLM with minimal formatting or normalization. The system prompt casts the LLM as a "chess engine" rather than a grandmaster analyst, and doesn't explain the output format or support for structured line comparison.

Key constraints:
- Ollama runs locally; network latency is minimal but we shouldn't over-fetch data
- Stockfish and LC0 output different evaluation formats (centipawns vs. win probability)
- The FEN and board state are available in the React frontend but engine queries happen in Electron main
- LLM responses need to be streamed and cached locally

## Goals / Non-Goals

**Goals:**
- LLM acts as chess grandmaster capable of explaining strategy, evaluating moves, and comparing lines
- Engine output (Stockfish, LC0) is normalized to a standard format before LLM processing
- Lines are formatted with human-readable context (move descriptions, evaluation metadata, rank)
- `askQuestion` auto-fetches FEN from chessboard and queries engine for fresh lines
- LLM can explain entire lines move-by-move and compare lines by strategic merit
- System prompt clearly explains the input format and what the LLM should do with it

**Non-Goals:**
- Don't change the Ollama integration protocol or chat endpoint
- Don't modify how Stockfish/LC0 are invoked or their UCI communication
- Don't persist line explanations or build a cache of annotations
- Don't support interactive move variations (e.g., "what if I play Nf3 instead")
- Don't add UI changes to the ChatPanel beyond the existing question input

## Decisions

**Decision 1: Engine Output Normalization Location**
- **Choice**: Normalize in `buildPrompt()` after retrieving raw lines from engine
- **Rationale**: Centralized location keeps normalization logic in one place; lines are already fetched by this point. Normalizing in `formatLineSummary()` would be too late (info is already lost).
- **Alternative**: Create a separate `normalizeEngineOutput()` function called immediately after engine returns. Rejected because it adds a layer of indirection when lines are already structured in memory.

**Decision 2: Normalized Line Format**
- **Choice**: Include rank, evaluation (with type and confidence), depth, and move list with descriptive notation
  ```
  Line 1 (Best move: e2-e4)
  Evaluation: White +0.50 (Stockfish, depth 25)
  Moves: e2-e4 (pawn), e7-e5 (black pawn), g1-f3 (knight) ...
  ```
- **Rationale**: LLM needs to understand rank (importance), evaluation quality (depth for confidence), and moves in both UCI and readable formats
- **Alternative**: Just UCI moves with evaluation. Rejected because LLM can't explain moves without understanding what pieces are moving.

**Decision 3: System Prompt Role**
- **Choice**: "You are a chess grandmaster analyzing the position..." with explicit instructions to explain strategy, compare lines, and break down moves
- **Rationale**: Grandmaster role encourages strategic thinking; explicit instructions make expectations clear
- **Alternative**: Keep "chess engine" role. Rejected because it limits the LLM's ability to provide strategic context and comparisons.

**Decision 4: askQuestion Auto-Fetch Behavior**
- **Choice**: When user asks a question, auto-fetch FEN from board, query selected engine for top 3-4 lines, then pass to LLM
- **Rationale**: Gives LLM full context for answering; avoids user having to manually request analysis first
- **Alternative**: Require user to analyze first, then ask. Rejected because it adds friction; one-step analysis is better UX.

**Decision 5: Move-by-Move Explanation Support**
- **Choice**: Support via prompt variations; if user says "explain this line move by move," append instructions to the system prompt for this request
- **Rationale**: Minimal code change; all variations handled by prompt engineering rather than new handlers
- **Alternative**: Create new `explainMoveByMove()` handler. Rejected as over-engineering; prompt variations are simpler and more flexible.

## Risks / Trade-offs

**[Risk] Evaluation Type Differences Between Engines**
→ *Mitigation*: Normalize both Stockfish centipawns and LC0 win probability to a common "advantage" scale (e.g., "White is slightly better"). Document confidence level based on depth.

**[Risk] Move Descriptive Notation Requires Board State**
→ *Mitigation*: Use FEN + move history to reconstruct the board at each step and describe moves (e.g., "pawn to e4" vs. "knight to f3"). Library like chess.js can handle this.

**[Risk] LLM May Misinterpret Engine Output**
→ *Mitigation*: Explicit system prompt explaining evaluation types, rank importance, and how to interpret scores. Include examples in prompt.

**[Risk] Performance: Auto-Fetching Lines on Every Question**
→ *Mitigation*: Cache the most recent analysis result for 30 seconds; skip engine query if FEN hasn't changed and cache is fresh.

**[Trade-off] Normalized Format vs. Raw Output**
→ *Reasoning*: Normalized format adds one layer of processing but makes LLM responses much better. Worth the trade.

## Migration Plan

1. Deploy without changing UI — all changes are backend prompt and data formatting
2. Test with local Ollama instance to verify prompt quality and line formatting
3. No breaking changes; existing `explainLines()` calls continue to work with new formatting
4. Rollback: Revert `buildPrompt()` and format functions to use original logic

## Open Questions

1. Should move-by-move explanations include tactical variations ("if black plays X instead...")? Or just narrate the given line?
2. For LC0, how to best explain its "win probability" evaluations to users accustomed to centipawn scales?
3. Should the system prompt mention hardware/time-to-depth for evaluation context ("analyzed to depth 25 in 5 seconds")?
