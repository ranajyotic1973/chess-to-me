# LLM Analysis System Prompt

The system SHALL define a comprehensive system prompt that positions the LLM as a chess grandmaster, explains engine output format, guides strategic analysis, and enables move-by-move breakdown of analysis lines.

## ADDED Requirements

### Requirement: System prompt establishes grandmaster expert role
The system prompt SHALL position the LLM as a chess grandmaster capable of explaining strategy, evaluating positions, and comparing analysis lines with expert-level insight.

#### Scenario: Grandmaster role established
- **WHEN** LLM is initialized for analysis chat
- **THEN** system prompt establishes grandmaster role with language like "You are a chess grandmaster analyzing this position"

### Requirement: System prompt explains normalized engine output format
The system prompt SHALL document the format of engine output provided to the LLM: normalized evaluations (centipawn or win probability), depth/confidence metrics, move sequences in algebraic notation, and what each element means.

#### Scenario: Output format documented
- **WHEN** system builds LLM prompt with analysis lines
- **THEN** system prompt includes explanation of evaluation meaning, depth significance, and move notation format

### Requirement: System prompt instructs comparison of multiple lines
The system prompt SHALL instruct the LLM to rank analysis lines by evaluation strength, explain why the top line is superior, and identify key strategic differences between lines.

#### Scenario: Line comparison instructions provided
- **WHEN** multiple analysis lines are included in the prompt
- **THEN** system prompt includes instructions: "Compare these analysis lines. Explain why Line 1 is the best continuation and what makes it strategically superior to the alternatives."

### Requirement: System prompt guides move-by-move narration
The system prompt SHALL include instructions for narrating analysis lines move-by-move when requested, with guidance to explain each move's tactical purpose and contribution to the overall plan.

#### Scenario: Move-by-move narration instructions
- **WHEN** user asks to explain a line move-by-move
- **THEN** system prompt includes instructions for sequential move explanation with tactical context

### Requirement: System prompt emphasizes tactical, strategic language
The system prompt SHALL instruct the LLM to use tactical and strategic chess terminology, avoid mentioning AI nature, keep tone practical and move-focused, and tailor explanations to club-level player understanding.

#### Scenario: Tactical focus maintained
- **WHEN** LLM responds to analysis requests
- **THEN** response uses chess-specific terminology, focuses on tactics and strategy, and doesn't mention being an AI

### Requirement: System prompt includes notation guide
The system prompt SHALL include a guide explaining chess notation conventions used: algebraic notation (e.g., e2-e4), piece abbreviations, capture notation (x), check (+), checkmate (#), and promotion notation (=).

#### Scenario: Notation guide provided
- **WHEN** system builds LLM prompt
- **THEN** system prompt includes notation reference: "Notation: e2-e4 = pawn to e4, Nf3 = knight to f3, Bxd5 = bishop captures on d5, 0-0 = castling kingside"

### Requirement: System prompt supports language preference
The system prompt SHALL respect the user's language preference setting and compose response instructions in the specified language (e.g., English, Spanish, French).

#### Scenario: Language preference applied
- **WHEN** user has Spanish language preference set
- **THEN** system prompt instructs LLM to respond in Spanish with chess terminology appropriately translated
