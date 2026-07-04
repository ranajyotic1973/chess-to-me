## MODIFIED Requirements

### Requirement: LLM explanations describe risks/plans and omit non-chess commentary
The LLM SHALL respond with analysis that assesses risk for both sides and recommends the next player's plan of attack based on the current board position created by the moves already played. All prompts SHALL include explicit instructions to avoid generic AI commentary, guaranteeing the response stays purely about chess. **CRITICALLY, the LLM SHALL NOT predict or analyze the next move that will be played in the line; instead it SHALL analyze only the board state resulting from the moves already played.**

#### Scenario: LLM analysis of current position after moves played
- **WHEN** the user is at move 5 in a line (e.g., after 1.e4 c5 2.Nf3 d6 3.d4) and requests LLM analysis
- **THEN** the LLM SHALL analyze the position resulting from those three moves (1.e4 c5 2.Nf3 d6 3.d4), including assessment of White's and Black's plans and risks in that position, WITHOUT analyzing or predicting what the next move in the line will be

#### Scenario: LLM receives only current FEN and moves already played
- **WHEN** the analysis request is sent from the renderer to the main process
- **THEN** the main process SHALL provide the LLM with: (1) the FEN of the current board position, (2) the array of moves already played from line details, and (3) a system prompt that explicitly instructs the LLM to analyze this position only and not reference moves beyond the current position

### Requirement: LLM system prompt restricts analysis to current position only
The system prompt used for move analysis in the main process `electron/main.ts` SHALL include explicit text such as: "Analyze ONLY the board position shown by this FEN and the moves provided. Do NOT predict or analyze moves beyond what has already been played. Assess strategy, risks, and plans for both sides based strictly on the current position."

#### Scenario: System prompt contains restriction
- **WHEN** the LLM analysis request is constructed in the main process
- **THEN** the system prompt STRING SHALL contain language restricting the analysis to the current position and explicitly forbidding prediction of future moves in the line
