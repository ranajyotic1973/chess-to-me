## Why

Currently, the app only supports chess position analysis via LLM, limiting users who want to explore puzzles, training positions, or annotated games. Additionally, the system lacks persistent memory of conversations and games, forcing users to re-explain context in follow-up questions. The engine lines display is incomplete and token usage in LLM prompts is not optimized, leading to unnecessary API costs and latency.

## What Changes

- **Response Type Detection**: LLM detects and returns response type (Analysis, Puzzle, Position, Game) with structured metadata
- **FEN-Based Rendering**: Non-analysis responses include FEN for direct board rendering without manual setup
- **Hidden Explanations**: Solutions/explanations for Puzzles and Positions remain hidden until user explicitly requests reveal
- **System Prompt Optimization**: Reduce token overhead by 30-40% while maintaining LLM output quality
- **Engine Lines Display Fix**: Ensure engine reports multiple lines and popup displays all variations with move counts
- **Line UI Improvements**: Show only first few moves of each line initially; full explanation only on selection
- **Conversation Memory**: Persist last 10 conversations with LLM to provide context for follow-up questions
- **Game Memory with Annotations**: Store PGN with move quality symbols (!!, !, *, !?, ??) applied by LLM during analysis

## Capabilities

### New Capabilities

- `llm-response-types`: LLM returns structured response type field (Analysis/Puzzle/Position/Game) alongside explanations
- `fen-position-rendering`: Render chess positions from FEN strings in response for non-analysis types
- `hidden-solutions`: Toggle visibility of solution/explanation content based on user request
- `conversation-memory`: Store up to 10 recent user-LLM conversations for context window
- `game-memory-annotation`: Store and manage annotated PGN with move quality symbols
- `system-prompt-optimization`: Token-efficient LLM instruction set for all request types
- `engine-lines-popup-fix`: Fix display of multiple engine analysis lines in UI modal

### Modified Capabilities

- `analysis-and-llm-guidance`: Now supports multiple response types, uses conversation memory context, optimized prompts
- `engine-driven-line-analysis`: Multiple lines display and selection now fully functional

## Impact

**Code Changes**:
- `src/App.tsx`: Add conversation and game memory state; handle response type routing
- `electron/main.ts`: Update LLM payload structure for optimized prompts and memory context
- `src/components/ChatPanel.tsx`: Render response type, handle hidden explanations toggle
- `src/components/AnalysisBoard.tsx`: Render FEN-based positions for non-analysis responses
- `src/utils/`: New utilities for memory management (conversation, game storage)

**API Changes**:
- LLM request payload now includes `conversationHistory` (last N messages) and `responseType` expectation
- LLM response now includes `type`, `fen` (if applicable), and optional `hidden` flag for solutions

**Data Storage**:
- Electron Store: Persist conversation history (max 10) and annotated game PGN
- Optional: IndexedDB for client-side memory if app grows to many games
