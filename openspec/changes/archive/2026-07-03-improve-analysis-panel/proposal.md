## Why

The current chat panel layout makes LLM analysis responses difficult to notice when they appear—moves played, lines list, and responses are stacked vertically, and users must watch the scroll bar to detect when analysis has been added. Additionally, the LLM is incorrectly analyzing the next move that will be played in the line rather than analyzing the current board position based on moves already made.

## What Changes

- Add a dedicated modal/container overlay that displays LLM analysis and moves played, appearing after the 3rd move is made
- Container includes a close (X) button to dismiss it and return to the lines/moves list view
- Add an icon button to reopen the analysis container when dismissed
- Chat conversation remains visible in its current location
- Fix LLM analysis logic to analyze only the current board position and moves already played (from line details), not predict future moves
- LLM should determine strategy, risks, and plans based solely on the current position

## Capabilities

### New Capabilities
- `llm-analysis-modal`: Modal/container that displays moves played and LLM's current position analysis with dismiss and reopen controls

### Modified Capabilities
- `move-analysis-generation`: LLM should analyze the current board state (moves played so far) instead of analyzing or predicting the next move. Analysis includes strategy, risk, and both players' plans based on the current position only.

## Impact

- **UI Components**: ChatPanel and analysis display logic will need refactoring to support modal overlay
- **LLM Prompt Engineering**: Move to Electron main process (per CLAUDE.md architecture rules) to receive only current moves + current FEN
- **State Management**: Track when analysis modal is open/closed, handle 3rd move trigger
- **Chat Logic**: Ensure existing chat conversation display is not affected by new modal
