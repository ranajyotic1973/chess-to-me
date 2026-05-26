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
  Alert,
  IconButton,
  Tooltip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Chess } from "chess.js";
import type { AnalysisBoardProps } from "../types";

interface BoardPositionEditorProps {
  open: boolean;
  onClose: () => void;
  onPositionConfirm: (fen: string) => void;
  initialFen?: string;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EMPTY_FEN = "8/8/8/8/8/8/8/8 w KQkq - 0 1";

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
  if (!key) {
    console.warn("[BoardEditor] Unknown piece:", piece);
    return "";
  }
  return `/chesspieces/wikipedia/${key}.png`;
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
  const chess = useRef<Chess>(new Chess());

  // Initialize with starting position
  useEffect(() => {
    try {
      chess.current.reset();
    } catch (err) {
      console.error("[BoardEditor] Failed to initialize board:", err);
    }
  }, []);
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [boardLoaded, setBoardLoaded] = useState(false);

  function detectChessboardConstructor() {
    if (typeof window === "undefined") {
      console.log("[BoardEditor] Window is undefined");
      return null;
    }
    const ctor = (window as any).Chessboard || (window as any).ChessBoard;
    console.log("[BoardEditor] ChessboardJS detected:", !!ctor);
    if (!ctor) {
      console.log("[BoardEditor] Available window props:", Object.keys((window as any)).filter(k => k.includes('Chess') || k.includes('chess')));
    }
    return ctor || null;
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
    console.log("[BoardEditor] useEffect - open:", open, "ctor:", !!ctor, "boardRef:", !!boardRef.current);
    if (!ctor || !open) {
      return undefined;
    }

    // Wait for boardRef to be available
    const initializeBoard = () => {
      if (!boardRef.current) {
        console.log("[BoardEditor] boardRef not ready yet, retrying...");
        setTimeout(initializeBoard, 100);
        return;
      }

      const pieceThemePath = "chesspieces/wikipedia/{piece}.png";

      boardInstance.current?.destroy?.();
      chess.current.reset();
      const startingBoardFen = chess.current.fen();

      try {
        console.log("[BoardEditor] Creating board with ctor:", typeof ctor, "boardRef:", !!boardRef.current);

        boardInstance.current = ctor(boardRef.current, {
          draggable: true,
          pieceTheme: pieceThemePath,
          position: startingBoardFen,
          onDrop: handleBoardDrop
        });

        console.log("[BoardEditor] Board created:", !!boardInstance.current);

        // Resize the board after creation and on the next frame to ensure proper sizing
        if (boardInstance.current?.resize) {
          boardInstance.current.resize();
          setBoardLoaded(true);
          setTimeout(() => {
            boardInstance.current?.resize?.();
            console.log("[BoardEditor] Board resized");
          }, 100);
        } else {
          console.warn("[BoardEditor] Board instance has no resize method");
        }
      } catch (err) {
        console.error("[BoardEditor] Failed to create board:", err);
        setErrorMessage(`Failed to initialize board: ${err instanceof Error ? err.message : String(err)}`);
        setBoardLoaded(false);
      }
    };

    initializeBoard();

    return () => {
      if (boardInstance.current?.destroy) {
        boardInstance.current.destroy();
      }
      boardInstance.current = null;
    };
  }, [ctor, open]);

  const handleBoardDrop = (source: string, target: string) => {
    const isValidSquare = /^[a-h][1-8]$/.test(target);

    if (!isValidSquare) {
      // Piece dragged off board - delete it
      chess.current.remove(source);
      updateBoardDisplay();
      return "snapback";
    }

    // Check if there's already a piece on the source square
    const board = chess.current.board();
    const sourcePiece = board[8 - parseInt(source[1])][source.charCodeAt(0) - 97];

    if (!sourcePiece) {
      // No piece to move from this square - snap back
      return "snapback";
    }

    // Try to move from existing piece on source square
    const move = chess.current.move({ from: source, to: target, promotion: "q" });
    if (!move) {
      // Invalid move - snap back
      return "snapback";
    }

    // Valid move - update display and allow the piece to stay
    updateBoardDisplay();
    return "drop";
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

  const handleReset = () => {
    chess.current.reset();
    updateBoardDisplay();
    setErrorMessage("");
    console.log("[BoardEditor] Board reset to starting position");
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
      <DialogContent dividers sx={{ display: "flex", flexDirection: "row", gap: 2, flex: 1, minHeight: 0, overflow: "auto", backgroundColor: "#fafafa", alignItems: "flex-start", justifyContent: "center" }}>
        {/* White Pieces - Left Side */}
        <Stack direction="column" spacing={1} sx={{ flexShrink: 0, paddingTop: 1 }}>
          {PIECE_SYMBOLS.white.map((piece) => (
            <Box
              key={piece.fen}
              draggable
              onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
              sx={{
                width: 50,
                height: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f0f0f0",
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
                border: "1px solid #ccc",
                borderRadius: 1,
                opacity: 0.95,
                "&:hover": { opacity: 1, backgroundColor: "#e8e8e8" },
                flexShrink: 0,
                overflow: "hidden"
              }}
              title={piece.name}
            >
              <img
                src={getPieceImageUrl(piece.piece)}
                alt={piece.name}
                style={{
                  width: "80%",
                  height: "80%",
                  objectFit: "contain"
                }}
                draggable={false}
              />
            </Box>
          ))}
        </Stack>

        {/* Board and Controls - Center */}
        <Stack direction="column" spacing={2} sx={{ flexShrink: 0, alignItems: "center" }}>
          {!boardLoaded && !ctor && (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: "center", px: 2 }}>
              Loading chessboard library...
            </Typography>
          )}
          {!boardLoaded && ctor && (
            <Typography variant="body2" color="error" sx={{ textAlign: "center", px: 2 }}>
              Failed to initialize board
            </Typography>
          )}
          <Box
            onDragOver={handleBoardDragOver}
            onDrop={handleBoardDropFromList}
            sx={{
              width: 400,
              height: 400,
              position: "relative",
              aspectRatio: "1",
              backgroundColor: "white",
              border: "2px solid #ddd",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            ref={boardRef}
          />

          {errorMessage && (
            <Alert severity="error" sx={{ animation: "fadeInOut 3s ease-in-out", width: "100%" }}>
              {errorMessage}
            </Alert>
          )}

          <Tooltip title="Reset to starting position">
            <IconButton onClick={handleReset} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Black Pieces - Right Side */}
        <Stack direction="column" spacing={1} sx={{ flexShrink: 0, paddingTop: 1 }}>
          {PIECE_SYMBOLS.black.map((piece) => (
            <Box
              key={piece.fen}
              draggable
              onDragStart={(e) => handlePieceDragStart(e, piece.fen)}
              sx={{
                width: 50,
                height: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f0f0f0",
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
                border: "1px solid #ccc",
                borderRadius: 1,
                opacity: 0.95,
                "&:hover": { opacity: 1, backgroundColor: "#e8e8e8" },
                flexShrink: 0,
                overflow: "hidden"
              }}
              title={piece.name}
            >
              <img
                src={getPieceImageUrl(piece.piece)}
                alt={piece.name}
                style={{
                  width: "80%",
                  height: "80%",
                  objectFit: "contain"
                }}
                draggable={false}
              />
            </Box>
          ))}
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
