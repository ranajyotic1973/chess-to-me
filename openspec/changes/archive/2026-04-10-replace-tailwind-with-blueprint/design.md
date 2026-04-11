## Context
The renderer currently depends on Tailwind/PostCSS for every view, meaning builds must run the `tailwind:build` script and the generated CSS must be imported before the React tree renders. The exploratory shift to Blueprint.js swaps in a standalone component library (CSS shipped via npm) so no PostCSS step is required. Blueprint also aligns with the Windows-style desktop experience we target, so it can replace the Tailwind-driven cards, buttons, and grids in `App.jsx` while keeping the existing Stockfish/LLM logic.

## Goals / Non-Goals
**Goals:**
- Remove Tailwind/PostCSS entirely and rely on Blueprint.js components + CSS, ensuring the renderer loads a single stylesheet from `@blueprintjs/core`.
- Recreate the analysis layout, settings form, and chat panel using Blueprint containers/lines so functionality and spacing stay similar without Tailwind utilities.
- Update docs/scripts to reference the Blueprint dependency and drop the `tailwind:build` workflow.

**Non-Goals:**
- Releasing a new design system unrelated to Blueprint (e.g., writing a custom theme from scratch).
- Changing the underlying Stockfish/Literature analysis behavior.

## Decisions
1. **Library choice:** Blueprint.js is selected because it ships as predefined CSS files, fits Electron/desktop contexts, and does not require Tailwind or PostCSS. Alternatives (Material, Fluent) were rejected because they rely on runtime CSS-in-JS or heavier theming, whereas Blueprint lets us bundle a single CSS import and keep performance predictable.
2. **Component mapping:** Tailwind-styled containers (cards, grids, buttons) will map to Blueprint’s `Card`, `Button`, `ControlGroup`, `FormGroup`, `Dialog`, and `Toast` components. Blueprint’s grid system can replicate the two-column layout by using `div` wrappers with CSS rules; this ensures we keep responsive fit-to-screen behavior.
3. **Styling approach:** Keep `src/styles.css` minimal: import `@blueprintjs/core/lib/css/blueprint.css`, add any necessary overrides (scrollbars, background gradient), and remove the `@tailwind` directives. Ensure `src/main.jsx` imports this stylesheet before mounting the app.

## Risks / Trade-offs
- [Blueprint CSS overrides] ? Blueprint’s global CSS may conflict with existing gradients/backgrounds; we mitigate by keeping overrides scoped to the main container and using Blueprint utility classes sparingly.
- [Bundle size] ? Blueprint adds ~200KB of CSS/JS; however, it is tree-shakable and more predictable than a mixed PostCSS output, and it avoids the runtime cost of generating Tailwind utilities.
- [Dev effort] ? Rewriting the layout with new components is non-trivial; ensure we tackle this systematically in the implementation plan.

## Migration Plan
1. Install Blueprint packages (`@blueprintjs/core`, `@blueprintjs/icons`) and remove Tailwind dependencies (`tailwindcss`, `@tailwindcss/postcss`, `autoprefixer`) from `package.json` if no longer used elsewhere.
2. Update `src/styles.css` to import Blueprint CSS and reduce the stylesheet to overrides; remove any `@tailwind` directives.
3. Refactor `src/App.jsx` to use Blueprint layout components (cards, buttons, form groups, toast) while keeping logic for analysis/chat/status unchanged.
4. Adjust `src/main.jsx` to import the new stylesheet and drop Tailwind-specific scripts; remove the `tailwind:build` script from `package.json`.
5. Update README/docs to mention Blueprint and the new buildless styling approach.

## Open Questions
- Do we also remove Font Awesome if Blueprint icons can replace them, or keep Font Awesome for the gear icon? Blueprint comes with icon fonts, but the gear icon might be better reused from Blueprint’s `Icon` component.
