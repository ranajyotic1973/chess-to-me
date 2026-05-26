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

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const normalizeFen = (fen?: string): string => {
  if (!fen || fen === "start") {
    return STARTING_FEN;
  }
  return fen;
};

const PIECE_SYMBOLS = {
  white: [
    { name: "King", fen: "K", piece: "wK" },
    { name: "Queen", fen: "Q", piece: "wQ" },
    { name: "Rook", fen: "R", piece: "wR" },
    { name: "Bishop", fen: "B", piece: "wB" },
    { name: "Knight", fen: "N", piece: "wN" },
    { name: "Pawn", fen: "P", piece: "wP" }
  ],
  black: [
    { name: "King", fen: "k", piece: "bK" },
    { name: "Queen", fen: "q", piece: "bQ" },
    { name: "Rook", fen: "r", piece: "bR" },
    { name: "Bishop", fen: "b", piece: "bB" },
    { name: "Knight", fen: "n", piece: "bN" },
    { name: "Pawn", fen: "p", piece: "bP" }
  ]
};

const getPieceImageUrl = (piece: string): string => {
  const mapping: Record<string, string> = {
    wK: "K", wQ: "Q", wR: "R", wB: "B", wN: "N", wP: "P",
    bK: "k", bQ: "q", bR: "r", bB: "b", bN: "n", bP: "p"
  };
  const key = mapping[piece];
  return `chesspieces/wikipedia/${key}.png`;
};

export default function BoardPositionEditor({
  open,
  onClose,
  onPositionConfirm,
  initialFen
}: BoardPositionEditorProps) {
  const normalizedFen = normalizeFen(initialFen);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const chess = useRef<Chess>(new Chess(normalizedFen));
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
    if (!ctor || !boardRef.current || !open) {
      return undefined;
    }
    const pieceThemePath = "chesspieces/wikipedia/{piece}.png";

    boardInstance.current?.destroy?.();
    chess.current = new Chess(normalizedFen);

    try {
      boardInstance.current = ctor(boardRef.current, {
        draggable: true,
        pieceTheme: pieceThemePath,
        position: normalizedFen,
        onDrop: handleBoardDrop
      });

      // Resize the board after creation and on the next frame to ensure proper sizing
      if (boardInstance.current?.resize) {
        boardInstance.current.resize();
        setTimeout(() => {
          boardInstance.current?.resize?.();
        }, 100);
      }
    } catch (err) {
      console.error("Failed to create board:", err);
      setErrorMessage("Failed to initialize board. Please refresh and try again.");
    }

    return () => {
      if (boardInstance.current?.destroy) {
        boardInstance.current.destroy();
      }
      boardInstance.current = null;
    };
  }, [ctor, normalizedFen, open]);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: "85vh", maxHeight: "85vh" } }}>
      <DialogTitle>Board Setup</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0, overflow: "auto" }}>
        <Box
          onDragOver={handleBoardDragOver}
          onDrop={handleBoardDropFromList}
          sx={{
            width: "100%",
            maxWidth: 400,
            mx: "auto",
            mb: 2,
            position: "relative",
            aspectRatio: "1"
          }}
          ref={boardRef}
        />

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
              <Box
                key={piece.fen}
                draggable
                onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
                sx={{
                  width: 50,
                  height: 50,
                  backgroundImage: `url('${getPieceImageUrl(piece.piece)}')`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" },
                  border: "none",
                  borderRadius: 1,
                  opacity: 0.9,
                  "&:hover": { opacity: 1 }
                }}
                title={piece.name}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            BLACK PIECES
          </Typography>
          <Stack direction="row" spacing={1}>
            {PIECE_SYMBOLS.black.map((piece) => (
              <Box
                key={piece.fen}
                draggable
                onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
                sx={{
                  width: 50,
                  height: 50,
                  backgroundImage: `url('${getPieceImageUrl(piece.piece)}')`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" },
                  border: "none",
                  borderRadius: 1,
                  opacity: 0.9,
                  "&:hover": { opacity: 1 }
                }}
                title={piece.name}
              />
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
