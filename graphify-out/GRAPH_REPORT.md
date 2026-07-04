# Graph Report - D:\Projects\chess-to-me  (2026-07-03)

## Corpus Check
- Large corpus: 589 files · ~1,350,599 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 840 nodes · 1410 edges · 57 communities (40 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.66)
- Token cost: 58,636 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Electron API Surface|Electron API Surface]]
- [[_COMMUNITY_Renderer Engine Wrappers|Renderer Engine Wrappers]]
- [[_COMMUNITY_Preload Bridge & Eval Bar|Preload Bridge & Eval Bar]]
- [[_COMMUNITY_LLM Agent Prompts|LLM Agent Prompts]]
- [[_COMMUNITY_Shared Type Definitions|Shared Type Definitions]]
- [[_COMMUNITY_Electron API Typings|Electron API Typings]]
- [[_COMMUNITY_Settings Store|Settings Store]]
- [[_COMMUNITY_Redux Selectors|Redux Selectors]]
- [[_COMMUNITY_ECO Opening Lookup|ECO Opening Lookup]]
- [[_COMMUNITY_App Root Component|App Root Component]]
- [[_COMMUNITY_Status Bar UI|Status Bar UI]]
- [[_COMMUNITY_Process Manager|Process Manager]]
- [[_COMMUNITY_Endgame & Middlegame Agents|Endgame & Middlegame Agents]]
- [[_COMMUNITY_Analysis Helpers|Analysis Helpers]]
- [[_COMMUNITY_Base Chess Engine|Base Chess Engine]]
- [[_COMMUNITY_Analysis Redux Slice|Analysis Redux Slice]]
- [[_COMMUNITY_ProcessManager Reference Copy|ProcessManager Reference Copy]]
- [[_COMMUNITY_Board Redux Slice|Board Redux Slice]]
- [[_COMMUNITY_Chess Line Parser|Chess Line Parser]]
- [[_COMMUNITY_Game Memory & PGN Export|Game Memory & PGN Export]]
- [[_COMMUNITY_Engine Architecture Concepts|Engine Architecture Concepts]]
- [[_COMMUNITY_Games Database|Games Database]]
- [[_COMMUNITY_Games Import Pipeline|Games Import Pipeline]]
- [[_COMMUNITY_Engine Interface & Factory|Engine Interface & Factory]]
- [[_COMMUNITY_Puzzle Database|Puzzle Database]]
- [[_COMMUNITY_Redux Store & Middleware|Redux Store & Middleware]]
- [[_COMMUNITY_Puzzle Downloader|Puzzle Downloader]]
- [[_COMMUNITY_File Logger|File Logger]]
- [[_COMMUNITY_Conversation Memory|Conversation Memory]]
- [[_COMMUNITY_Puzzle Utilities|Puzzle Utilities]]
- [[_COMMUNITY_Board State Manager|Board State Manager]]
- [[_COMMUNITY_LC0 Engine|LC0 Engine]]
- [[_COMMUNITY_Engine Discovery|Engine Discovery]]
- [[_COMMUNITY_Engine Type Contracts|Engine Type Contracts]]
- [[_COMMUNITY_Engine Factory & Detection|Engine Factory & Detection]]
- [[_COMMUNITY_Puzzle Points|Puzzle Points]]
- [[_COMMUNITY_Renderer Bootstrap & Theme|Renderer Bootstrap & Theme]]
- [[_COMMUNITY_Chess Notation Parser|Chess Notation Parser]]
- [[_COMMUNITY_OTB Game Import|OTB Game Import]]
- [[_COMMUNITY_Board Position Editor|Board Position Editor]]
- [[_COMMUNITY_LLM Response Parser|LLM Response Parser]]
- [[_COMMUNITY_Stockfish Engine|Stockfish Engine]]
- [[_COMMUNITY_SAN Formatting|SAN Formatting]]
- [[_COMMUNITY_Chess LLM Tools|Chess LLM Tools]]
- [[_COMMUNITY_Move Sequence Hashing|Move Sequence Hashing]]
- [[_COMMUNITY_Refactoring Documentation|Refactoring Documentation]]
- [[_COMMUNITY_Question Classifier Tests|Question Classifier Tests]]
- [[_COMMUNITY_Downloader Test Mocks|Downloader Test Mocks]]
- [[_COMMUNITY_Analysis Board Component|Analysis Board Component]]
- [[_COMMUNITY_UI Redux Slice|UI Redux Slice]]
- [[_COMMUNITY_Puzzle Points Tests|Puzzle Points Tests]]
- [[_COMMUNITY_Move Warning Dialog|Move Warning Dialog]]
- [[_COMMUNITY_Position Notes Panel|Position Notes Panel]]
- [[_COMMUNITY_Window Type Augmentation|Window Type Augmentation]]
- [[_COMMUNITY_Parser Refactor Example Doc|Parser Refactor Example Doc]]

## God Nodes (most connected - your core abstractions)
1. `ElectronAPI` - 70 edges
2. `ElectronAPI` - 37 edges
3. `registerIpcHandlers()` - 35 edges
4. `BaseChessEngine` - 24 edges
5. `ProcessManager` - 24 edges
6. `ProcessManager` - 19 edges
7. `IChessEngine` - 19 edges
8. `IChessEngine` - 18 edges
9. `LC0Engine` - 13 edges
10. `AnalysisEntry` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AnalysisCache` --references--> `AnalysisLine`  [EXTRACTED]
  electron/main.ts → src/types/index.ts
- `App()` --indirect_call--> `loadConversationHistory()`  [INFERRED]
  src/App.tsx → src/utils/conversationMemory.ts
- `PositionNotesPanelProps` --references--> `ElectronAPI`  [EXTRACTED]
  src/components/PositionNotesPanel.tsx → src/types/index.ts
- `Window` --references--> `ElectronAPI`  [EXTRACTED]
  src/electron-api.d.ts → src/types/index.ts
- `EngineRunner (legacy)` --semantically_similar_to--> `BaseChessEngine`  [INFERRED] [semantically similar]
  electron/REFACTOR_ARCHITECTURE.md → electron/ARCHITECTURE_FINAL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Engine Abstraction Architecture (interface + base + concretes + factory)** — electron_architecture_summary_ichessengine, electron_architecture_final_basechessengine, electron_architecture_summary_stockfishengine, electron_architecture_summary_lc0engine, electron_architecture_summary_enginefactory [EXTRACTED 1.00]
- **Engine Analysis Call Chain (IPC -> ProcessManager -> engine -> parser)** — electron_integration_guide_processmanager, electron_architecture_summary_ichessengine, electron_architecture_final_basechessengine, electron_refactor_example_chesslineparser [EXTRACTED 1.00]
- **EngineRunner-to-New-Architecture Migration** — electron_refactor_architecture_enginerunner, electron_integration_guide_processmanager, electron_architecture_summary_enginefactory, electron_refactoring_summary_integration_gap [EXTRACTED 1.00]

## Communities (57 total, 17 thin omitted)

### Community 1 - "Renderer Engine Wrappers"
Cohesion: 0.07
Nodes (10): AnalysisResult, BoardAnalysisResult, IChessEngine, ConcreteEngine, IncompleteEngine, EngineRouter, getAPI(), LC0Engine (+2 more)

### Community 2 - "Preload Bridge & Eval Bar"
Cohesion: 0.05
Nodes (41): EvalBar(), EvalBarProps, getInitials(), ProfileIcon(), ProfileIconProps, getApiKeyMask(), getEnginePath(), PROVIDER_DEFAULT_MODELS (+33 more)

### Community 3 - "LLM Agent Prompts"
Cohesion: 0.07
Nodes (36): analysisAgentSystemPrompt(), buildIncorrectAnswerPrompt(), buildPuzzlePresentationPrompt(), buildThemeDescription(), CLASSIFIER_RESPONSE_FORMAT, ENDGAME_RESPONSE_FORMAT, explainLinesSystemPrompt(), GAME_SEARCH_PARAMS_FORMAT (+28 more)

### Community 4 - "Shared Type Definitions"
Cohesion: 0.05
Nodes (42): AgentProgressEvent, AnalysisBoardProps, AnalysisEntry, AnalysisLine, AnalysisResult, AppSettings, BoardAnalysisResult, ChatPanelProps (+34 more)

### Community 6 - "Settings Store"
Cohesion: 0.10
Nodes (17): DEFAULTS, getSettingsFile(), initializePaths(), loadSettings(), saveSettings(), Settings, SettingsStore, ChatPanel() (+9 more)

### Community 7 - "Redux Selectors"
Cohesion: 0.15
Nodes (25): selectAdvancedAnalysisMode(), selectAnalysisDepth(), selectAnalysisEntries(), selectAnalysisLines(), selectAnalysisLoading(), selectAnalysisState(), selectAnalysisStatus(), selectBoardState() (+17 more)

### Community 8 - "ECO Opening Lookup"
Cohesion: 0.12
Nodes (22): buildPositionBook(), defaultEcoDataDir(), ECO_DATA_FILES, EcoMatch, findOpening(), initEcoLookup(), isEcoAvailable(), isValidOpeningPosition() (+14 more)

### Community 9 - "App Root Component"
Cohesion: 0.11
Nodes (13): App(), DEFAULT_FORM, determinePreferredModel(), GamePlayerInfo, normalizeModelList(), normalizeModelName(), VALID_PROVIDERS, NotesConfirmDialog() (+5 more)

### Community 10 - "Status Bar UI"
Cohesion: 0.13
Nodes (16): AppStatusBar(), AppStatusBarProps, BgSlot, DbCounts, fmtCount(), MODE_COLORS, MODE_LABELS, ResponseType (+8 more)

### Community 12 - "Endgame & Middlegame Agents"
Cohesion: 0.13
Nodes (17): EndgameAgentResponse, handleEndgameRequest(), LlmCaller, parseEndgameResponse(), mockRunLlm, VALID_ENDGAME_JSON, validateFen(), validateUciMoves() (+9 more)

### Community 13 - "Analysis Helpers"
Cohesion: 0.18
Nodes (16): BLACK_GLYPHS, cleanNoise(), colorNames, deriveFenSequence(), describeMovesForLlm(), formatSanLine(), formatUciLine(), loadBoard() (+8 more)

### Community 15 - "Analysis Redux Slice"
Cohesion: 0.19
Nodes (16): AnalysisCache, analysisSlice, AnalysisState, DeepAnalysisResult, initialState, analyzePosition, AnalyzePositionPayload, AnalyzeResponse (+8 more)

### Community 17 - "Board Redux Slice"
Cohesion: 0.17
Nodes (9): boardSlice, BoardState, initialState, handleBoardMove, HandleBoardMovePayload, MoveMatchResult, selectEngineLine, SelectLinePayload (+1 more)

### Community 18 - "Chess Line Parser"
Cohesion: 0.19
Nodes (4): AnalysisLine, ChessLineParser, ParsedInfoLine, ParsedScore

### Community 19 - "Game Memory & PGN Export"
Cohesion: 0.25
Nodes (12): GameMemoryEntry, addGameToMemory(), applyAnnotationsToPgn(), clearGameMemory(), deleteGameFromMemory(), exportGameAsPgn(), formatAnnotationSymbol(), loadGameMemory() (+4 more)

### Community 20 - "Engine Architecture Concepts"
Cohesion: 0.28
Nodes (13): BaseChessEngine, Template Method Pattern, UCI Protocol Handling, Dependency Injection, EngineFactory, IChessEngine, LC0Engine, StockfishEngine (+5 more)

### Community 21 - "Games Database"
Cohesion: 0.21
Nodes (9): buildExtraConditions(), getGamesDbStats(), importPgnFile(), importPgnText(), ParsedGame, parsePgn(), searchGames(), GameRow (+1 more)

### Community 22 - "Games Import Pipeline"
Cohesion: 0.23
Nodes (12): extract7z(), findPgnFiles(), initGamesDb(), rebuildFts(), setGamesSource(), checkGamesUpdatePrompt(), doImportGamesFile(), getBundledGamesDbPath() (+4 more)

### Community 24 - "Puzzle Database"
Cohesion: 0.27
Nodes (11): registerIpcHandlers(), extractAndStoreThemes(), getPuzzleDbStats(), hasPuzzles(), importPuzzlesFromCsv(), initPuzzleDb(), normalizeThemeKeyword(), parseCSVLine() (+3 more)

### Community 25 - "Redux Store & Middleware"
Cohesion: 0.21
Nodes (8): autoDismissStatusMiddleware(), debugMiddleware(), engineSlice, EngineState, EngineStatus, initialState, AppDispatch, RootState

### Community 26 - "Puzzle Downloader"
Cohesion: 0.33
Nodes (9): backoffMs(), checkPuzzleUpdate(), downloadParallel(), downloadPuzzleCsv(), downloadRange(), downloadRangeOnce(), downloadSingle(), downloadSingleOnce() (+1 more)

### Community 27 - "File Logger"
Cohesion: 0.25
Nodes (10): cleanupOldLogs(), closeLogger(), flushLogs(), formatLogEntry(), getLogFilePath(), logBuffer, logToFile(), scheduleFlush() (+2 more)

### Community 28 - "Conversation Memory"
Cohesion: 0.36
Nodes (9): ConversationMessage, addToConversationHistory(), clearConversationHistory(), formatConversationForContext(), getConversationCount(), getElectronAPI(), loadConversationHistory(), saveConversationHistory() (+1 more)

### Community 29 - "Puzzle Utilities"
Cohesion: 0.38
Nodes (8): canNavigateForward(), comparePuzzleAttempt(), isBoardDraggingDisabled(), isSingleLineNumber(), looksLikeMoveSequence(), makeExplanationCacheKey(), normalizeSolutionMove(), shouldSkipKeyboardNavigation()

### Community 32 - "Engine Discovery"
Cohesion: 0.44
Nodes (7): EngineInfo, detectEngine(), discoverEngines(), getAPI(), getAvailableEngines(), getDefaultEngine(), validateEnginePath()

### Community 33 - "Engine Type Contracts"
Cohesion: 0.50
Nodes (4): AnalysisParams, AnalysisResult, EngineCapability, GPUBackend

### Community 34 - "Engine Factory & Detection"
Cohesion: 0.39
Nodes (3): EngineDetectionResult, EngineFactory, LogEntry

### Community 35 - "Puzzle Points"
Cohesion: 0.39
Nodes (7): cache, difficultyDelta(), getPoints(), loadPoints(), pointsFilePath(), recordSolve(), savePoints()

### Community 36 - "Renderer Bootstrap & Theme"
Cohesion: 0.32
Nodes (6): hideSplashWhenReady(), logRenderer(), root, startTime, store, theme

### Community 37 - "Chess Notation Parser"
Cohesion: 0.39
Nodes (6): looksLikeMoveAttempt(), parseChessNotation(), parsePuzzlePlayerMoves(), FULL_SOLUTION, PLAYER_UCI, uciSequenceToSan()

### Community 38 - "OTB Game Import"
Cohesion: 0.62
Nodes (5): computeOverallPercent(), getOtbTrackingFilePath(), readOtbTracking(), scanOtbFiles(), writeOtbTracking()

### Community 39 - "Board Position Editor"
Cohesion: 0.29
Nodes (3): BoardPositionEditorProps, PIECE_SYMBOLS, STARTING_POSITION

### Community 40 - "LLM Response Parser"
Cohesion: 0.48
Nodes (5): LLMResponse, formatConversationHistory(), normalizeResponseType(), parseLLMResponse(), validateLLMResponse()

### Community 42 - "SAN Formatting"
Cohesion: 0.47
Nodes (4): BLACK_GLYPHS, sanLineWithGlyphs(), sanWithGlyph(), WHITE_GLYPHS

### Community 43 - "Chess LLM Tools"
Cohesion: 0.53
Nodes (4): CHESS_TOOLS_SCHEMA, ChessToolCall, executeChessTool(), formatToolsForPrompt()

### Community 44 - "Move Sequence Hashing"
Cohesion: 0.67
Nodes (4): convertUCIToMoves(), createLineHashMap(), createMoveSequenceHash(), findMatchingLine()

### Community 45 - "Refactoring Documentation"
Cohesion: 0.40
Nodes (5): ARCHITECTURE_FINAL.md - Final Architecture (Template Method Pattern), ARCHITECTURE_SUMMARY.md - Engine Architecture Refactoring Package, INTEGRATION_GUIDE.md - Using New Engine Architecture in main.ts, REFACTOR_ARCHITECTURE.md - Chess Engine Refactoring Architecture, REFACTORING_SUMMARY.md - Why New Code Isn't Used Yet

### Community 49 - "UI Redux Slice"
Cohesion: 0.50
Nodes (3): initialState, uiSlice, UIState

## Knowledge Gaps
- **155 isolated node(s):** `LogEntry`, `TRAINING_MOVE_SCHEMA`, `THEME_LABELS`, `openingTrainingSignals`, `endgameTrainingSignals` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnalysisLine` connect `Analysis Redux Slice` to `Preload Bridge & Eval Bar`, `LLM Agent Prompts`, `App Root Component`, `Move Sequence Hashing`, `Analysis Helpers`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `ElectronAPI` connect `Electron API Surface` to `Preload Bridge & Eval Bar`, `Position Notes Panel`, `Window Type Augmentation`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `AnalysisResult` connect `Renderer Engine Wrappers` to `Preload Bridge & Eval Bar`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `LogEntry`, `TRAINING_MOVE_SCHEMA`, `THEME_LABELS` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Electron API Surface` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `Renderer Engine Wrappers` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Preload Bridge & Eval Bar` be split into smaller, more focused modules?**
  _Cohesion score 0.054078014184397165 - nodes in this community are weakly interconnected._