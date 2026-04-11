
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

const START_FEN = "rn1qkbnr/pppb1ppp/3pp3/8/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5";
const PIECE_FIGURINES = {
  K: "\u2654",
  Q: "\u2655",
  R: "\u2656",
  B: "\u2657",
  N: "\u2658",
  P: ""
};

function normalizeFenCore(fen) {
  if (!fen) return "";
  return fen.split(" ").slice(0, 4).join(" ");
}

function scoreLabel(score) {
  if (!score) return "N/A";
  if (score.type === "mate") return `Mate ${score.value > 0 ? "+" : ""}${score.value}`;
  return `${(score.value / 100).toFixed(2)}`;
}

function sanToFigurine(san) {
  if (!san) return "";
  if (san.startsWith("O-O")) return san;
  const first = san[0];
  if (!PIECE_FIGURINES[first]) return san;
  return `${PIECE_FIGURINES[first]}${san.slice(1)}`;
}

function pvToDisplay(baseFen, pvText) {
  const board = new Chess(baseFen);
  const uciMoves = (pvText || "").split(/\s+/).filter(Boolean);
  const sanMoves = [];
  for (const uci of uciMoves) {
    const move = board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : "q"
    });
    if (!move) break;
    sanMoves.push(move.san);
  }
  return { uciMoves, sanMoves };
}

function buildPositionFromUciLine(baseFen, line, halfMoveIndex) {
  const board = new Chess(baseFen);
  const moves = line?.uciMoves || [];
  const count = Math.max(0, Math.min(halfMoveIndex, moves.length));
  for (let i = 0; i < count; i += 1) {
    const uci = moves[i];
    board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : "q"
    });
  }
  return board;
}

function parseHeaders(gameText) {
  const headers = {};
  const tagRegex = /^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/gm;
  let m = tagRegex.exec(gameText);
  while (m) {
    headers[m[1]] = m[2];
    m = tagRegex.exec(gameText);
  }
  return headers;
}

function parsePgnDatabase(text) {
  const chunks = text
    .split(/\r?\n(?=\[Event\s")/g)
    .map((v) => v.trim())
    .filter(Boolean);

  const games = [];
  for (const chunk of chunks) {
    const headers = parseHeaders(chunk);
    const startFen = headers.FEN || "startpos";
    const board = startFen === "startpos" ? new Chess() : new Chess(startFen);
    try {
      board.loadPgn(chunk, { strict: false });
      const sanMoves = board.history();
      games.push({
        headers,
        sanMoves,
        pgn: chunk,
        startFen: startFen === "startpos" ? null : startFen
      });
    } catch {
      // Skip malformed games.
    }
  }
  return games;
}

function buildPositionFromSanGame(game, halfMoveIndex) {
  const board = game?.startFen ? new Chess(game.startFen) : new Chess();
  const sanMoves = game?.sanMoves || [];
  const count = Math.max(0, Math.min(halfMoveIndex, sanMoves.length));
  for (let i = 0; i < count; i += 1) {
    const move = sanMoves[i];
    if (!move) break;
    board.move(move, { strict: false });
  }
  return board;
}

function gameContainsFen(game, targetFen) {
  const target = normalizeFenCore(targetFen);
  if (!game || !target) return false;

  const board = game.startFen ? new Chess(game.startFen) : new Chess();
  if (normalizeFenCore(board.fen()) === target) {
    return true;
  }

  for (const san of game.sanMoves || []) {
    const move = board.move(san, { strict: false });
    if (!move) break;
    if (normalizeFenCore(board.fen()) === target) {
      return true;
    }
  }
  return false;
}

export default function App() {
  const analysisBoardRef = useRef(null);
  const referenceBoardRef = useRef(null);
  const analysisBoardInstance = useRef(null);
  const referenceBoardInstance = useRef(null);

  const [activeTab, setActiveTab] = useState("analysis");
  const [systemStatus, setSystemStatus] = useState({
    loading: true,
    platform: "win32",
    ollamaRunning: false,
    qwen3Installed: false,
    stockfishFound: false,
    stockfishPath: ""
  });

  const [baseGame, setBaseGame] = useState(() => new Chess(START_FEN));
  const baseGameRef = useRef(baseGame);
  const [fenInput, setFenInput] = useState(START_FEN);
  const [enginePath, setEnginePath] = useState("");
  const [manualPath, setManualPath] = useState("");
  const [status, setStatus] = useState("Checking Stockfish...");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const [selectedLineRank, setSelectedLineRank] = useState(1);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [lineItems, setLineItems] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [latestLines, setLatestLines] = useState([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);

  const [settings, setSettings] = useState({
    analysisDepth: 16,
    explainLanguage: "English",
    ollamaModel: "qwen3",
    ollamaBaseUrl: "http://localhost:11434/api",
    referenceApiKey: "",
    referenceDbUsers: "MagnusCarlsen,Hikaru,Nepo,Dubov,AlirezaFirouzja,AnishGiri"
  });

  const [referenceGames, setReferenceGames] = useState([]);
  const [referencePath, setReferencePath] = useState("");
  const [selectedReferenceGameIndex, setSelectedReferenceGameIndex] = useState(0);
  const [selectedReferenceMoveIndex, setSelectedReferenceMoveIndex] = useState(0);
  const [fetchMinElo, setFetchMinElo] = useState(2600);
  const [fetchMaxPerUser, setFetchMaxPerUser] = useState(60);
  const [fetchingRef, setFetchingRef] = useState(false);
  const [referenceUsers, setReferenceUsers] = useState(settings.referenceDbUsers);
  const [referenceApiKey, setReferenceApiKey] = useState(settings.referenceApiKey);

  const selectedLine = useMemo(
    () => lineItems.find((l) => l.rank === selectedLineRank) || lineItems[0] || null,
    [lineItems, selectedLineRank]
  );

  const analysisBoardFen = useMemo(() => {
    if (!selectedLine) return baseGame.fen();
    return buildPositionFromUciLine(baseGame.fen(), selectedLine, selectedMoveIndex).fen();
  }, [baseGame, selectedLine, selectedMoveIndex]);

  useEffect(() => {
    baseGameRef.current = baseGame;
  }, [baseGame]);

  const matchingReferenceEntries = useMemo(() => {
    return referenceGames
      .map((game, index) => ({ game, index }))
      .filter((entry) => gameContainsFen(entry.game, analysisBoardFen));
  }, [referenceGames, analysisBoardFen]);

  const selectedReferenceGame = useMemo(
    () => referenceGames[selectedReferenceGameIndex] || null,
    [referenceGames, selectedReferenceGameIndex]
  );

  const referenceBoardFen = useMemo(() => {
    if (!selectedReferenceGame) return new Chess().fen();
    return buildPositionFromSanGame(selectedReferenceGame, selectedReferenceMoveIndex).fen();
  }, [selectedReferenceGame, selectedReferenceMoveIndex]);

  useEffect(() => {
    const stillVisible = matchingReferenceEntries.some((e) => e.index === selectedReferenceGameIndex);
    if (!stillVisible && matchingReferenceEntries.length > 0) {
      setSelectedReferenceGameIndex(matchingReferenceEntries[0].index);
      setSelectedReferenceMoveIndex(0);
    }
  }, [matchingReferenceEntries, selectedReferenceGameIndex]);

  useEffect(() => {
    const initBoards = () => {
      if (!analysisBoardRef.current || typeof window === "undefined" || !window.Chessboard) return;
      analysisBoardInstance.current = window.Chessboard(analysisBoardRef.current, {
        draggable: true,
        position: "start",
        pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        onDrop: async (source, target) => {
          const clone = new Chess(baseGameRef.current.fen());
          const move = clone.move({ from: source, to: target, promotion: "q" });
          if (!move) {
            return "snapback";
          }
          setBaseGame(clone);
          setFenInput(clone.fen());
          analysisBoardInstance.current?.position(clone.fen(), false);
          await analyzePosition(clone.fen(), `Analyze after move ${move.san}`);
          return undefined;
        }
      });

      if (referenceBoardRef.current) {
        referenceBoardInstance.current = window.Chessboard(referenceBoardRef.current, {
          draggable: false,
          position: "start",
          pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png"
        });
      }
    };

    initBoards();
    const handleResize = () => {
      analysisBoardInstance.current?.resize();
      referenceBoardInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      analysisBoardInstance.current?.destroy();
      referenceBoardInstance.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (analysisBoardInstance.current) {
      analysisBoardInstance.current.position(analysisBoardFen, false);
    }
  }, [analysisBoardFen]);

  useEffect(() => {
    if (referenceBoardInstance.current) {
      referenceBoardInstance.current.position(referenceBoardFen, false);
    }
  }, [referenceBoardFen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshEngineStatus();
      try {
        const sys = await window.electronAPI.getSystemStatus();
        if (mounted) {
          setSystemStatus({ ...sys, loading: false });
        }
      } catch {
        if (mounted) {
          setSystemStatus((prev) => ({ ...prev, loading: false }));
        }
      }
      if (!mounted) return;
      const engineReady = await autoDetect();
      if (engineReady) {
        await analyzePosition(baseGame.fen(), "Initial analysis");
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshEngineStatus() {
    const s = await window.electronAPI.getEngineStatus();
    if (s.configured) {
      setEnginePath(s.path);
      setManualPath(s.path);
      setStatus("Stockfish is configured.");
    } else {
      setEnginePath("");
      setStatus("Stockfish not configured.");
    }
    if (s.settings) {
      setSettings(s.settings);
      setReferenceUsers(s.settings.referenceDbUsers || "");
      setReferenceApiKey(s.settings.referenceApiKey || "");
    }
  }

  async function autoDetect() {
    setStatus("Detecting Stockfish...");
    const result = await window.electronAPI.detectStockfish();
    if (result.found) {
      setEnginePath(result.path);
      setManualPath(result.path);
      setStatus("Auto-detected Stockfish.");
      return true;
    }
    setStatus("Auto-detect failed. Please browse or paste executable path.");
    return false;
  }

  async function explainLines(baseFen, preparedLines) {
    const response = await window.electronAPI.explainLines({
      fen: baseFen,
      lines: preparedLines.map((line) => ({ rank: line.rank, score: line.score, pv: line.pv })),
      language: settings.explainLanguage,
      model: settings.ollamaModel,
      baseUrl: settings.ollamaBaseUrl
    });

    if (!response.ok) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Could not generate explanations: ${response.error}`,
          time: Date.now()
        }
      ]);
      return;
    }

    const explanationMap = new Map((response.explanations || []).map((item) => [item.rank, item.text]));
    setLineItems(
      preparedLines.map((line) => ({
        ...line,
        explanation: explanationMap.get(line.rank) || line.explanation || "Explanation unavailable."
      }))
    );

    const aggregated = (response.explanations || [])
      .map((item) => `Line ${item.rank}:\n${item.text}`)
      .join("\n\n");

    if (aggregated) {
      setChatMessages((prev) => [...prev, { role: "assistant", text: aggregated, time: Date.now() }]);
    }
  }

  async function analyzePosition(nextFen, reasonText = "Analyze position") {
    setAnalyzing(true);
    setError("");
    setSelectedMoveIndex(0);
    setChatMessages((prev) => [...prev, { role: "user", text: reasonText, time: Date.now() }]);

    const result = await window.electronAPI.analyzePosition({
      fen: nextFen,
      depth: settings.analysisDepth,
      multiPv: 4
    });

    if (!result.ok) {
      setError(result.error || "Engine analysis failed.");
      setAnalyzing(false);
      return;
    }

    const prepared = (result.analysis?.lines || []).slice(0, 4).map((line) => {
      const parsed = pvToDisplay(nextFen, line.pv);
      return {
        rank: line.rank,
        score: line.score,
        pv: line.pv,
        uciMoves: parsed.uciMoves,
        sanMoves: parsed.sanMoves,
        explanation: "Explaining..."
      };
    });

    setLineItems(prepared);
    setSelectedLineRank(prepared[0]?.rank || 1);
    setSelectedMoveIndex(0);
    setAnalyzing(false);
    setLatestLines(prepared);

    if (prepared.length > 0) {
      await explainLines(nextFen, prepared);
    }
  }

  async function applyFen() {
    try {
      const next = new Chess(fenInput.trim());
      setBaseGame(next);
      setError("");
      analysisBoardInstance.current?.position(next.fen(), false);
      await analyzePosition(next.fen(), "Analyze pasted FEN");
    } catch {
      setError("Invalid FEN. Please paste a valid FEN string.");
    }
  }

  async function browsePath() {
    const result = await window.electronAPI.browseStockfish();
    if (!result.selected) return;
    if (!result.valid) {
      setError("Selected file is not a valid Stockfish UCI executable.");
      return;
    }
    setEnginePath(result.path);
    setManualPath(result.path);
    setStatus("Stockfish path updated.");
    setError("");
    await analyzePosition(baseGame.fen(), "Re-analyze after engine path update");
  }

  async function saveManualPath() {
    const result = await window.electronAPI.setStockfishPath(manualPath.trim());
    if (!result.ok) {
      setError("Could not validate path. Ensure this is the Stockfish executable.");
      return;
    }
    setEnginePath(result.path);
    setStatus("Manual Stockfish path saved.");
    setError("");
    await analyzePosition(baseGame.fen(), "Re-analyze after manual path save");
  }

  async function saveSettings(overrides = null) {
    const payload = overrides || settings;
    const result = await window.electronAPI.updateAppSettings(payload);
    if (!result.ok) {
      setError("Failed to save settings.");
      return null;
    }
    setSettings(result.settings);
    setReferenceUsers(result.settings.referenceDbUsers || "");
    setReferenceApiKey(result.settings.referenceApiKey || "");
    return result.settings;
  }

  async function loadReferencePgnFromText(text, fromPathLabel) {
    const parsedGames = parsePgnDatabase(text);
    if (!parsedGames.length) {
      setError("No valid games found in the PGN file.");
      return false;
    }
    setReferenceGames(parsedGames);
    setReferencePath(fromPathLabel);
    setSelectedReferenceGameIndex(0);
    setSelectedReferenceMoveIndex(0);
    setError("");
    setActiveTab("reference");
    return true;
  }

  async function browseReferencePgn() {
    const picked = await window.electronAPI.pickReferencePgn();
    if (!picked.selected) return;
    const content = await window.electronAPI.readReferencePgn(picked.path);
    if (!content.ok) {
      setError(content.error || "Failed to load PGN file.");
      return;
    }
    await loadReferencePgnFromText(content.content || "", picked.path);
  }

  async function loadBundledReferenceGames() {
    const bundled = await window.electronAPI.readBundledReferencePgn();
    if (!bundled.ok) {
      setError(bundled.error || "Failed to load bundled reference games.");
      return;
    }
    await loadReferencePgnFromText(bundled.content || "", bundled.path || "Bundled sample");
  }

  async function fetchReferenceGamesFromLichess(customUsers, customKey) {
    setFetchingRef(true);
    const usernames = String(customUsers ?? referenceUsers ?? settings.referenceDbUsers ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const result = await window.electronAPI.fetchLichessReferenceGames({
      usernames,
      minElo: fetchMinElo,
      maxPerUser: fetchMaxPerUser,
      apiKey: typeof customKey === "string" ? customKey : referenceApiKey ?? settings.referenceApiKey
    });

    if (!result.ok) {
      setError(result.error || "Failed to fetch games from database.");
      setFetchingRef(false);
      return false;
    }

    const loaded = await loadReferencePgnFromText(result.pgn || "", `${result.source} (${result.count} games)`);
    setFetchingRef(false);
    return loaded;
  }

  async function handleFetchReferenceGames() {
    const users = referenceUsers.trim();
    if (!users) {
      setError("Please enter at least one database username.");
      return;
    }

    const merged = {
      ...settings,
      referenceDbUsers: users,
      referenceApiKey: referenceApiKey.trim()
    };

    const persisted = await saveSettings(merged);
    if (!persisted) {
      return;
    }

    await fetchReferenceGamesFromLichess(users, referenceApiKey.trim());
  }

  function clearReferenceGames() {
    setReferenceGames([]);
    setReferencePath("");
    setSelectedReferenceGameIndex(0);
    setSelectedReferenceMoveIndex(0);
  }

  async function recheckEnvironment() {
    setSystemStatus((prev) => ({ ...prev, loading: true }));
    try {
      const sys = await window.electronAPI.getSystemStatus();
      setSystemStatus({ ...sys, loading: false });
    } catch {
      setSystemStatus((prev) => ({ ...prev, loading: false }));
    }
  }

  function selectLine(rank) {
    setSelectedLineRank(rank);
    setSelectedMoveIndex(0);
  }

  function stepAnalysisBack() {
    setSelectedMoveIndex((v) => Math.max(0, v - 1));
  }

  function stepAnalysisForward() {
    const max = selectedLine?.uciMoves?.length || 0;
    setSelectedMoveIndex((v) => Math.min(max, v + 1));
  }

  function selectReferenceGame(index) {
    setSelectedReferenceGameIndex(index);
    setSelectedReferenceMoveIndex(0);
  }

  function stepReferenceBack() {
    setSelectedReferenceMoveIndex((v) => Math.max(0, v - 1));
  }

  function stepReferenceForward() {
    const max = selectedReferenceGame?.sanMoves?.length || 0;
    setSelectedReferenceMoveIndex((v) => Math.min(max, v + 1));
  }

  async function sendQuestion() {
    const trimmed = questionInput.trim();
    if (!trimmed) return;
    setChatMessages((prev) => [...prev, { role: "user", text: trimmed, time: Date.now() }]);
    setIsSendingQuestion(true);
    const response = await window.electronAPI.askQuestion({
      question: trimmed,
      fen: analysisBoardFen,
      lines: latestLines.map((line) => ({ rank: line.rank, score: line.score, pv: line.pv })),
      language: settings.explainLanguage,
      model: settings.ollamaModel,
      baseUrl: settings.ollamaBaseUrl
    });
    if (!response.ok) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Question failed: ${response.error}`, time: Date.now() }
      ]);
    } else {
      setChatMessages((prev) => [...prev, { role: "assistant", text: response.answer, time: Date.now() }]);
    }
    setIsSendingQuestion(false);
    setQuestionInput("");
  }

  const statusHighlights = [
    { label: "AI engine", value: systemStatus.loading ? "Checking..." : systemStatus.ollamaRunning ? "Detected" : "Not running" },
    { label: "LLM", value: systemStatus.loading ? "Checking..." : systemStatus.qwen3Installed ? "Ready" : "Missing" },
    { label: "Chess Engine", value: systemStatus.loading ? "Checking..." : systemStatus.stockfishFound ? "Detected" : "Not detected" }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Chess To Me</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Chess To Me</h1>
            <p className="text-sm text-slate-500">Tailwind + ChessboardJS analysis studio</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {statusHighlights.map((chip) => (
              <div
                key={chip.label}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm"
              >
                <span className="block text-[0.55rem] text-slate-400">{chip.label}</span>
                <span className="text-sm text-slate-900">{chip.value}</span>
              </div>
            ))}
            <button
              onClick={recheckEnvironment}
              disabled={systemStatus.loading}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400"
            >
              Re-check Environment
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "analysis"
                ? "bg-primary text-white"
                : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab("reference")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "reference"
                ? "bg-primary text-white"
                : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
            }`}
          >
            Reference Games
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {activeTab === "analysis" ? (
            <div className="grid h-full flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(320px,640px)_1fr]">
              <section className="flex flex-col gap-5 overflow-hidden rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="relative flex h-[420px] w-full items-center justify-center rounded-3xl bg-slate-50/80">
                  <div ref={analysisBoardRef} className="h-full w-full" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                    <span>Line {selectedLine?.rank || "-"}</span>
                    <span className="text-slate-400">move {selectedMoveIndex}/{selectedLine?.uciMoves?.length || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={stepAnalysisBack}
                      disabled={selectedMoveIndex <= 0}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={stepAnalysisForward}
                      disabled={selectedMoveIndex >= (selectedLine?.uciMoves?.length || 0)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Forward
                    </button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="fen-input">
                    Paste FEN
                  </label>
                  <textarea
                    id="fen-input"
                    value={fenInput}
                    onChange={(e) => setFenInput(e.target.value)}
                    className="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-primary"
                    placeholder="Paste a FEN string here..."
                  />
                  <button
                    onClick={applyFen}
                    className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    Load FEN Position
                  </button>
                </div>
              </section>

              <div className="flex flex-col gap-5 overflow-hidden">
                <section className="rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Engine Settings</h2>
                  <p className="text-sm text-slate-500">{status}</p>
                  <p className="text-xs text-slate-400">{enginePath || "No engine configured yet."}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={autoDetect}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
                    >
                      Auto Detect
                    </button>
                    <button
                      onClick={browsePath}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
                    >
                      Browse Executable
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <label className="text-sm font-semibold text-slate-600" htmlFor="manual-engine-path">
                      Manual Stockfish path
                    </label>
                    <input
                      id="manual-engine-path"
                      type="text"
                      value={manualPath}
                      onChange={(e) => setManualPath(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                    />
                    <button
                      onClick={saveManualPath}
                      className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                    >
                      Save Engine Path
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <label className="text-sm font-semibold text-slate-600" htmlFor="analysis-depth">
                      Depth (6-30)
                    </label>
                    <input
                      id="analysis-depth"
                      type="number"
                      min="6"
                      max="30"
                      value={settings.analysisDepth}
                      onChange={(e) => setSettings((prev) => ({ ...prev, analysisDepth: Number(e.target.value) || 16 }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                    />
                    <label className="text-sm font-semibold text-slate-600" htmlFor="language">
                      Explanation language
                    </label>
                    <input
                      id="language"
                      type="text"
                      value={settings.explainLanguage}
                      onChange={(e) => setSettings((prev) => ({ ...prev, explainLanguage: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                    />
                    <label className="text-sm font-semibold text-slate-600" htmlFor="ollama-model">
                      Ollama model
                    </label>
                    <input
                      id="ollama-model"
                      type="text"
                      value={settings.ollamaModel}
                      onChange={(e) => setSettings((prev) => ({ ...prev, ollamaModel: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                    />
                    <button
                      onClick={async () => {
                        const saved = await saveSettings();
                        if (saved) {
                          await analyzePosition(baseGame.fen(), "Re-analyze with new settings");
                        }
                      }}
                      className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                      Save Settings + Reanalyze
                    </button>
                  </div>
                </section>

                <section className="flex flex-col gap-3 rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Line Exploration</h2>
                  <div className="flex-1 overflow-y-auto" style={{ maxHeight: "240px" }}>
                    {lineItems.map((line) => (
                      <button
                        key={line.rank}
                        onClick={() => selectLine(line.rank)}
                        className={`mb-3 w-full rounded-2xl border p-4 text-left transition ${
                          selectedLineRank === line.rank ? "border-primary bg-primary/10" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            Line #{line.rank}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">Eval {scoreLabel(line.score)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {line.sanMoves
                            .map((san, idx) => `${idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}${sanToFigurine(san)}`)
                            .join(" ")}
                        </p>
                        <p className="mt-3 text-sm text-slate-700">{line.explanation}</p>
                      </button>
                    ))}
                    {lineItems.length === 0 ? (
                      <p className="text-sm text-slate-400">Analysis results will appear here once Stockfish finishes.</p>
                    ) : null}
                  </div>
                </section>

                <section className="flex flex-col gap-3 rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">Coach Chat</h2>
                    <span className="text-sm text-slate-500">{analyzing ? "Analyzing…" : "Ready"}</span>
                  </div>
                  <div className="flex max-h-[240px] flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex-1 overflow-y-auto">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={`${msg.time}-${idx}`}
                          className={`mb-2 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "assistant" ? "bg-white text-slate-900" : "self-end bg-primary text-white"
                          }`}
                        >
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    className="h-[220px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-primary"
                    placeholder="Ask the coach about the current position"
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={isSendingQuestion}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isSendingQuestion ? "Thinking…" : "Ask Coach"}
                  </button>
                </section>
              </div>
            </div>
          ) : (
            <div className="grid h-full flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(320px,420px)_1fr]">
              <section className="flex flex-col gap-4 rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Reference Games</h2>
                <p className="text-sm text-slate-500">Load curated games that match the current analysis position.</p>
                <label className="text-sm font-semibold text-slate-600" htmlFor="db-users">
                  Player usernames (comma separated)
                </label>
                <input
                  id="db-users"
                  type="text"
                  value={referenceUsers}
                  onChange={(e) => setReferenceUsers(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                  placeholder="MagnusCarlsen,Hikaru,..."
                />
                <label className="text-sm font-semibold text-slate-600" htmlFor="db-key">
                  API key (optional)
                </label>
                <input
                  id="db-key"
                  type="password"
                  value={referenceApiKey}
                  onChange={(e) => setReferenceApiKey(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                  placeholder="Bearer token if required"
                />
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-600" htmlFor="ref-min-elo">
                    Minimum Elo
                  </label>
                  <input
                    id="ref-min-elo"
                    type="number"
                    min="1000"
                    max="3200"
                    value={fetchMinElo}
                    onChange={(e) => setFetchMinElo(Number(e.target.value) || 2600)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                  />
                  <label className="text-sm font-semibold text-slate-600" htmlFor="ref-max">
                    Max games per user
                  </label>
                  <input
                    id="ref-max"
                    type="number"
                    min="1"
                    max="200"
                    value={fetchMaxPerUser}
                    onChange={(e) => setFetchMaxPerUser(Number(e.target.value) || 60)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleFetchReferenceGames}
                    disabled={fetchingRef}
                    className="flex-1 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {fetchingRef ? "Fetching…" : "Fetch from Lichess API"}
                  </button>
                  <button
                    onClick={loadBundledReferenceGames}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Use bundled sample
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={browseReferencePgn}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Open local PGN
                  </button>
                  <button
                    onClick={clearReferenceGames}
                    disabled={!referenceGames.length}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    Clear games
                  </button>
                </div>
                <p className="text-xs text-slate-500">Source: {referencePath || "None"}</p>
                <p className="text-xs text-slate-500">Loaded games: {referenceGames.length}</p>
                <p className="text-xs text-slate-500">Matching position: {matchingReferenceEntries.length}</p>
              </section>

              <section className="flex flex-col gap-4 overflow-hidden rounded-[32px] bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
                <div ref={referenceBoardRef} className="h-full w-full rounded-3xl bg-slate-50/80" />
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Reference board</span>
                  <span>
                    Move {selectedReferenceMoveIndex}/{selectedReferenceGame?.sanMoves?.length || 0}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={stepReferenceBack}
                    disabled={selectedReferenceMoveIndex <= 0}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    onClick={stepReferenceForward}
                    disabled={selectedReferenceMoveIndex >= (selectedReferenceGame?.sanMoves?.length || 0)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    Forward
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-700">
                  {selectedReferenceGame?.sanMoves?.map((san, idx) => (
                    <span
                      key={`ref-${idx}`}
                      className={`mr-2 ${idx < selectedReferenceMoveIndex ? "font-semibold text-slate-900" : "text-slate-500"}`}
                    >
                      {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                      {sanToFigurine(san)}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
