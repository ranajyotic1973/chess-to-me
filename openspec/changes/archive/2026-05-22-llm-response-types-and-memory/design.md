## Context

Currently, the app treats all LLM interactions as chess position analysis, returning explanations without structure. Engine analysis lines sometimes fail to display in the UI popup. Users lose conversation context between sessions. The LLM system prompt is verbose and includes redundant instructions, wasting tokens on every request.

Architecture uses:
- **Frontend**: React (App, ChatPanel, AnalysisBoard)
- **Backend**: Electron (IPC to LLM providers, engine calls)
- **State**: React hooks + Electron Store for persistence
- **LLM Integration**: Multiple providers (Ollama, OpenAI, Anthropic, Gemini, Grok)
- **Engine**: Stockfish or LC0 via spawned process

## Goals / Non-Goals

**Goals:**
- Support multiple response types (Analysis, Puzzle, Position, Game) with structured metadata
- Persist conversation history (max 10 messages) and retrieve for follow-up context
- Store annotated games (PGN) with move quality symbols
- Reduce LLM token usage by 30-40% through prompt optimization
- Fix engine lines popup to reliably display multiple variations
- Improve line UI to show move previews before full selection
- Maintain backward compatibility with existing analysis workflow

**Non-Goals:**
- Support arbitrary chess file formats (stick to FEN and PGN)
- Cloud-based memory storage (local Electron Store only)
- Real-time collaboration or sharing
- Advanced puzzle difficulty ratings or categorization

## Decisions

### 1. Response Type Structure

**Decision**: Add structured `type` field to LLM response with enum values: `Analysis`, `Puzzle`, `Position`, `Game`.

**Rationale**: Explicit type allows UI to conditionally render FEN boards, hide solutions, and apply type-specific logic without inferring intent from response content.

**Alternatives Considered**:
- Infer type from response content (rejected: brittle, requires NLP heuristics)
- User selects type in UI before asking (rejected: extra click, reduces flexibility)
- LLM returns free-text type string (rejected: no validation, hard to route)

**Implementation**:
- Update system prompt: "Always include response_type field in JSON: one of Analysis|Puzzle|Position|Game"
- Add TypeScript type `ResponseType` enum
- Parse LLM response JSON; route based on type
- For Puzzle/Position: extract `fen` field; optionally include `hidden_explanation: true`

### 2. Conversation Memory System

**Decision**: Maintain in-memory conversation history (last 10 exchanges) in App state, persisted to Electron Store on updates.

**Rationale**: In-memory buffer for performance; Store for session persistence. Cap at 10 to keep LLM context window reasonable and avoid bloat.

**Alternatives Considered**:
- Persist to disk on every message (rejected: I/O overhead, can batch)
- Keep entire game history (rejected: unbounded memory, dilutes LLM context with old info)
- IndexedDB (rejected: over-engineering for 10 messages)

**Implementation**:
- `conversationHistory: Array<{role: 'user'|'llm', message: string, timestamp}>` in App state
- On LLM response: `history.push({role: 'llm', message: response, timestamp})`; if length > 10, `shift()`
- On app load: read history from Electron Store
- Pass `conversationHistory` to LLM request as context (not in system prompt; in user message)

### 3. Game Memory with PGN Annotation

**Decision**: Store annotated PGN in dedicated Electron Store with move annotations (symbols: !!, !, *, !?, ??).

**Rationale**: PGN is standard chess format; annotations are part of PGN spec. Separate storage from conversation history avoids context bloat.

**Alternatives Considered**:
- Store raw moves + metadata (rejected: non-standard, harder to export)
- Append annotations inline to PGN on save (rejected: need to modify PGN structure carefully)
- Only store unannotated PGN (rejected: loses LLM insight)

**Implementation**:
- Electron Store: `gameMemory: {pgnList: Array<{pgn, annotations: Map<moveNumber, symbol>}>}`
- LLM response includes `annotations: {move_number: symbol}` for game analysis
- On user request "annotate game": pass current game state + PGN to LLM; merge annotations into PGN

### 4. System Prompt Optimization

**Decision**: Separate concerns into explicit, minimal instructions. Remove redundancy; use JSON output format to reduce natural language overhead.

**Rationale**: Current system prompt repeats "explain chess" in multiple ways. JSON format is more compact and parseable.

**Alternatives Considered**:
- Keep current verbose prompt (rejected: wasting tokens)
- Use YAML instead of JSON (rejected: JSON is standard, faster to parse)
- Conditional prompts per response type (rejected: more maintenance, little gain)

**Implementation**:
```
System prompt (new structure):
1. You are a chess analysis assistant.
2. Respond in JSON with fields: type, explanation, fen (if applicable), lines (if Analysis), annotations (if Game)
3. For Analysis: include top 3 engine lines with explanations
4. For Puzzle: include solution PGN, hide_explanation: true
5. For Position: include FEN, explanation of piece placement
6. For Game: include PGN, move annotations (symbols: !!, !, *, !?, ??)
7. Keep explanations concise. Avoid generic AI commentary.
```
Expected token savings: remove 40+ words of redundant phrasing; JSON structure replaces field names.

### 5. Engine Lines Display Fix

**Decision**: Ensure engine process returns multiple lines (already implemented in previous work). Add explicit validation in ChatPanel to check lines exist before rendering modal.

**Rationale**: Previous implementation passes lines to LLM. Modal may have been hidden due to CSS or state issues. Validate that `analysisLines.length > 0` before showing.

**Alternatives Considered**:
- Modify engine communication (rejected: already working per previous tasks)
- Use different component for modal (rejected: existing ChatPanel works, just needs debugging)

**Implementation**:
- In ChatPanel: add explicit check `{analysisLines.length > 0 && showEngineLines && (...)}`
- Log engine lines received to console for debugging
- Add test: after analysis, verify modal shows with line count matching engine output

### 6. Line UI Improvements

**Decision**: Render each line with only first N moves visible; show move count ("4 of 6 moves"). Full explanation shown only after click.

**Rationale**: Reduces visual clutter; encourages exploration via click; keeps context brief.

**Alternatives Considered**:
- Show all moves of each line (rejected: crowded, hard to scan)
- Only show first move number (rejected: user won't know line depth)
- Separate "View More" button per line (rejected: extra UI element)

**Implementation**:
- Extract first 3 moves from each line for preview
- Append move count: `"Line 1: e2-e4 e7-e5 g1-f3... (6 moves)"`
- On line selection: fetch full explanation from `selectedEngineLineData`; display in panel

### 7. FEN Rendering for Non-Analysis Responses

**Decision**: When response type is Puzzle/Position, render FEN-based board in AnalysisBoard component; disable move input.

**Rationale**: Separates analysis mode (movable board) from viewing mode (FEN render). Prevents accidental moves during puzzle solving.

**Alternatives Considered**:
- Render FEN in separate modal (rejected: better UX to use existing board component)
- Allow moves but disable analysis (rejected: confusing state)

**Implementation**:
- Add `responseType` to App state
- In AnalysisBoard: if `responseType === 'Puzzle' || 'Position'`, set `readOnly={true}`
- Call `setCurrentFen()` with LLM-provided FEN on response

### 8. Hidden Explanations Toggle

**Decision**: When `hidden_explanation: true` in LLM response, show "Reveal Solution" button. Click toggles explanation visibility.

**Rationale**: Puzzle/Position users want to try solving before seeing solution.

**Alternatives Considered**:
- Always show explanations (rejected: defeats puzzle purpose)
- Hide entire response (rejected: user wants FEN immediately)

**Implementation**:
- Add `showExplanation` state in ChatPanel
- If LLM response includes `hidden_explanation: true`, render button and conditionally show explanation text

## Risks / Trade-offs

**[Risk] Conversation history grows unbounded if not capped**  
→ Mitigation: Enforce max 10 messages; older messages shift out. Test with mock history.

**[Risk] LLM token savings of 30-40% may not materialize if LLM adds back verbose completions**  
→ Mitigation: Monitor actual token usage in production. Adjust prompt if needed.

**[Risk] FEN rendering may fail if LLM provides invalid FEN**  
→ Mitigation: Validate FEN before rendering (chess.js has validation). Show error if invalid.

**[Risk] Multiple engine lines may still not display if state management is off**  
→ Mitigation: Add console logs for debugging. Test with mock engine response.

**[Risk] Annotation symbols may not persist correctly across sessions**  
→ Mitigation: Test PGN save/load cycle. Use standard PGN format.

## Migration Plan

1. **Phase 1 (Week 1)**: Add response type structure and JSON output format to system prompt. Update LLM payload.
2. **Phase 2 (Week 2)**: Implement conversation memory (store/retrieve) and validate engine lines display fix.
3. **Phase 3 (Week 3)**: Add game memory with PGN annotation; build UI for annotation symbols.
4. **Phase 4 (Week 4)**: Optimize system prompt further based on token usage data. Add FEN rendering and hidden explanations.
5. **Phase 5 (Week 5)**: Testing and refinement. Monitor for edge cases.

**Rollback**: All changes are additive. If a feature breaks, disable via feature flag. No database migrations needed.

## Open Questions

1. Should conversation history be per-game or global? (Currently: global across all positions)
2. What move counts should trigger "too many moves" warning for a line?
3. Should annotated games be exportable to standard notation software?
4. How to handle LLM response type misclassifications (e.g., user asks for Puzzle, LLM returns Analysis)?
