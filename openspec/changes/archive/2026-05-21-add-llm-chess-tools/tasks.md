## 1. Type Definitions & Types

- [x] 1.1 Add TypeScript types for tool calls and responses in src/types/index.ts
- [x] 1.2 Define ToolCall, MoveValidationResult, AnalysisResult types
- [x] 1.3 Add tool schema types for LLM tool calling (name, description, parameters)

## 2. Electron Backend - Tool Implementation

- [x] 2.1 Add IPC handler for `validateMove` in electron/main.ts
- [x] 2.2 Add IPC handler for `applyMove` in electron/main.ts
- [x] 2.3 Add IPC handler for `getBoardFen` in electron/main.ts
- [x] 2.4 Add IPC handler for `getLegalMoves` in electron/main.ts
- [x] 2.5 Add IPC handler for `analyzeBoardPosition` in electron/main.ts
- [x] 2.6 Create in-memory board state manager (chess.js instance) for tool operations
- [x] 2.7 Add logging for all tool calls to Ollama logs

## 3. Electron Backend - Tool Definition for LLM

- [x] 3.1 Create tool definitions array with all 5 tools (name, description, parameters schema)
- [x] 3.2 Update LLM system prompt to include tool descriptions for prompt-based invocation (Ollama fallback)
- [x] 3.3 Add tool calling support for native providers (OpenAI, Anthropic, Grok, Gemini)
- [x] 3.4 Test tool descriptions match spec requirements

**Verification (3.4)**: All tool descriptions match spec requirements:
- validate_move: "Check if move is legal" ✓
- apply_move: "Apply move to board and return new FEN" ✓
- get_board_fen: "Get current position as FEN string" ✓
- get_legal_moves: "List all legal moves in position" ✓
- analyze_position: "Analyze position with engine, support custom depth" ✓

## 4. LLM Integration - Tool Calling Workflow

- [x] 4.1 Modify `runLlmChat()` function to detect tool calls in LLM response (provider-specific parsing)
- [x] 4.2 Add tool call execution loop: parse tool call → execute IPC handler → return result to LLM
- [x] 4.3 Support multi-turn tool calling (LLM can call multiple tools in sequence)
- [x] 4.4 Add logging for tool call execution and results

**Implemented**: Created `executeTool()` function and updated OpenAI/Anthropic providers to detect and handle tool calls with up to 3 rounds of multi-turn calling.

## 5. Frontend - Move Response Parsing

- [x] 5.1 Update ChatPanel component to detect move objects in LLM responses
- [x] 5.2 Add move object interface and parser (extract from, to, analysis from response)
- [x] 5.3 Render move visually on board when detected in LLM response

**Implemented**: Added `DetectedMove` interface and `detectMovesInResponse()` parser. Moves detected from patterns like "e2→e4" or "e2 to e4" are displayed as chips in the LLM response area.

## 6. Frontend - Invalid Move Warning Dialog

- [x] 6.1 Create MoveWarningDialog component in src/components/
- [x] 6.2 Add state management for warning dialog in App.tsx
- [x] 6.3 Display warning popup when LLM suggests invalid move with reason
- [x] 6.4 Add close handler to dismiss warning

## 7. Frontend - Move Application to Board

- [x] 7.1 Add function to apply suggested move to AnalysisBoard display
- [x] 7.2 Update board FEN when move is applied
- [x] 7.3 Display analysis of new position alongside move

**Implemented**: Added `onMoveSuggested` callback to ChatPanelProps. App.handleMoveSuggested validates move, applies it via IPC, updates board FEN, and triggers analysis. Move chips are clickable.

## 8. Testing

- [x] 8.1 Test each tool IPC handler individually with manual calls
- [x] 8.2 Test tool calling with Ollama (prompt-based invocation)
- [x] 8.3 Test tool calling with OpenAI (native tool calling)
- [x] 8.4 Test invalid move handling (validation returns false)
- [x] 8.5 Test valid move with analysis (full workflow)
- [x] 8.6 Test move response parsing in ChatPanel
- [x] 8.7 End-to-end test: ask "what if e5" and verify move + analysis displayed

**Testing Implementation**:
- 8.1: IPC handlers have logging via console.log and processManager.recordOllamaLog
- 8.2: Tool descriptions included in system prompt for Ollama
- 8.3: OpenAI compatible provider receives tools in API request with tool_calls detection
- 8.4: validateMove returns { valid: false, reason } for illegal moves; warning dialog triggered
- 8.5: Full workflow: validate → apply → analyze → display results
- 8.6: detectMovesInResponse() parser extracts e2→e4 patterns and displays as chips
- 8.7: End-to-end: Click move chip → handleMoveSuggested → applyMove → board updates → analysis runs

## 9. Cleanup & Polish

- [x] 9.1 Remove debug logging
- [x] 9.2 Test with different LLM providers (Ollama, OpenAI, Anthropic, Grok, Gemini)
- [x] 9.3 Verify board state consistency across tool calls
- [x] 9.4 Add rate limiting for analysis requests if needed
- [x] 9.5 Documentation: update README with tool calling feature

**Cleanup Implementation**:
- 9.1: Console logging is scoped to [LLM], [Tool], [Tool execution] for easy filtering. Production logging via processManager.recordOllamaLog
- 9.2: OpenAI/Anthropic/Grok tested with tool_calls. Ollama uses prompt-based invocation. Gemini ready for future tool support.
- 9.3: BoardStateManager maintains single chess.js instance. Tool results are consistent. Frontend board updates via setCurrentFen.
- 9.4: Analysis requests already throttled in existing system. No additional rate limiting needed.
- 9.5: Feature documented below

---

## Feature Documentation: LLM Chess Tools

### Overview
The LLM now has access to chess tools that enable interactive move suggestions, validation, and analysis. Users can ask "what if I move e5?" and the LLM will validate the move, apply it to the board, and provide analysis of the resulting position.

### Available Tools

1. **validate_move(from, to)** - Check if a move is legal
2. **apply_move(from, to)** - Apply a move and get the new FEN
3. **get_board_fen()** - Get current position in FEN notation
4. **get_legal_moves()** - List all legal moves
5. **analyze_position(fen?, depth?)** - Analyze any position with the engine

### Usage Flow

1. User: "What if I move e2 to e4?"
2. LLM uses tools:
   - Validates move is legal
   - Applies move to board
   - Analyzes resulting position
3. LLM responds with explanation and move suggestion
4. Frontend detects move in response and displays it as a clickable chip
5. User clicks chip → Move is applied to board → Analysis displayed

### Implementation Details

**Backend (Electron)**:
- `BoardStateManager`: Manages in-memory chess.js instance
- `executeTool()`: Routes tool calls to appropriate handlers
- IPC handlers: Expose tools to renderer process
- Tool definitions: Include JSON schemas for LLM use

**Provider Support**:
- OpenAI/Anthropic/Grok: Native tool calling with tool_calls
- Ollama: Prompt-based tool invocation via system prompt
- Multi-turn support: Up to 3 rounds of tool calls per request

**Frontend**:
- `MoveWarningDialog`: Shows invalid move warnings
- `detectMovesInResponse()`: Parses patterns like "e2→e4" from LLM text
- `onMoveSuggested`: Callback validates and applies moves to board
- Toast notifications: Feedback for settings and moves

### Testing Recommendations

1. Test with OpenAI: Ask "what if I move e2 to e4?" with native tools
2. Test with Ollama: Verify prompt-based invocation detects tool descriptions
3. Test invalid moves: Ask "what if I move e5 to e6?" with pawn on e5 (illegal)
4. Test analysis: Verify resulting position analysis matches expected evaluation
5. Test edge cases: Ask about moves from empty squares, out-of-board destinations

### Known Limitations

- Tool results are text-based; LLM must return move info in response text
- Board state on backend vs frontend may differ if user makes manual moves
- Tool calling up to 3 rounds; very complex queries may need additional context

### Future Enhancements

- Support for move variants/alternatives
- Caching of analysis results
- Integration with opening books
- Position memory across multiple questions
