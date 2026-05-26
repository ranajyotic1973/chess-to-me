## ADDED Requirements

### Requirement: Send message with Enter key
The system SHALL send the chat message when the user presses the Enter key in the chat input field.

#### Scenario: Send message with Enter
- **WHEN** user types a message in the chat input field
- **WHEN** user presses the Enter key
- **THEN** the message is sent to the LLM
- **AND** the input field is cleared
- **AND** the response appears in the conversation area

#### Scenario: Create newline with Shift+Enter
- **WHEN** user types a message in the chat input field
- **WHEN** user presses Shift+Enter
- **THEN** a newline character is inserted into the message
- **AND** the message is not sent
- **AND** the input field continues to accept more text

#### Scenario: Send empty message prevented
- **WHEN** user presses Enter with an empty input field
- **THEN** the message is not sent
- **AND** a status message appears indicating the input is empty

### Requirement: Provider-aware Ask button
The system SHALL display the Ask button with the active LLM provider's logo or name indicator using appropriate icons.

#### Scenario: Ask button shows Ollama provider
- **WHEN** the LLM provider is set to "ollama"
- **THEN** the Ask button displays an Ollama icon (or "Ollama" text badge)
- **AND** the button text reads "Ask Ollama"

#### Scenario: Ask button shows OpenAI provider
- **WHEN** the LLM provider is set to "openai"
- **THEN** the Ask button displays an OpenAI icon or logo
- **AND** the button text reads "Ask OpenAI"

#### Scenario: Ask button shows Anthropic provider
- **WHEN** the LLM provider is set to "anthropic"
- **THEN** the Ask button displays an Anthropic icon or logo
- **AND** the button text reads "Ask Anthropic"

#### Scenario: Ask button shows Grok provider
- **WHEN** the LLM provider is set to "grok"
- **THEN** the Ask button displays a Grok icon or logo
- **AND** the button text reads "Ask Grok"

#### Scenario: Ask button shows Gemini provider
- **WHEN** the LLM provider is set to "gemini"
- **THEN** the Ask button displays a Gemini icon or logo
- **AND** the button text reads "Ask Gemini"

### Requirement: Icon-based Clear button
The system SHALL replace the text "Clear" button with an icon-only button for a more compact chat interface.

#### Scenario: Clear button is icon-only
- **WHEN** the chat panel is displayed
- **THEN** the Clear button appears as a small icon (e.g., ✕, ⟲, or trash icon)
- **AND** hovering over the button shows a tooltip with the text "Clear"
- **AND** clicking the button clears the chat input field

#### Scenario: Clear button appears next to Ask button
- **WHEN** the chat panel is displayed
- **THEN** the Clear icon button appears immediately after or near the Ask button
- **AND** both buttons are visually aligned

### Requirement: Maintain chat message context
The system SHALL preserve the chat conversation history when using Enter key to send messages.

#### Scenario: Multiple messages maintain context
- **WHEN** user sends message 1 with Enter key
- **AND** the LLM responds
- **WHEN** user sends message 2 with Enter key
- **THEN** both messages and responses appear in conversation history
- **AND** the LLM response considers the full conversation context
