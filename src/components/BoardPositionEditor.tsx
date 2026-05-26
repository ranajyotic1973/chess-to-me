import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Alert
} from "@mui/material";
import { Chess } from "chess.js";
import type { AnalysisBoardProps } from "../types";

interface BoardPositionEditorProps {
  open: boolean;
  onClose: () => void;
  onPositionConfirm: (fen: string) => void;
  initialFen?: string;
}

const PIECE_SYMBOLS = {
  white: [
    { symbol: "♔", name: "King", fen: "K" },
    { symbol: "♕", name: "Queen", fen: "Q" },
    { symbol: "♖", name: "Rook", fen: "R" },
    { symbol: "♗", name: "Bishop", fen: "B" },
    { symbol: "♘", name: "Knight", fen: "N" },
    { symbol: "♙", name: "Pawn", fen: "P" }
  ],
  black: [
    { symbol: "♚", name: "King", fen: "k" },
    { symbol: "♛", name: "Queen", fen: "q" },
    { symbol: "♜", name: "Rook", fen: "r" },
    { symbol: "♝", name: "Bishop", fen: "b" },
    { symbol: "♞", name: "Knight", fen: "n" },
    { symbol: "♟", name: "Pawn", fen: "p" }
  ]
};

export default function BoardPositionEditor({
  open,
  onClose,
  onPositionConfirm,
  initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}: BoardPositionEditorProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const chess = useRef<Chess>(new Chess(initialFen));
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);

  function detectChessboardConstructor() {
    if (typeof window === "undefined") {
      return null;
    }
    return (window as any).Chessboard || (window as any).ChessBoard || null;
  }

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
        clearInterval(interval);
      }
    }, 200);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [ctor]);

  useEffect(() => {
    if (!ctor || !boardRef.current) {
      return undefined;
    }
    const pieceThemePath = "chesspieces/wikipedia/{piece}.png";
    boardInstance.current?.destroy();
    chess.current = new Chess(initialFen);
    boardInstance.current = ctor(boardRef.current, {
      draggable: true,
      pieceTheme: pieceThemePath,
      position: initialFen,
      onDrop: handleBoardDrop
    });
    return () => {
      boardInstance.current?.destroy();
      boardInstance.current = null;
    };
  }, [ctor, initialFen]);

  const handleBoardDrop = (source: string, target: string) => {
    const isValidSquare = /^[a-h][1-8]$/.test(target);

    if (!isValidSquare) {
      // Piece dragged off board - delete it
      chess.current.remove(source);
      updateBoardDisplay();
      return "snapback";
    }

    // Try to move from existing piece on source square
    const move = chess.current.move({ from: source, to: target, promotion: "q" });
    if (!move) {
      return "snapback";
    }

    updateBoardDisplay();
    return undefined;
  };

  const handlePieceDragStart = (e: React.DragEvent<HTMLButtonElement>, piece: string) => {
    setDraggedPiece(piece);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleBoardDropFromList = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const piece = draggedPiece;
    if (!piece) return;

    const boardElement = boardRef.current;
    if (!boardElement) return;

    const rect = boardElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const squareSize = rect.width / 8;
    const col = Math.floor(x / squareSize);
    const row = 7 - Math.floor(y / squareSize);

    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      const file = String.fromCharCode(97 + col);
      const rank = row + 1;
      const square = `${file}${rank}`;

      // Determine piece type and color from FEN character
      const pieceType = piece.toLowerCase();
      const color = piece === piece.toUpperCase() ? "w" : "b";

      chess.current.put({ type: pieceType, color }, square);
      updateBoardDisplay();
    }

    setDraggedPiece(null);
  };

  const updateBoardDisplay = () => {
    if (boardInstance.current) {
      boardInstance.current.position(chess.current.fen(), false);
    }
  };

  const handleClearBoard = () => {
    chess.current.clear();
    updateBoardDisplay();
    setErrorMessage("");
  };

  const handleResetToStart = () => {
    chess.current.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    updateBoardDisplay();
    setErrorMessage("");
  };

  const validatePosition = (): boolean => {
    try {
      const fen = chess.current.fen();
      new Chess(fen);
      return true;
    } catch (err) {
      const message = (err as Error).message || "Invalid position";
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
      return false;
    }
  };

  const handleConfirm = () => {
    if (validatePosition()) {
      onPositionConfirm(chess.current.fen());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Board Setup</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          onDragOver={handleBoardDragOver}
          onDrop={handleBoardDropFromList}
          sx={{
            width: "100%",
            maxWidth: 400,
            mx: "auto",
            mb: 2,
            position: "relative"
          }}
        >
          <Box
            ref={boardRef}
            sx={{
              width: "100%",
              aspectRatio: "1"
            }}
          />
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ animation: "fadeInOut 3s ease-in-out" }}>
            {errorMessage}
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            WHITE PIECES
          </Typography>
          <Stack direction="row" spacing={1}>
            {PIECE_SYMBOLS.white.map((piece) => (
              <Button
                key={piece.fen}
                draggable
                onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
                variant="outlined"
                sx={{
                  p: 1,
                  minWidth: "auto",
                  fontSize: "1.5rem",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" }
                }}
              >
                {piece.symbol}
              </Button>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            BLACK PIECES
          </Typography>
          <Stack direction="row" spacing={1}>
            {PIECE_SYMBOLS.black.map((piece) => (
              <Button
                key={piece.fen}
                draggable
                onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
                variant="outlined"
                sx={{
                  p: 1,
                  minWidth: "auto",
                  fontSize: "1.5rem",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" }
                }}
              >
                {piece.symbol}
              </Button>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleClearBoard} fullWidth>
            Clear Board
          </Button>
          <Button variant="outlined" onClick={handleResetToStart} fullWidth>
            Reset to Start
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">
          OK
        </Button>
      </DialogActions>

      <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
      `}</style>
    </Dialog>
  );
}
