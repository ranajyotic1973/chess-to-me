import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { RestartAlt } from "@mui/icons-material";
import { Chess } from "chess.js";
import type { AnalysisBoardProps } from "../types";
import { CHESS_STARTING_POSITION_KEY } from "../constants/chess";

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
  onReset
}: AnalysisBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const chess = useRef<Chess>(new Chess());
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());
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
          onBoardMove(nextFen);
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
    if (currentFen === CHESS_STARTING_POSITION_KEY) {
      chess.current.reset();
      boardInstance.current.position("start");
      return;
    }
    const fenParts = String(currentFen || "").trim().split(/\s+/);
    if (fenParts.length !== 6) {
      setStatusMessage("Invalid FEN stored: must contain six fields.");
      return;
    }
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
      <Tooltip title="Reset board, clear chat, and return to analysis mode">
        <IconButton
          onClick={onReset}
          size="medium"
          sx={{
            color: "primary.main",
            mt: 0.5,
            "&:hover": {
              backgroundColor: "action.hover"
            }
          }}
        >
          <RestartAlt />
        </IconButton>
      </Tooltip>
    </>
  );
}
