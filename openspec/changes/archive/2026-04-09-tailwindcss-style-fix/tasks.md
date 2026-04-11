## 1. PostCSS pipeline

- [x] 1.1 Update `postcss.config.js` to require `@tailwindcss/postcss` and `autoprefixer`, and ensure the file is CommonJS so Vite can load it without module-type warnings.
- [x] 1.2 Add `npm run tailwind:build` (running `tailwindcss -i src/styles.css -o dist/assets/tailwind.css`) as a documented helper in `package.json` scripts and explain in README how/when to run it.

## 2. Stylesheet wiring

- [x] 2.1 Ensure `src/styles.css` contains the `@tailwind base/components/utilities` directives and remove any legacy CDN references.
- [x] 2.2 Import `./styles.css` from `src/main.jsx` before rendering `<App />` so the Tailwind utilities load during startup.
