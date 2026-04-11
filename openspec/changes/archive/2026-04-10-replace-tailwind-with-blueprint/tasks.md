## 1. Tooling + dependencies

- [x] 1.1 Remove Tailwind/PostCSS dependencies and add `@blueprintjs/core` (and icons if needed) so styling comes from bundled CSS.
- [x] 1.2 Update npm scripts/README to remove the Tailwind build step and describe the Blueprint CSS import path.

## 2. Renderer layout swap

- [x] 2.1 Replace Tailwind structures in `src/App.jsx` with Blueprint cards, form groups, control groups, buttons, and textarea components while preserving current Stockfish/LLM logic.
- [x] 2.2 Simplify `src/styles.css` to import `@blueprintjs/core/lib/css/blueprint.css`, add any custom overrides (background, scrollbars), and drop the `@tailwind` directives.
- [x] 2.3 Ensure `src/main.jsx` imports the updated stylesheet before rendering `<App />`.
