## ADDED Requirements

### Requirement: Blueprint components drive the layout
The renderer SHALL use Blueprint.js components (Cards, Buttons, ControlGroup, TextArea, etc.) instead of Tailwind utility classes so every major section (settings form, analysis board, chat, status chips) renders with bundled Blueprint styles.

#### Scenario: Rendering the analysis view
- **WHEN** the analysis view loads in development or production
- **THEN** the layout is composed of Blueprint cards/panels, buttons, and control groups so headers, status chips, FEN input, and chat area follow the Blueprint design system

### Requirement: Blueprint CSS is imported locally
`src/styles.css` SHALL import `@blueprintjs/core/lib/css/blueprint.css` and optionally `@blueprintjs/icons/lib/css/blueprint-icons.css`, and no Tailwind directives remain in the stylesheet.

#### Scenario: Starting the renderer
- **WHEN** React mounts `<App />`
- **THEN** the bundled Blueprint CSS has already been loaded, ensuring classes like `bp4-card`, `bp4-button`, and `bp4-form-group` style the UI without a Tailwind build step

### Requirement: Document Builder updates
`package.json` SHALL drop the `tailwind:build` script, and README.md SHALL mention that Blueprint CSS is handled via npm imports so no additional CSS build step exists.

#### Scenario: Onboarding a new contributor
- **WHEN** a developer reads README.md
- **THEN** they see instructions that styling now depends on Blueprint imports and that no Tailwind rebuild command is necessary
