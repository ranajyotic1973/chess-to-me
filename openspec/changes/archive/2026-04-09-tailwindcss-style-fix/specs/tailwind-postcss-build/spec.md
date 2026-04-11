## ADDED Requirements

### Requirement: PostCSS pipeline compiles Tailwind outputs
The PostCSS configuration SHALL use the `@tailwindcss/postcss` plugin together with `autoprefixer` so that `@tailwind base/components/utilities` in `src/styles.css` expand into real CSS during Vite builds.

#### Scenario: Building or running the renderer
- **WHEN** a developer runs `npm run dev` or `npm run build`
- **THEN** PostCSS invokes `@tailwindcss/postcss` and the compiled stylesheet contains Tailwind’s generated utilities instead of blank placeholders

### Requirement: Stylesheet is imported before the React tree
`src/main.jsx` SHALL import `src/styles.css` before mounting `<App />` so the Tailwind styles are present on every page load.

#### Scenario: Renderer startup
- **WHEN** the renderer starts in development or production
- **THEN** Tailwind-specific classes (e.g., `bg-primary`, `rounded-2xl`) are styled according to the generated CSS rather than falling back to defaults

### Requirement: Tailwind rebuild script documented
`package.json` SHALL expose a `tailwind:build` script that runs the Tailwind CLI to regenerate the CSS, and README.md SHALL document when/how to run it.

#### Scenario: Changing Tailwind config
- **WHEN** a contributor edits `tailwind.config.js`
- **THEN** they can run `npm run tailwind:build` (as described in the README) to refresh the generated CSS without needing to understand Vite internals
