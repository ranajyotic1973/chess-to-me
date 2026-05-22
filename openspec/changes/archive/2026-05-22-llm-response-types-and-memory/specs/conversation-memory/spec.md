## ADDED Requirements

### Requirement: Store conversation history for context
The system SHALL maintain a conversation history of the last 10 user-LLM exchanges, persisted across sessions using Electron Store.

#### Scenario: Conversation history is preserved on app restart
- **WHEN** user closes app after asking LLM a question
- **THEN** on app restart, the conversation history is loaded from storage

#### Scenario: History is capped at 10 exchanges
- **WHEN** user has asked 11 questions
- **THEN** the oldest question-response pair is removed, keeping only 10 most recent

#### Scenario: Each exchange includes user message and LLM response
- **WHEN** conversation is stored
- **THEN** each entry contains user question, LLM response, and timestamp

#### Scenario: History is available for follow-up context
- **WHEN** user asks a follow-up question
- **THEN** LLM receives previous 10 exchanges as context in the request

### Requirement: User can clear conversation history
The system SHALL provide an option to clear the conversation memory when requested.

#### Scenario: User clears history via settings
- **WHEN** user clicks "Clear Conversation History" in settings
- **THEN** the conversation history is deleted and Electron Store is updated

#### Scenario: New conversation starts after clear
- **WHEN** user asks a question after clearing history
- **THEN** LLM receives no prior context (fresh start)
