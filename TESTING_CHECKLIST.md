# LLM Enhancement Testing Checklist

## Overview
This document provides step-by-step instructions for testing the enhanced LLM integration features. All features are code-complete; these tests verify end-to-end functionality.

## Prerequisites
1. **Ollama running**: Ensure Ollama is running with qwen3:8b model
   ```bash
   ollama serve
   ```
2. **Chess engines available**: Stockfish or LC0 configured in settings
3. **Application running**: 
   ```bash
   npm run dev
   ```

## Group 5: Integration and Testing

### 5.2 Test explain-lines flow with Stockfish
**Expected**: LLM receives normalized Stockfish output and explains lines with glyphs and algebraic notation

**Steps**:
1. Open the application
2. Set engine to Stockfish in settings
3. Load a chess position (or use default)
4. Click "Analyze" to get analysis lines
5. Click "Explain Lines" 
6. Verify LLM response includes:
   - ✓ Piece glyphs (♔♕♖♗♘♙)
   - ✓ Algebraic notation (Ne4, Bxd5, 0-0)
   - ✓ No words like "knight" or "bishop"
   - ✓ References to depth and evaluation
   - ✓ Comparison of multiple lines

**Pass criteria**: Response uses glyphs, algebraic notation, and explains why Line 1 is best.

### 5.3 Test explain-lines flow with LC0
**Expected**: LLM handles LC0 win probability (not centipawns) correctly

**Steps**:
1. Set engine to LC0 in settings
2. Load a chess position
3. Click "Analyze"
4. Click "Explain Lines"
5. Verify LLM response includes:
   - ✓ Normalized evaluations (e.g., "white is clearly better")
   - ✓ Win probability context (if mentioning probability)
   - ✓ Glyph and algebraic notation

**Pass criteria**: LC0 win probability converted to readable advantage descriptions.

### 5.4 Test ask-question with auto-fetch FEN
**Expected**: Question handler auto-retrieves FEN from board without manual entry

**Steps**:
1. Load a position (don't manually enter FEN)
2. Open Chat Panel
3. Type question: "What should I play here?"
4. Submit question
5. Verify:
   - ✓ LLM response appears (no FEN required)
   - ✓ Response includes position context
   - ✓ Response uses glyphs and algebraic notation

**Pass criteria**: Question answered without requiring FEN to be provided.

### 5.5 Test best-move recommendations
**Expected**: Top analysis line is used for best-move suggestion

**Steps**:
1. Load a position with multiple good moves
2. Ask: "What's the best move?"
3. Verify LLM response:
   - ✓ Recommends the move from Line 1 (top line)
   - ✓ Explains why it's superior to alternatives
   - ✓ Uses algebraic notation

**Pass criteria**: LLM recommends top-ranked line's first move with clear reasoning.

### 5.6 Test move-by-move explanations
**Expected**: Keywords trigger detailed move-by-move breakdown

**Steps**:
1. Ask: "Explain the first line move by move"
2. Verify response includes:
   - ✓ Each move explained individually
   - ✓ Tactical purpose of each move
   - ✓ Strategic goals
   - ✓ Glyphs and algebraic notation

**Pass criteria**: Detailed move-by-move breakdown with tactical/strategic context.

### 5.7 Test cache hit/miss scenarios
**Expected**: Same position questioned twice within 30 seconds reuses cached analysis

**Steps**:
1. Ask a question about position A (watch response time: ~10-30s with Ollama)
2. Ask different question about same position A within 30 seconds
3. Second question should respond faster (uses cache)
4. After 30 seconds, ask about position A again
5. Third question should be slower (cache expired, re-analyzes)

**Pass criteria**: Second question responds faster than first; third question is slower again.

### 5.8 Test multiple languages
**Expected**: System prompt respects language preference

**Steps**:
1. Change language setting to Spanish (or French)
2. Ask a chess question
3. Verify response is in Spanish (or selected language)
4. Note: Piece glyphs and algebraic notation should be language-independent

**Pass criteria**: LLM responds in selected language while maintaining glyphs and notation.

## Group 6: Documentation and Verification

### 6.1 Verify system prompt explains grandmaster role
**Check**: System prompt explains grandmaster expertise

**Action**: Read electron/main.js lines 1378-1413
- ✓ Opens with "chess grandmaster analyzing positions with expert-level insight"
- ✓ Explains engine output format (centipawn, win probability, depth)
- ✓ Provides notation guide

**Pass criteria**: System prompt clearly establishes grandmaster role and context.

### 6.2 Verify LLM responses use tactical/strategic terminology
**Check**: Observe actual LLM responses during testing

**Expected patterns**:
- ✓ Tactical: "captures on d5", "controls the center", "weak squares"
- ✓ Strategic: "improves piece activity", "creates weaknesses", "seizes initiative"
- ✓ NOT: "The AI calculates...", "The computer suggests..."

**Pass criteria**: Responses use chess terminology, not meta-commentary about AI.

### 6.3 Verify normalization handles both Stockfish and LC0
**Check**: Test with both engines

**Stockfish evaluation**:
- ✓ Centipawn values converted to advantage descriptions
- ✓ Mate-in-X evaluations handled correctly
- ✓ Depth metadata preserved

**LC0 evaluation**:
- ✓ Win probability (0-1) converted to advantage descriptions
- ✓ Mapping: 95%+ = "winning", 75%+ = "clearly better", etc.
- ✓ Depth metadata preserved

**Pass criteria**: Both engine types produce consistent, human-readable evaluations.

### 6.4 Verify line formatting is human-readable and LLM-friendly
**Check**: Observe formatted lines in Chat Panel

**Expected format**:
```
Line 1
Evaluation: white is clearly better (depth 25) (stockfish) [+0.87 pawns]
Moves: 1. e2-e4 2. e7-e5 3. g1-f3
```

**Verify**:
- ✓ Each component on separate line (readable)
- ✓ Includes rank, evaluation, numeric value, depth
- ✓ Moves are numbered and readable
- ✓ LLM can parse and reference these lines

**Pass criteria**: Format is clear to both humans and LLM.

### 6.5 Test end-to-end flow
**Expected**: Complete question → FEN → engine → normalization → formatting → LLM response

**Steps**:
1. Load a position
2. Ask complex question: "Explain the best continuation move by move"
3. Verify complete flow:
   - ✓ FEN auto-fetched from board
   - ✓ Engine queried (or cache used if <30s)
   - ✓ Analysis normalized (cp or win prob)
   - ✓ Lines formatted with glyphs and algebraic notation
   - ✓ LLM response explains using proper terminology
   - ✓ Response uses glyphs (♔♕♖♗♘♙)
   - ✓ Response uses algebraic notation (Ne4, Bxd5)

**Pass criteria**: End-to-end flow works without errors; output quality is high.

## Group 7: Chess Glyphs and Algebraic Notation

### 7.5 Test glyph rendering
**Expected**: Unicode chess piece glyphs render correctly in LLM responses

**Steps**:
1. Ask chess question to trigger LLM response
2. Verify in response:
   - ✓ White pieces visible: ♔ ♕ ♖ ♗ ♘ ♙
   - ✓ Black pieces visible: ♚ ♛ ♜ ♝ ♞ ♟
   - ✓ Glyphs not replaced with ? or boxes
   - ✓ Glyphs render correctly in browser

**Pass criteria**: All glyphs render correctly without encoding issues.

### 7.6 Test algebraic notation consistency
**Expected**: LLM uses algebraic notation throughout (Ne4, Bxd5, 0-0, etc.)

**Steps**:
1. Ask multiple chess questions
2. Verify all LLM responses:
   - ✓ Use algebraic notation (Ne4, not "knight to e4")
   - ✓ Use x for captures (Bxd5, not "bishop captures d5")
   - ✓ Use 0-0 and 0-0-0 for castling
   - ✓ Promotion notation (e8=Q)
   - ✓ Check/checkmate notation (+, #)
   - ✓ NO piece names written out

**Pass criteria**: Algebraic notation used consistently across all responses.

## Group 9: Ollama Performance

### 9.6 Test response times after optimization
**Expected**: LLM responses complete in <5 seconds for typical chess questions

**Measurement**:
1. Ask chess question: "What's the best move?"
2. Note time from submission to response
3. Repeat 5 times, average the times
4. Target: <5 seconds per response

**If slower**:
- Check: Is Ollama hung? (see OLLAMA_PERFORMANCE_GUIDE.md)
- Check: Context size? (look for "context truncated" in logs)
- Check: System resources? (RAM, CPU availability)
- Consider: Smaller model or reduced analysis depth

**Pass criteria**: Average response time <5 seconds; no timeouts or errors.

## Testing Command Workflow

```bash
# 1. Ensure Ollama is running
ollama serve

# 2. (In new terminal) Start application
cd c:\Users\Yashashree Chakrabor\Documents\chess-to-me
npm run dev

# 3. Open browser to http://localhost:5173

# 4. Walk through test cases above

# 5. Watch for issues:
#    - Slow responses → Check OLLAMA_PERFORMANCE_GUIDE.md
#    - No glyphs → Check browser encoding (UTF-8)
#    - Wrong language → Check settings
#    - Timeouts → Check Ollama service
```

## Known Issues and Workarounds

### Issue: Glyphs not rendering
**Cause**: Browser not using UTF-8 encoding
**Fix**: Ensure HTML has `<meta charset="UTF-8">`

### Issue: Slow responses on first question
**Cause**: Ollama model loading into memory
**Expected**: First response 20-30s, subsequent <5s
**Workaround**: Keep Ollama running; responses get faster as model stays in memory

### Issue: Context truncated message
**Cause**: Analysis context exceeds 6000 tokens
**Expected**: Application auto-truncates analysis lines
**Note**: May reduce LLM response quality; consider smaller analysis depth

### Issue: Timeout after 60 seconds
**Cause**: Ollama unresponsive or overloaded
**Fix**: Restart Ollama, check system resources, consider smaller model

## Summary Checklist

- [ ] Group 5.2: Stockfish explain-lines working with glyphs/notation
- [ ] Group 5.3: LC0 explain-lines working with normalized evaluations
- [ ] Group 5.4: Auto-fetch FEN in ask-question
- [ ] Group 5.5: Best-move recommendations from top line
- [ ] Group 5.6: Move-by-move explanations triggered by keywords
- [ ] Group 5.7: Cache working (2nd question within 30s is faster)
- [ ] Group 5.8: Multiple languages supported
- [ ] Group 6.1: System prompt establishes grandmaster role
- [ ] Group 6.2: LLM uses tactical/strategic terminology
- [ ] Group 6.3: Both Stockfish and LC0 normalized correctly
- [ ] Group 6.4: Line formatting readable and LLM-friendly
- [ ] Group 6.5: End-to-end flow complete and high-quality
- [ ] Group 7.5: Glyphs render correctly
- [ ] Group 7.6: Algebraic notation used consistently
- [ ] Group 9.6: Responses complete in <5 seconds

## Completion Criteria

All tests pass when:
1. ✓ LLM responses consistently use glyphs (♔♕♖♗♘♙)
2. ✓ LLM responses use algebraic notation (Ne4, Bxd5, 0-0)
3. ✓ Stockfish and LC0 evaluations both handled correctly
4. ✓ Auto-fetch FEN works without manual entry
5. ✓ Cache functions properly (<30s reuse, >30s re-analyze)
6. ✓ Response times are <5 seconds (typical)
7. ✓ End-to-end flow produces high-quality analysis

**Next step**: Run the application and work through the test cases above.
