## Why

Current analysis flow is automatic and LLM-driven, which doesn't give users control over when analysis happens and relies on LLM's inference for move suggestions rather than the accuracy of configured engines. Users need explicit control over analysis execution, engine-backed line accuracy, and interactive exploration of variations with keyboard-friendly navigation.

## What Changes

- **Add manual analysis control**: Start/stop buttons for analysis; remove auto-analysis on board movement
- **Visualize moves on board**: Detect when LLM suggests moves and draw arrows on the chessboard to show the variations visually
- **Use engine for lines, not LLM**: Replace LLM move inference with engine analysis; LLM explains the position while engine provides accurate lines
- **Line selection interface**: Display engine lines with numbers; user can click a line or tell LLM the line number to select
- **Memorize selected line**: Store selected line in app state
- **Keyboard navigation**: Once a line is selected, use arrow keys to step through moves forward/backward with position updates

## Capabilities

### New Capabilities

- `manual-analysis-control`: Start/stop buttons for analysis; analysis only runs when explicitly triggered, not on piece movement
- `board-arrow-visualization`: Draw directional arrows on chessboard to indicate suggested moves and variations
- `engine-driven-line-analysis`: Use configured engine (Stockfish/LC0) to generate analysis lines instead of relying on LLM inference
- `line-selection-interface`: Display numbered engine lines; user can select via click or voice command to LLM
- `selected-line-memorization`: Store and track the currently selected variation line in app state
- `keyboard-move-navigation`: Use arrow keys to traverse selected line move-by-move with board state updates

### Modified Capabilities

- `analysis-and-llm-guidance`: LLM role changes from move suggestion to position analysis only; engine provides the lines instead

## Impact

**UI Changes**: 
- Add start/stop buttons to board controls
- Display engine analysis lines with line numbers
- Show move arrows on chessboard
- Add keyboard event listeners for navigation

**Backend Changes**:
- Modify analysis flow to use engine analysis directly in chat context
- Store selected line in board state manager
- Update LLM prompts to focus on explanation rather than line generation

**Affected Components**:
- AnalysisBoard, ChatPanel, SettingsPanel (button addition)
- LLM chat workflow (engine integration, prompt changes)
- Board state management (selected line tracking)
- Chessboard.js integration (arrow drawing)

**Dependencies**:
- Chessboard.js library must support arrow drawing (to be verified)
- Engine analysis results already available; workflow reordering only
