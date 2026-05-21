## Why

Currently, the LLM can only provide text-based analysis and explanations. Users cannot interact with the board directly through the LLM—asking "what if I move e5?" requires manual board manipulation and doesn't integrate LLM validation or analysis. By enabling the LLM to use tools for move validation and board manipulation, we unlock interactive chess exploration where the LLM can suggest moves, validate them, and provide immediate analysis of the resulting position.

## What Changes

- LLM gains access to chess.js and chessboard.js as tools for retrieving current position FEN and validating moves
- User questions like "what if I move e5?" trigger LLM tool usage: validate move → apply to board → analyze new position
- Invalid move suggestions show a warning popup; valid moves are applied to the board with analysis
- Engine integration allows move validation and automatic analysis of suggested positions
- LLM responses can now include visual board updates alongside text analysis

## Capabilities

### New Capabilities
- `llm-chess-tools`: Tools library exposing chess.js and chessboard.js functions to the LLM (get current FEN, validate moves, list legal moves)
- `move-suggestion-and-validation`: LLM tool for validating candidate moves before applying them to the board
- `interactive-position-analysis`: When LLM suggests a move, automatically analyze the resulting position and return analysis alongside move

### Modified Capabilities
- `analysis-and-llm-guidance`: Extend to support tool calling and move interaction workflows; handle move validation feedback and invalid move warnings

## Impact

- **Frontend**: ChatPanel component enhanced to handle move suggestions and apply them to the board; new invalid-move warning dialog
- **LLM Integration**: Update Electron IPC handlers to support tool calling; expose chess.js/chessboard.js functions as callable tools
- **Types**: New types for tool responses (MoveValidationResult, PositionAnalysisResult)
- **Electron Main**: Add IPC handlers for move validation and position analysis
- **No Breaking Changes**: Existing LLM guidance continues to work; tool calling is opt-in
