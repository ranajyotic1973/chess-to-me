## Context

The application currently supports LLM-based chess analysis where the LLM explains moves and positions through text. However, there's no integration between LLM suggestions and board state—users cannot ask "what if I move e5?" and have the LLM validate, apply, and analyze that move interactively.

Chess.js and chessboard.js are already available in the codebase (for board rendering and move legality checking). The LLM (Ollama, OpenAI, Anthropic, etc.) currently has no way to invoke these tools or trigger engine analysis.

**Current Flow**: User asks question → LLM provides text response → User manually tests moves
**Desired Flow**: User asks "what if I move e5?" → LLM uses tools to validate → LLM applies move to board → LLM triggers analysis of new position → Board updates with move + analysis

## Goals / Non-Goals

**Goals:**
- Enable LLM to access chess.js functions (validate moves, get legal moves, get current FEN)
- Enable LLM to trigger engine analysis of arbitrary positions
- Display move suggestions on the board with validation before applying
- Show warning popups for invalid moves suggested by the LLM
- Return analysis of the new position after a move is applied

**Non-Goals:**
- Modifying the core analysis engine (Stockfish/LC0)
- Supporting user-triggered move suggestions through UI buttons (LLM-only feature for now)
- Creating a separate move suggestion UI mode
- Persisting move history or variants

## Decisions

**Decision 1: Tool Calling Approach (OpenAI-style tools)**
- LLM makes requests via extended prompt context or native tool-calling (if provider supports it)
- Electron IPC handler responds with tool results
- LLM integrates results into next response

*Rationale*: Tool calling is the standard pattern for LLM-agent interaction. It allows the LLM to decide when and how to use tools without hard-coded branching logic. Supports both native tool-calling (OpenAI, Anthropic, Claude) and prompt-based tool invocation (Ollama).

*Alternatives Considered*:
- a) Hardcoded move suggestion response parsing: Brittle, requires LLM to follow exact format. Rejected.
- b) Separate UI for move suggestions: Adds UI complexity. Tool calling is more flexible.

**Decision 2: Tool Set**
Expose these functions as LLM-callable tools:
- `get_board_fen()` → returns current position FEN
- `get_legal_moves()` → returns list of legal moves in current position
- `validate_move(from, to)` → returns true/false and reason if invalid
- `apply_move(from, to)` → applies move to board state (only if valid)
- `analyze_position(fen, depth)` → triggers engine analysis of given position

*Rationale*: Minimal but sufficient set. Prevents LLM from making arbitrary board changes. Validates before applying. Defers to engine for analysis.

**Decision 3: Invalid Move Handling**
- If LLM suggests invalid move: show warning popup, do NOT apply move, continue analysis with original position
- Popup content: "Invalid move: [reason from chess.js]"

*Rationale*: Preserves board state consistency. Gives user visibility into what went wrong. LLM can recover and suggest alternative.

**Decision 4: Response Format**
- LLM response includes both text explanation and move object (if applicable)
- Move object: `{ from: "e2", to: "e4", analysis: <engine_analysis> }`
- Frontend ChatPanel detects move object and applies to board

*Rationale*: Keeps move logic separate from LLM response text. Frontend can render move visually while displaying analysis.

## Risks / Trade-offs

**[Risk] LLM Hallucinating Invalid Moves**
→ *Mitigation*: Tool calling validates every move before application. Invalid moves show warning, original position preserved. LLM sees validation failure and can suggest alternative.

**[Risk] Performance: Analyzing Many Positions**
→ *Mitigation*: Engine analysis is already throttled in existing code. Add rate limiting if needed (1 analysis per 2s per session).

**[Risk] Tool Calling Latency**
→ *Mitigation*: Tools are synchronous IPC calls. Worst case adds ~50-100ms per tool call (negligible vs. LLM response time).

**[Trade-off] Tool Availability by Provider**
→ Ollama may not support native tool calling syntax. Use prompt-based tool invocation fallback (include tool descriptions in system prompt). OpenAI/Anthropic native support via API.

**[Trade-off] Board State Consistency**
→ Tools operate on in-memory board state. No persistence across sessions (acceptable for analysis view). Consider adding undo if needed in future.

## Migration Plan

1. Add tool definitions and IPC handlers in Electron main.ts
2. Update LLM system prompt to include tool descriptions
3. Add move object detection in ChatPanel response rendering
4. Add invalid-move warning dialog to App
5. Update types for tool responses
6. Test with all LLM providers (Ollama, OpenAI, Anthropic, Grok, Gemini)
7. Deploy to dev, verify tool calling works end-to-end

**Rollback**: Remove tool descriptions from system prompt. Revert ChatPanel rendering to text-only. LLM will not attempt tool calling.

## Open Questions

- Should tool-calling be enabled by default, or opt-in via setting?
- Do we want to log all tool calls for debugging?
- Should move suggestions persist to analysis history?
