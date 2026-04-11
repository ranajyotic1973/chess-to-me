## Why
Tailwind classes currently render as plain markup because the build pipeline never emits the generated utilities—they are only defined via `@tailwind` directives but the PostCSS configuration still points at the legacy plugin, so the renderer never receives the compiled CSS. We need to fix the PostCSS/Tailwind wiring so the renderer actually loads Tailwind’s styles.

## What Changes
- Upgrade the PostCSS pipeline to use `@tailwindcss/postcss`, pair it with `autoprefixer`, and make sure `postcss.config.js` uses a CommonJS entry point so Vite can load it reliably.
- Confirm `src/styles.css` contains the `@tailwind base/components/utilities` directives and that `src/main.jsx` imports this stylesheet before the app renders.
- Add a lightweight `tailwind:build` script and README note that documents how to rebuild the generated CSS if the Tailwind configuration changes.

## Capabilities
### New Capabilities
- `tailwind-postcss-build`: Ensure the renderer imports locally built Tailwind CSS by configuring PostCSS with `@tailwindcss/postcss` + `autoprefixer`, keeping the `@tailwind` directives inside `src/styles.css`, and making sure the entry point (`src/main.jsx`) includes the compiled stylesheet so the generated utilities are available during dev and production builds.

### Modified Capabilities
- `<existing-name>`: <what requirement is changing>

## Impact
- Touches `postcss.config.js` and `package.json` scripts so Vite picks up the new plugin and a `tailwind:build` helper is available.
- Updates `src/styles.css` and `src/main.jsx` to guarantee the Tailwind stylesheet is injected before the React tree.
- Improves documentation so contributors know how to regenerate the Tailwind bundle if the config changes.
