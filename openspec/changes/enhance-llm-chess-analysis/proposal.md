## Why

The LLM currently receives raw chess engine output with minimal context, limiting its ability to provide expert-level analysis. System prompts don't explain engine output format or cast the LLM in a grandmaster role. Stockfish and LC0 produce different output formats and evaluation types (centipawns vs. win probability), requiring normalization before LLM processing. This prevents the LLM from effectively explaining why one line is better than another, breaking down moves step-by-step, or handling position-specific questions with full line context.

## What Changes

- **System prompt enhancement**: LLM will be positioned as a chess grandmaster capable of explaining strategy, comparing lines by evaluation and depth, and providing move-by-move analysis
- **Engine output normalization**: Stockfish and LC0 outputs (PV lines, evaluations, depth metrics) will be converted to a standardized format before sending to LLM
- **Line explanation format**: Lines will include metadata (rank, score with explanation, depth) and human-readable move notation alongside UCI moves
- **Question handler upgrade**: `askQuestion` will auto-retrieve FEN from chessboard, query selected engine for lines, and use top line for "best move" recommendations
- **Move-by-move support**: LLM prompts will support requests to explain entire lines move-by-move or compare specific lines in detail

## Capabilities

### New Capabilities
- `llm-engine-output-normalization`: Converts Stockfish and LC0 engine output to a unified format with standardized evaluation and metadata
- `llm-grandmaster-system-prompt`: System prompt positioning LLM as chess grandmaster capable of strategic analysis and move evaluation
- `llm-line-explanations`: Enhanced line formatting with move descriptions, evaluation metadata, and support for move-by-move breakdown
- `llm-position-question-handling`: Question handler that auto-fetches FEN, queries engine for lines, and provides context-aware answers

### Modified Capabilities
- `llm-analysis-system-prompt`: Enhanced to explain engine output format, grandmaster role, and support for line comparison and move-by-move analysis

## Impact

- Affected code: `electron/main.js` (buildPrompt, formatLineSummary, Ollama handlers, engine output parsing)
- Affected components: `src/components/ChatPanel.jsx` (question handling workflow)
- New utility functions: Engine output parser/normalizer (handles both Stockfish and LC0)
- APIs: No changes to external APIs; internal LLM request/response handling enhanced
- No breaking changes; improvements are additive and backward-compatible with existing LLM calls
