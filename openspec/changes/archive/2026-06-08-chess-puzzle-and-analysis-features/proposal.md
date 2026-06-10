## Why

The app has partial implementations of puzzle mode, inline analysis, and move-by-move explanation that are either incomplete, placed in the wrong UI surface (modal popups instead of chat), or missing core interactions (puzzle attempt validation, per-move caching, app locking during generation). This change audits every requested feature against the current codebase and builds out or fixes any gap found.

## What Changes

- **Puzzle mode**: When the LLM returns a `Puzzle` response, validate the FEN with chess.js, load it onto the analysis board, and store the solution sequence in state. Accept user solution attempts either by dragging pieces on the board or typing move sequences in the chat input. Validate attempts against the stored solution and alert correct/incorrect outcome. On incorrect attempt, load the correct solution to the board and instruct the user to navigate it with **Up/Down arrow keys**.

- **Inline analysis lines**: Replace the current `Modal` popup in `ChatPanel` with an inline section rendered directly in the conversation response area. Each line is selectable by mouse click or by typing its number (e.g., `1`, `2`) in the chat input. When a line is selected, instruct the user to navigate using Up/Down arrow keys.

- **Per-move explanation**: Once a line is selected, generate LLM explanations one move at a time as the user navigates forward (Up arrow). Lock the entire app (overlay/backdrop) while the explanation is being generated and display the result in the chat response area.

- **Explanation cache**: Store per-move explanations in an in-memory map keyed by `FEN + moveIndex`. When the user navigates backward (Down arrow), retrieve the cached explanation without any LLM or engine call.

- **Arrow key rebinding**: Change move navigation from Left/Right arrow keys to Up/Down arrow keys throughout `App.tsx` and `ChatPanel.tsx`.

- **FEN validation for puzzles**: All FEN strings returned by the LLM for puzzles are validated with `chess.js` before being applied to the board. Invalid FENs surface an error message in the chat area.

## Capabilities

### New Capabilities
- `puzzle-solve-flow`: Complete puzzle interaction — FEN validation, solution storage, drag/type attempt capture, correct/incorrect outcome alert, and solution playback navigation
- `inline-analysis-lines`: Analysis variations rendered inline in chat with click and number-typed selection
- `per-move-explanation-with-cache`: Move-by-move LLM explanation triggered by Up arrow, app locked during generation, and explanation cache served on Down arrow (backward navigation)

### Modified Capabilities
- `analysis-and-llm-guidance`: Arrow key bindings changed from Left/Right to Up/Down for move navigation; solution state added for puzzle flow
- `chessboard-rendering`: Board receives puzzle FEN from LLM response and solution move sequence for overlay/highlight during playback

## Impact

- **`src/App.tsx`**: New state for puzzle solution sequence, move attempt tracking, per-move explanation cache map, and app lock flag. Arrow key handler updated from Left/Right to Up/Down. New handlers for puzzle attempt validation and per-move forward explanation.
- **`src/components/ChatPanel.tsx`**: Modal replaced with inline analysis line list in conversation area. Puzzle solution navigation instructions rendered inline. App lock overlay added (or surfaced via prop).
- **`src/utils/llmResponseParser.ts`**: Ensure `solution` field is parsed from Puzzle responses and passed to callers.
- **`src/utils/systemPromptGenerator.ts`**: Puzzle system prompt must request a valid FEN and a `solution` move sequence in the response.
- **Dependencies**: `chess.js` already present; no new package required for FEN validation. Local explanation cache uses a plain `Map` or `Record`; no external DB needed for the initial implementation.
