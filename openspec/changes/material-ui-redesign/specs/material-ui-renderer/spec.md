## ADDED Requirements

### Requirement: Renderer uses Material UI components and theme
The renderer SHALL import Material UI (@mui/material, @mui/icons-material, @emotion/*) and style the settings, analysis board, chat, status, and helper controls using Material UI components and the shared theme, eliminating Blueprint CSS and components.

#### Scenario: Rendering analysis view
- **WHEN** the settings gate is cleared and the analysis screen renders on any device
- **THEN** the UI consists of Material UI Paper, Grid, Typography, TextField, Button, and CircularProgress components that use the configured theme colors/padding instead of Blueprint classes

### Requirement: Theme controls desktop look-and-feel
The renderer SHALL wrap its tree with a ThemeProvider so a custom Material theme (palette, typography, shape) governs backgrounds, elevations, and responsive spacing.

#### Scenario: Theme applied
- **WHEN** the app starts in dev or production
- **THEN** every Material UI component inherits the shared theme and no Blueprint-specific CSS remains in the bundle
