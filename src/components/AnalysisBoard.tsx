import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
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
  isAnalysisRunning = false
}: AnalysisBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const chess = useRef<Chess>(new Chess());
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());
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
    chess.current.reset();
    boardInstance.current = ctor(boardRef.current, {
      draggable: true,
      pieceTheme: pieceThemePath,
      position: currentFen,
      onDrop: (source: string, target: string) => {
        const move = chess.current.move({ from: source, to: target, promotion: "q" });
        if (!move) {
          return "snapback";
        }
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
  }, [ctor, currentFen, onBoardMove, setCurrentFen, isAnalysisRunning, runAnalysis]);

  useEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    boardInstance.current.resize();
    boardInstance.current.position(currentFen, false);
  }, [currentFen, dimension]);

  useEffect(() => {
    if (!boardInstance.current) {
      return;
    }
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
    try {
      chess.current.load(currentFen);
      boardInstance.current.position(currentFen);
    } catch (err) {
      setStatusMessage(`Invalid FEN stored: ${err instanceof Error ? err.message : "unable to load"}`);
    }
  }, [currentFen, setStatusMessage]);

  return (
    <Box
      sx={{
        width: dimension,
        maxWidth: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <Box
        ref={boardRef}
        sx={{
          width: dimension,
          height: dimension,
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: 12
        }}
      />
    </Box>
  );
}
