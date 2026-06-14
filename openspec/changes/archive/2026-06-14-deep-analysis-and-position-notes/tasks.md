## 1. IPC Layer — Main Process

- [x] 1.1 Add `DeepLineAnalysis` TypeScript interface to `electron/main.ts` (fields: `strategy`, `proscons`, `counterattack`, `sacrifice`, `novelty`, `endgameChances`, `alternatives`)
- [x] 1.2 Register `analysis:deep` IPC handler in `electron/main.ts` — accepts `{ fen, lines }`, iterates each line sequentially, builds 7-dimension LLM prompt, calls LLM with saved provider settings and existing timeout rules, parses JSON response, returns `{ ok, results }`
- [x] 1.3 Register `notes:get` IPC handler — reads `<userData>/chess-to-me/position-notes.json`, returns note string for the given FEN or `null`; creates file with `{}` if absent
- [x] 1.4 Register `notes:set` IPC handler — reads `position-notes.json`, sets the FEN key, writes file back; creates file if absent; logs and returns on I/O error
- [x] 1.5 Register `analysis:save-pgn` IPC handler — formats timestamp as `dd-mm-yyyy_hh` (local time), appends `[Notes]` JSON tag to the provided PGN string, writes to `<userData>/chess-to-me/analysis-<timestamp>.pgn`, returns `{ ok, path }`
- [x] 1.6 Register `analysis:load-pgn` IPC handler — opens Electron `dialog.showOpenDialog` filtered to `*.pgn`, reads file, strips and parses the `[Notes]` tag if present, returns `{ ok, pgn, notes }` or `{ ok: false, cancelled: true }`

## 2. Preload and Type Definitions

- [x] 2.1 Expose `deepAnalyzeLines(payload: { fen: string; lines: AnalysisLine[] })` in `electron/preload.ts` via `ipcRenderer.invoke("analysis:deep", payload)`
- [x] 2.2 Expose `notesGet(fen: string)` and `notesSet(fen: string, text: string)` in `electron/preload.ts`
- [x] 2.3 Expose `saveAnalysisPgn(payload: { pgn: string; notes: Record<string, string> })` and `loadAnalysisPgn()` in `electron/preload.ts`
- [x] 2.4 Add `DeepLineAnalysis` interface and extend `ElectronAPI` in `src/types/index.ts` with: `deepAnalyzeLines`, `notesGet`, `notesSet`, `saveAnalysisPgn`, `loadAnalysisPgn`

## 3. PositionNotesPanel Component

- [x] 3.1 Create `src/components/PositionNotesPanel.tsx` — MUI Paper with a header "Position Notes" label, an FEN sub-label (first 20 chars + "…"), and a full-height multiline `TextField`
- [x] 3.2 On mount and on `currentFen` prop change, call `electronAPI.notesGet(fen)` and populate the textarea
- [x] 3.3 On textarea change, debounce 500 ms then call `electronAPI.notesSet(fen, text)`

## 4. App.tsx — State and Mode Gate

- [x] 4.1 Add `advancedAnalysisMode` boolean state (`useState<boolean>(false)`) to `App.tsx`
- [x] 4.2 Add `deepAnalysisResults` state (`useState<Record<number, DeepLineAnalysis | null>>({})`) to track per-line deep results
- [x] 4.3 Add `deepAnalysisLoading` boolean state for the LLM deep-pass in progress
- [x] 4.4 Update the analysis button: change tooltip from "Start Analysis" to "Advanced Analysis"; update aria-label; toggle `advancedAnalysisMode` on click; hide button when `gameMode` is truthy
- [x] 4.5 After `runAnalysis` completes and `advancedAnalysisMode` is `true`, call `electronAPI.deepAnalyzeLines({ fen, lines })`, set `deepAnalysisLoading` while waiting, populate `deepAnalysisResults` when done
- [x] 4.6 Clear `deepAnalysisResults` and `deepAnalysisLoading` when `advancedAnalysisMode` is toggled off or the board FEN changes to a new position (user makes a move during advanced mode)

## 5. App.tsx — Save / Load Buttons

- [x] 5.1 Render Save Analysis icon button (SaveIcon, tooltip "Save this analysis") in the analysis toolbar row; visible only when `advancedAnalysisMode` is `true`; disabled while `deepAnalysisLoading` is `true`
- [x] 5.2 Save click handler: call `electronAPI.saveAnalysisPgn({ pgn: chess.pgn(), notes: currentNotesMap })`; on success show Snackbar "Analysis saved to: <path>" (severity "success"); on error show Snackbar with error message (severity "error")
- [x] 5.3 Render Load Analysis icon button (FolderOpenIcon, tooltip "Load saved analysis") in the same toolbar row; always visible when `gameMode` is falsy
- [x] 5.4 Load click handler: call `electronAPI.loadAnalysisPgn()`; on `ok: true` apply the PGN to chess.js, set `currentFen` to the final position, merge returned notes into `currentNotesMap`; on cancelled or error handle gracefully with Snackbar

## 6. Inline Analysis Lines — Deep Fields Display

- [x] 6.1 Pass `deepAnalysisResults` and `deepAnalysisLoading` as props to the inline analysis lines component
- [x] 6.2 When `advancedAnalysisMode` is `true` and a line's deep result is loading, render a MUI skeleton beneath the SAN text for that line
- [x] 6.3 When `advancedAnalysisMode` is `true` and a line's `DeepLineAnalysis` is available, render seven labelled sections (Strategy, Pros & Cons, Counter-attack, Sacrifice, Novelty, Endgame chances, Alternatives) beneath the SAN text
- [x] 6.4 When `advancedAnalysisMode` is `false`, render lines with SAN only (no seven-dimension fields), matching existing behaviour

## 7. Position Notes Integration in App.tsx

- [x] 7.1 Add `currentNotesMap` state (`useState<Record<string, string>>({})`) to App.tsx for the in-memory notes store
- [x] 7.2 Render `<PositionNotesPanel>` to the right of the chat area when `advancedAnalysisMode` is `true`, passing `currentFen`, `electronAPI`, and a callback to update `currentNotesMap`
- [x] 7.3 When `analysis:load-pgn` returns notes, merge them into `currentNotesMap` with `setCurrentNotesMap(prev => ({ ...prev, ...loadedNotes }))`

## 8. README Documentation

- [x] 8.1 Add a "For Advanced Players — Advanced Analysis" section to `README.md` describing: how to activate the mode, the seven analysis dimensions, position notes behaviour, and the save/load PGN workflow
