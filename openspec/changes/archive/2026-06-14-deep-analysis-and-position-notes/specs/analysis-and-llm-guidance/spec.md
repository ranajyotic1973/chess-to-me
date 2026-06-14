## ADDED Requirements

### Requirement: analysis:deep IPC handler performs a seven-dimension LLM deep-dive per engine line
The main process SHALL register an `analysis:deep` IPC handler that accepts `{ fen: string, lines: AnalysisLine[] }`. For each line the handler SHALL:
1. Build a structured system prompt instructing the LLM to act as an expert chess analyst and return a JSON object with exactly the seven fields: `strategy`, `proscons`, `counterattack`, `sacrifice`, `novelty`, `endgameChances`, `alternatives`.
2. Include the current FEN, the engine's PV moves (in SAN), and the evaluation score in the prompt.
3. Call the LLM using the saved provider settings (provider, model, API key) following the existing timeout rules (300 s reasoning, 120 s cloud, 60 s Ollama).
4. Parse the LLM JSON response and accumulate into an output array.
5. Return `{ ok: true, results: Array<{ lineIndex: number, analysis: DeepLineAnalysis }> }` when all lines are processed, or `{ ok: false, error: string }` on failure.

Lines SHALL be processed sequentially to avoid LLM rate limits.

#### Scenario: Handler returns seven-dimension analysis for each line
- **WHEN** `analysis:deep` is called with a FEN and two engine lines
- **THEN** the handler SHALL return two results, each containing non-empty strings for all seven fields

#### Scenario: Handler respects the saved LLM provider
- **WHEN** the saved provider is OpenAI
- **THEN** the `analysis:deep` handler SHALL use the OpenAI API; it SHALL NOT default to Ollama

#### Scenario: LLM JSON parse failure for one line is handled gracefully
- **WHEN** the LLM returns malformed JSON for line 2 of 3
- **THEN** the handler SHALL log the error, set that line's analysis to `null`, and continue processing remaining lines; `ok` SHALL be `true` with partial results

### Requirement: analysis:deep LLM prompt is child-safe but analytically rigorous
The system prompt used in `analysis:deep` SHALL instruct the LLM to:
- Provide expert-level chess analysis appropriate for advanced club players (not simplified for children).
- Return responses in JSON only, with no prose outside the JSON object.
- Use chess notation (SAN, file/rank labels) freely.
- Keep each field to 2–5 sentences.

#### Scenario: LLM response contains chess notation
- **WHEN** `analysis:deep` processes a line after `1.e4 e5 2.Nf3`
- **THEN** the `strategy` field MAY reference moves in SAN notation (e.g., "After Nf3, White aims to control d4…")
