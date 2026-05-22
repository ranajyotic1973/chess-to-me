## ADDED Requirements

### Requirement: System prompt uses JSON output format
The system SHALL format LLM instructions to require JSON output, reducing natural language overhead and improving token efficiency.

#### Scenario: System message specifies JSON schema
- **WHEN** LLM request is sent
- **THEN** system prompt includes JSON schema with field definitions instead of verbose prose

#### Scenario: JSON format reduces token count
- **WHEN** comparing old and new system prompts
- **THEN** new format uses at least 30% fewer tokens for instruction

#### Scenario: LLM adheres to JSON schema
- **WHEN** LLM processes optimized system prompt
- **THEN** response includes all required JSON fields with correct structure

### Requirement: Remove redundant instructions from system prompt
The system SHALL eliminate duplicate or overlapping guidance to streamline the prompt.

#### Scenario: Single instruction per behavior
- **WHEN** system prompt is analyzed
- **THEN** each behavior requirement appears once, not repeated across multiple sections

#### Scenario: Generic AI commentary rule is stated once
- **WHEN** LLM is instructed to avoid AI chatter
- **THEN** instruction appears in one place with clear examples

### Requirement: Prompt adapts to response type
The system SHALL customize system prompt based on the `response_type` parameter, showing only relevant instructions.

#### Scenario: Puzzle prompt excludes Analysis instructions
- **WHEN** user requests puzzle creation
- **THEN** system prompt focuses on puzzle requirements, omits engine analysis details

#### Scenario: Game annotation prompt includes annotation rules
- **WHEN** user requests game annotation
- **THEN** system prompt explicitly lists move quality symbols (!!, !, *, !?, ??)
