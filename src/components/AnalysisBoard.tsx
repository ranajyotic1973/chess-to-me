import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Chess } from "chess.js";
import type { AnalysisBoardProps } from "../types";

const detectChessboardConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as any).Chessboard || (window as any).ChessBoard || null;
};

export default function AnalysisBoard({
  currentFen,
  setCurrentFen,
  runAnalysis,
  setStatusMessage,
  onBoardMove,
  onMoveAttempt,
  size,
  onStartAnalysis,
  onStopAnalysis,
  isAnalysisRunning = false,
  puzzleMode = false,
  onReset,
  onChessInstanceReady,
  playedMoves = []
}: AnalysisBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const chess = useRef<Chess>(new Chess());
  const chessExposedRef = useRef(false);
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());

  // Expose chess instance to parent only once
  useEffect(() => {
    if (!chessExposedRef.current && onChessInstanceReady) {
      onChessInstanceReady(chess.current);
      chessExposedRef.current = true;
    }
  }, []);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const dimension =
    typeof size?.width === "number" && typeof size?.height === "number"
      ? Math.min(size.width, size.height)
      : 420;

  useEffect(() => {
    let canceled = false;
    let attempts = 0;
    if (ctor) {
      return undefined;
    }
    const interval = setInterval(() => {
      if (canceled) return;
      attempts += 1;
      const resolved = detectChessboardConstructor();
      if (resolved) {
        setCtor(resolved);
        clearInterval(interval);
        return;
      }
      if (attempts >= 10) {
        setStatusMessage("ChessboardJS failed to load.");
        clearInterval(interval);
      }
    }, 200);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [ctor, setStatusMessage]);

  useEffect(() => {
    if (!ctor || !boardRef.current) {
      return undefined;
    }
    const pieceThemePath = "chesspieces/wikipedia/{piece}.png";
    boardInstance.current?.destroy();
    // Don't reset chess.current here - the second useEffect handles loading the FEN
    boardInstance.current = ctor(boardRef.current, {
      draggable: !puzzleMode,
      pieceTheme: pieceThemePath,
      position: currentFen,
      onSquareClick: (square: string) => {
        // Toggle selection: clicking same square deselects, clicking different piece selects new one
        setSelectedSquare((prev) => (prev === square ? null : square));
      },
      onDragStart: (source: string, piece: string) => {
        // Clear selection when starting drag
        setSelectedSquare(null);
        // Piece names: 'wP', 'wR', … for white; 'bP', 'bR', … for black.
        // Returning false prevents the piece lifting at all (better UX than snap-back on drop).
        const turn = chess.current.turn(); // 'w' | 'b'
        if (turn === 'w' && piece.startsWith('b')) return false;
        if (turn === 'b' && piece.startsWith('w')) return false;
        return true;
      },
      onDrop: (source: string, target: string) => {
        const move = chess.current.move({ from: source, to: target, promotion: "q" });
        if (!move) {
          // Illegal move: snap piece back to original square
          return "snapback";
        }
        // Legal move: clear selection and update position
        setSelectedSquare(null);
        const nextFen = chess.current.fen();
        setCurrentFen(nextFen);
        if (isAnalysisRunning) {
          runAnalysis(nextFen);
        }
        if (typeof onMoveAttempt === "function") {
          onMoveAttempt(source, target, nextFen);
        }
        if (typeof onBoardMove === "function") {
          const moves = chess.current.history({ verbose: true }).map((m: any) => `${m.from}${m.to}`) as string[];
          onBoardMove(nextFen, moves);
        }
        return undefined;
      }
    });
    return () => {
      boardInstance.current?.destroy();
      boardInstance.current = null;
    };
  }, [ctor, currentFen, onBoardMove, setCurrentFen, isAnalysisRunning, runAnalysis, puzzleMode]);

  useEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    boardInstance.current.resize();
    boardInstance.current.position(currentFen, true);
  }, [currentFen, dimension]);

  useEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    // Clear selection when position changes
    setSelectedSquare(null);
    if (currentFen === "start") {
      chess.current.reset();
      boardInstance.current.position("start");
      return;
    }
    const fenParts = String(currentFen || "").trim().split(/\s+/);
    if (fenParts.length !== 6) {
      setStatusMessage("Invalid FEN stored: must contain six fields.");
      return;
    }
    // Load FEN into chess.current to keep it in sync with the board display.
    // currentFen already represents the full position after all moves have been applied,
    // so we don't replay playedMoves (that would double-apply them).
    // playedMoves is just passed to know the move history, not to replay on the board.
    try {
      chess.current.load(currentFen);
      boardInstance.current.position(currentFen);
    } catch (err) {
      setStatusMessage(`Invalid FEN stored: ${err instanceof Error ? err.message : "unable to load"}`);
    }
  }, [currentFen, setStatusMessage]);

  // Update square highlighting when selection changes
  useEffect(() => {
    if (!boardRef.current) return;

    // Remove highlight from all squares
    boardRef.current.querySelectorAll(".square-highlight").forEach((sq) => {
      sq.classList.remove("square-highlight");
    });

    // Add highlight to selected square
    if (selectedSquare) {
      const squareEl = boardRef.current.querySelector(`.square-${selectedSquare}`);
      if (squareEl) {
        squareEl.classList.add("square-highlight");
      }
    }
  }, [selectedSquare]);

  return (
    <>
      <Box
        ref={boardRef}
        data-testid="puzzle-board"
        sx={{
          width: dimension,
          height: dimension,
          maxWidth: "100%"
        }}
      />
    </>
  );
}
