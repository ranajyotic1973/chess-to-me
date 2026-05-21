## MODIFIED Requirements

### Requirement: User can ask chat questions tied to the current position
The chat interface SHALL attach the current FEN to each user question so follow-up prompts reference the existing board. The system SHALL treat each chat question as "analysis for position X" and maintain the same chess-only response policy. **MODIFIED**: The system SHALL also provide the LLM with access to tools (via tool calling or prompt-based tool invocation) to validate moves, apply moves to the board, and request analysis of positions.

#### Scenario: User asks "What should white play next?"
- **WHEN** the user submits a question with the current position after receiving an explanation
- **THEN** the system resends the current FEN plus the question to the LLM and displays a chess-focused answer about potential moves without general AI commentary

#### Scenario: User asks hypothetical move question
- **WHEN** user asks "What if I move e2 to e4?"
- **THEN** LLM can use `validate_move(e2, e4)` tool to check legality, and if valid, use `apply_move(e2, e4)` and `analyze_position()` tools to analyze the new position

#### Scenario: LLM suggests invalid move
- **WHEN** LLM suggests an invalid move via tools
- **THEN** validation tool returns `{ valid: false, reason: "..." }`, and system displays warning popup with the reason instead of applying the move

#### Scenario: LLM suggests valid move with analysis
- **WHEN** LLM suggests valid move and calls `analyze_position()` for resulting position
- **THEN** frontend applies the move to the board and displays analysis alongside explanation text

## ADDED Requirements

### Requirement: LLM tool calling support
The system SHALL enable the LLM to call tools for interactive move suggestion and analysis workflows.

#### Scenario: Native tool calling (OpenAI, Anthropic)
- **WHEN** using provider with native tool calling support
- **THEN** system includes tool definitions in API request; LLM calls tools via native API mechanism

#### Scenario: Prompt-based tool invocation (Ollama fallback)
- **WHEN** using Ollama or provider without native tool calling
- **THEN** system includes tool descriptions in system prompt; LLM invokes tools via structured text format

#### Scenario: Tool calling is optional
- **WHEN** LLM does not use tools (only provides text response)
- **THEN** system displays text response as usual; tools are available but optional

### Requirement: Move response format
The system SHALL support LLM responses that include move objects alongside explanation text.

#### Scenario: LLM response with move object
- **WHEN** LLM returns response with move suggestion (e.g., `{ from: "e2", to: "e4", analysis: {...} }`)
- **THEN** frontend detects move object, applies move to board, and displays analysis

#### Scenario: Response without move object
- **WHEN** LLM returns text-only response
- **THEN** system displays text as usual; board is not modified
