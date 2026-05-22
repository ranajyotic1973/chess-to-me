## 1. Response Type System - Backend

- [x] 1.1 Add TypeScript enum `ResponseType` with values: Analysis, Puzzle, Position, Game
- [x] 1.2 Update LLM request interface to include expected response_type field
- [x] 1.3 Create response parser to extract type field from LLM JSON response
- [x] 1.4 Add validation to reject responses missing required type field
- [x] 1.5 Route responses to appropriate handlers based on type in App.tsx

## 2. Response Type System - UI

- [x] 2.1 Create conditional rendering in ChatPanel based on response_type
- [x] 2.2 Add response type indicator badge (small label showing Analysis/Puzzle/etc.)
- [x] 2.3 Test response type switching in UI (verify all 4 types render correctly)

## 3. System Prompt Optimization

- [x] 3.1 Document current system prompt token count
- [x] 3.2 Create optimized system prompt template in JSON schema format
- [x] 3.3 Add response_type parameter support to system prompt generation
- [x] 3.4 Implement type-specific prompt variants (Analysis, Puzzle, Position, Game)
- [x] 3.5 Test token reduction target of 30-40% improvement
- [x] 3.6 Update LLM request payload construction with optimized prompt

## 4. Conversation Memory - Storage

- [x] 4.1 Create conversationHistory state in App.tsx with type `Array<{role, message, timestamp}>`
- [x] 4.2 Add Electron Store configuration for persistingconversation history
- [x] 4.3 Implement loadConversationHistory() on app startup from Electron Store
- [x] 4.4 Add saveConversationHistory() function to persist on each new message
- [x] 4.5 Implement conversation history capping (max 10 exchanges)
- [x] 4.6 Create clearConversationHistory() function for settings

## 5. Conversation Memory - Integration

- [x] 5.1 Modify LLM request payload to include conversationHistory array
- [x] 5.2 Add conversation history to system context (not in system prompt itself)
- [x] 5.3 Update ChatPanel to append new exchanges to conversation history
- [x] 5.4 Test that follow-up questions include prior context
- [x] 5.5 Add "Clear History" button to SettingsPanel

## 6. Game Memory & Annotation - Storage

- [x] 6.1 Create gameMemory state type: `Array<{pgn, annotations: Map<moveNum, symbol>}>`
- [x] 6.2 Add Electron Store configuration for game memory persistence
- [x] 6.3 Implement loadGameMemory() on app startup
- [x] 6.4 Implement saveGameMemory() function to persist on update
- [x] 6.5 Create utility function to parse annotation symbols from LLM response
- [x] 6.6 Implement annotation application to PGN format

## 7. Game Memory & Annotation - UI

- [x] 7.1 Create UI section to display stored games list
- [x] 7.2 Add "Save Game" button after LLM analysis completes
- [x] 7.3 Create modal to view/edit game annotations
- [x] 7.4 Implement PGN export functionality with annotations
- [x] 7.5 Add move quality symbol indicators in UI (!! ! * !? ??)

## 8. FEN Rendering - Core

- [x] 8.1 Add FEN validation utility function using chess.js
- [x] 8.2 Create setboardFromFen() function to update board state from FEN
- [x] 8.3 Add readOnly mode to AnalysisBoard component for non-editable positions
- [x] 8.4 Modify AnalysisBoard to disable piece dragging when readOnly={true}
- [x] 8.5 Test FEN rendering for Puzzle, Position, and Game response types

## 9. FEN Rendering - Integration

- [x] 9.1 Extract FEN field from LLM response for non-Analysis types
- [x] 9.2 Pass FEN to AnalysisBoard when response_type is Puzzle/Position/Game
- [x] 9.3 Set readOnly={true} in AnalysisBoard for Puzzle response type
- [x] 9.4 Clear previous analysis arrows when rendering FEN-based position
- [x] 9.5 Show error message if FEN validation fails

## 10. Hidden Solutions - UI

- [x] 10.1 Create "Reveal Solution" button component
- [x] 10.2 Add showSolution state to ChatPanel for each response
- [x] 10.3 Conditionally render explanation based on showSolution state
- [x] 10.4 Implement click handler for reveal button
- [x] 10.5 Persist reveal state during session (in component state, not storage)
- [x] 10.6 Hide button for Analysis/Position response types (only show for Puzzle)

## 11. Hidden Solutions - Integration

- [x] 11.1 Parse hidden_solution field from LLM response
- [x] 11.2 Render reveal button only when hidden_solution: true
- [x] 11.3 Test puzzle flow: show FEN + button, then reveal solution on click

## 12. Engine Lines Display - Debug & Fix

- [x] 12.1 Add console logging to verify engine returns multiple lines
- [x] 12.2 Inspect LLM response structure to confirm it includes lines field
- [x] 12.3 Verify analysisLines state is updated correctly after engine analysis
- [x] 12.4 Check ChatPanel modal render condition: ensure analysisLines.length > 0
- [x] 12.5 Test that modal appears after analysis completes
- [x] 12.6 Verify line count matches engine output

## 13. Engine Lines Display - UI Improvements

- [x] 13.1 Modify line display to show only first 3-4 moves in modal
- [x] 13.2 Add move count indicator to each line: "(X moves)"
- [x] 13.3 Extract and display full explanation only on line selection
- [x] 13.4 Create side panel for selected line details
- [x] 13.5 Test line selection triggers explanation display
- [x] 13.6 Verify keyboard navigation works with selected line

## 14. Engine Lines Display - Move Count

- [x] 14.1 Implement move extraction logic from PV string
- [x] 14.2 Calculate total move count for each line
- [x] 14.3 Display "Move X of Y" counter when navigating line
- [x] 14.4 Format move preview as "e2-e4 e7-e5 g1-f3 (6 moves)"

## 15. Integration Testing

- [x] 15.1 Test complete flow: ask for Analysis → see engine lines
- [x] 15.2 Test complete flow: ask for Puzzle → see FEN + hidden solution + reveal button
- [x] 15.3 Test complete flow: ask for Position → see FEN, read-only board
- [x] 15.4 Test complete flow: ask for Game → see PGN with annotations
- [x] 15.5 Test conversation history: ask Q1 → Q2 referencing Q1 → verify LLM has context
- [x] 15.6 Test token optimization: measure LLM prompt token reduction
- [x] 15.7 Test game memory: save game → restart app → retrieve and verify

## 16. Edge Cases & Error Handling

- [x] 16.1 Handle invalid FEN from LLM response (validation error message)
- [x] 16.2 Handle response without type field (fallback to Analysis type)
- [x] 16.3 Handle malformed JSON response from LLM
- [x] 16.4 Handle conversation history load failure (graceful degradation)
- [x] 16.5 Handle game memory save failure (show error toast)
- [x] 16.6 Handle empty engine lines (show "No variations found" message)

## 17. Performance & Polish

- [x] 17.1 Optimize conversation history retrieval (cache in memory)
- [x] 17.2 Implement lazy loading for game memory list (pagination if many games)
- [x] 17.3 Add loading spinner during LLM response parsing
- [x] 17.4 Test UI responsiveness with conversation history context
- [x] 17.5 Add smooth transitions for reveal button and modal animations

## 18. Documentation & Cleanup

- [x] 18.1 Document response type enum in types.ts with JSDoc comments
- [x] 18.2 Document conversation memory structure and limits in code comments
- [x] 18.3 Document game memory annotation format in utility functions
- [x] 18.4 Update README with new Puzzle/Position/Game capabilities
- [x] 18.5 Remove any debug console.log statements
- [x] 18.6 Code review: verify no unused variables or imports

## 19. Testing with Multiple LLM Providers

- [x] 19.1 Test response types with Ollama provider
- [x] 19.2 Test response types with OpenAI provider
- [x] 19.3 Test response types with Anthropic provider
- [x] 19.4 Test response types with Gemini provider
- [x] 19.5 Test response types with Grok provider
- [x] 19.6 Verify all providers return valid JSON with required fields

## 20. Final Validation

- [x] 20.1 Manually test all 4 response types end-to-end
- [x] 20.2 Verify conversation history persists across restarts
- [x] 20.3 Verify game memory persists across restarts
- [x] 20.4 Verify engine lines popup displays reliably
- [x] 20.5 Verify FEN rendering works for all non-Analysis types
- [x] 20.6 Verify hidden solutions work for puzzles
