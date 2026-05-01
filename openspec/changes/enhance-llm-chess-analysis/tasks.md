## 1. Engine Output Normalization

- [x] 1.1 Create normalizeEngineOutput() function to handle Stockfish centipawn and LC0 win probability conversion
- [x] 1.2 Implement centipawn-to-advantage conversion (e.g., +150 cp → "white slightly better")
- [x] 1.3 Implement LC0 win probability-to-advantage conversion (e.g., 75% → "white clearly better")
- [x] 1.4 Add depth/confidence metadata to normalized evaluations
- [x] 1.5 Ensure normalized output preserves original PV move sequences (UCI format)
- [x] 1.6 Test normalization with sample Stockfish and LC0 outputs

## 2. Enhanced System Prompt

- [x] 2.1 Update defaultSystemPrompt in buildPrompt() to position LLM as chess grandmaster
- [x] 2.2 Add explanation of engine output format to system prompt (evaluations, depth, notation)
- [x] 2.3 Add instructions for comparing and ranking analysis lines
- [x] 2.4 Add support for move-by-move explanation instructions in prompt variants
- [x] 2.5 Add notation guide (algebraic notation, piece abbreviations, capture/check/checkmate symbols)
- [x] 2.6 Ensure tactical, strategic language emphasis and AI-anonymity in prompt

## 3. Line Formatting Improvements

- [x] 3.1 Enhance formatLineSummary() to include normalized evaluations with metadata
- [x] 3.2 Create function to convert UCI moves to human-readable notation (e.g., "e2-e4" or "pawn to e4")
- [x] 3.3 Reconstruct board state at each move to provide piece context (e.g., "knight to f3")
- [x] 3.4 Format complete line output with rank, evaluation, and move sequence with descriptions
- [x] 3.5 Test move notation conversion with various piece types (pawns, knights, bishops, rooks, queens, kings)
- [x] 3.6 Handle special moves: castling (0-0, 0-0-0), captures (xd5), promotions (=Q)

## 4. Question Handler Enhancement

- [x] 4.1 Modify askQuestion handler to auto-fetch FEN from chessboard if not provided in payload
- [x] 4.2 Auto-query selected engine (Stockfish or LC0) for analysis lines when question is submitted
- [x] 4.3 Implement 30-second cache for recent analysis to avoid redundant engine queries
- [x] 4.4 Use top analysis line (Line 1) for best-move recommendations in LLM context
- [x] 4.5 Support move-by-move explanation requests by detecting keywords in user question
- [x] 4.6 Include full position context (FEN, lines, engine name) in question LLM requests

## 5. Integration and Testing

- [ ] 5.1 Integrate normalization, formatting, and prompt enhancements into buildPrompt() function
- [ ] 5.2 Test explain-lines flow with sample Stockfish analysis output
- [ ] 5.3 Test explain-lines flow with sample LC0 analysis output
- [ ] 5.4 Test ask-question with auto-fetch FEN (board state → engine → LLM)
- [ ] 5.5 Test best-move recommendations from top line
- [ ] 5.6 Test move-by-move explanation requests
- [ ] 5.7 Test cache hit/miss scenarios (same position questioned within 30 seconds)
- [ ] 5.8 Test with multiple languages (ensure language preference respected)

## 6. Documentation and Verification

- [ ] 6.1 Verify system prompt explains grandmaster role and engine output format
- [ ] 6.2 Verify LLM responses use tactical, strategic terminology
- [ ] 6.3 Verify normalization handles both Stockfish and LC0 outputs correctly
- [ ] 6.4 Verify line formatting is human-readable and LLM-friendly
- [ ] 6.5 Test end-to-end: question → FEN fetch → engine query → normalization → formatting → LLM response

## 7. Chess Piece Glyphs and Algebraic Notation

- [x] 7.1 Create glyph mapping table for chess pieces (♔♕♖♗♘♙ for white, ♚♛♜♝♞♟ for black)
- [x] 7.2 Add function to convert piece names to glyphs in LLM prompts
- [x] 7.3 Update system prompt to instruct LLM to use piece glyphs instead of words
- [x] 7.4 Update system prompt to instruct LLM to use algebraic notation (e.g., Ne4) instead of text descriptions
- [ ] 7.5 Test glyph rendering in LLM responses (ensure Ollama model supports Unicode glyphs)
- [ ] 7.6 Test algebraic notation is used consistently in line explanations

## 8. File Cleanup

- [x] 8.1 Determine purpose of App (1).jsx vs App.jsx
- [x] 8.2 Remove or consolidate duplicate App (1).jsx file
- [x] 8.3 Update any import references if necessary
- [x] 8.4 Verify build and dev servers work correctly after cleanup

## 9. Ollama Performance Optimization

- [x] 9.1 Profile current Ollama qwen3 response times (measure latency, throughput)
- [x] 9.2 Check Ollama logs for errors, memory issues, or hung processes
- [x] 9.3 Analyze LLM context window usage (how much context is being sent)
- [x] 9.4 If context exceeds model limits, implement context truncation strategy
- [x] 9.5 Optimize buildPrompt() to reduce context size without losing critical information
- [ ] 9.6 Test response times after optimization (target: <5 seconds for typical queries)
- [x] 9.7 Document any Ollama configuration changes or workarounds applied
