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
  Tooltip,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import { Chess } from "chess.js";

interface BoardPositionEditorProps {
  open: boolean;
  onClose: () => void;
  onPositionConfirm: (fen: string) => void;
  initialFen?: string;
}

const STARTING_POSITION: Record<string, string> = {
  a8: "bR", b8: "bN", c8: "bB", d8: "bQ", e8: "bK", f8: "bB", g8: "bN", h8: "bR",
  a7: "bP", b7: "bP", c7: "bP", d7: "bP", e7: "bP", f7: "bP", g7: "bP", h7: "bP",
  a2: "wP", b2: "wP", c2: "wP", d2: "wP", e2: "wP", f2: "wP", g2: "wP", h2: "wP",
  a1: "wR", b1: "wN", c1: "wB", d1: "wQ", e1: "wK", f1: "wB", g1: "wN", h1: "wR"
};

const PIECE_SYMBOLS = {
  white: [
    { name: "King", piece: "wK" },
    { name: "Queen", piece: "wQ" },
    { name: "Rook", piece: "wR" },
    { name: "Bishop", piece: "wB" },
    { name: "Knight", piece: "wN" },
    { name: "Pawn", piece: "wP" }
  ],
  black: [
    { name: "King", piece: "bK" },
    { name: "Queen", piece: "bQ" },
    { name: "Rook", piece: "bR" },
    { name: "Bishop", piece: "bB" },
    { name: "Knight", piece: "bN" },
    { name: "Pawn", piece: "bP" }
  ]
};

const getPieceImageUrl = (piece: string): string => {
  return `/chesspieces/wikipedia/${piece}.png`;
};

export default function BoardPositionEditor({
  open,
  onClose,
  onPositionConfirm,
  initialFen
}: BoardPositionEditorProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<any>(null);
  const [ctor, setCtor] = useState(() => detectChessboardConstructor());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [sideToMove, setSideToMove] = useState<"w" | "b">("w");
  const currentPosition = useRef<Record<string, string>>({ ...STARTING_POSITION });

  function detectChessboardConstructor() {
    if (typeof window === "undefined") {
      return null;
    }
    const ctor = (window as any).Chessboard || (window as any).ChessBoard;
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
    if (!ctor || !open) {
      return undefined;
    }

    const initializeBoard = () => {
      if (!boardRef.current) {
        setTimeout(initializeBoard, 100);
        return;
      }

      const pieceThemePath = "chesspieces/wikipedia/{piece}.png";

      boardInstance.current?.destroy?.();

      try {
        // Create board with free placement mode (no move validation)
        boardInstance.current = ctor(boardRef.current, {
          draggable: true,
          dropOffBoard: "trash",
          pieceTheme: pieceThemePath,
          position: { ...STARTING_POSITION },
          onDrop: handleBoardDrop,
          onDragStart: handleBoardDragStart
        });

        if (boardInstance.current?.resize) {
          boardInstance.current.resize();
          setBoardLoaded(true);
          setTimeout(() => {
            boardInstance.current?.resize?.();
          }, 100);
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

  const handleBoardDragStart = (source: string, piece: string) => {
    console.log(`[BoardEditor] Drag start: piece=${piece} from ${source}`);
  };

  const handleBoardDrop = (source: string, target: string) => {
    console.log(`[BoardEditor] Drop: from=${source} to=${target}`);

    // If dragged off board (using dropOffBoard: 'trash')
    if (target === "offboard") {
      console.log("[BoardEditor] Piece dragged off board, removing");
      delete currentPosition.current[source];
      updateBoardDisplay();
      return "drop";
    }

    // Normal move within board
    if (source !== target) {
      console.log(`[BoardEditor] Moving piece from ${source} to ${target}`);
      const piece = currentPosition.current[source];
      if (piece) {
        delete currentPosition.current[source];
        currentPosition.current[target] = piece;
        updateBoardDisplay();
      }
    }

    return "drop";
  };

  const updateBoardDisplay = () => {
    if (boardInstance.current) {
      boardInstance.current.position({ ...currentPosition.current }, false);
    }
  };

  const handlePieceDragStart = (e: React.DragEvent<any>, piece: string) => {
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

      console.log(`[BoardEditor] Placing ${piece} on ${square}`);
      currentPosition.current[square] = piece;
      updateBoardDisplay();
    }

    setDraggedPiece(null);
  };

  const handleClearBoard = () => {
    console.log("[BoardEditor] Clearing board");
    currentPosition.current = {};
    if (boardInstance.current) {
      boardInstance.current.clear(false);
    }
  };

  const handleReset = () => {
    console.log("[BoardEditor] Resetting to starting position");
    currentPosition.current = { ...STARTING_POSITION };
    updateBoardDisplay();
  };

  const validatePosition = (): boolean => {
    try {
      // Build FEN from position
      const fen = positionToFen(currentPosition.current, sideToMove);
      console.log("[BoardEditor] Generated FEN:", fen);

      // Validate with chess.js
      const testChess = new Chess();
      testChess.load(fen);
      return true;
    } catch (err) {
      const message = (err as Error).message || "Invalid position";
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
      console.error("[BoardEditor] Position validation error:", err);
      return false;
    }
  };

  const handleConfirm = () => {
    if (validatePosition()) {
      const fen = positionToFen(currentPosition.current, sideToMove);
      onPositionConfirm(fen);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { zIndex: 999 }
        }
      }}
      PaperProps={{
        sx: {
          minHeight: "85vh",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000
        }
      }}
    >
      <DialogTitle>Board Setup</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          flex: 1,
          minHeight: 0,
          backgroundColor: "#fafafa",
          alignItems: "flex-start",
          justifyContent: "center",
          overflowX: "hidden",
          overflowY: "auto"
        }}
      >
        {/* White Pieces - Left Side */}
        <Stack direction="column" spacing={1} sx={{ flexShrink: 0, paddingTop: 1 }}>
          {PIECE_SYMBOLS.white.map((piece) => (
            <Box
              key={piece.piece}
              draggable
              onDragStart={(e) => handlePieceDragStart(e, piece.piece)}
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

          <Stack direction="row" spacing={1}>
            <Tooltip title="Clear board">
              <IconButton onClick={handleClearBoard} size="small">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset to starting position">
              <IconButton onClick={handleReset} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Side to Move Selection */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <FormLabel sx={{ mb: 0.5, fontSize: "0.85rem", fontWeight: 600 }}>Side to Play First</FormLabel>
            <RadioGroup
              row
              value={sideToMove}
              onChange={(e) => setSideToMove(e.target.value as "w" | "b")}
              sx={{ justifyContent: "center", gap: 1 }}
            >
              <FormControlLabel
                value="w"
                control={<Radio size="small" />}
                label={<span style={{ fontSize: "0.9rem" }}>White</span>}
                sx={{ margin: 0 }}
              />
              <FormControlLabel
                value="b"
                control={<Radio size="small" />}
                label={<span style={{ fontSize: "0.9rem" }}>Black</span>}
                sx={{ margin: 0 }}
              />
            </RadioGroup>
          </FormControl>
        </Stack>

        {/* Black Pieces - Right Side */}
        <Stack direction="column" spacing={1} sx={{ flexShrink: 0, paddingTop: 1 }}>
          {PIECE_SYMBOLS.black.map((piece) => (
            <Box
              key={piece.piece}
              draggable
              onDragStart={(e) => handlePieceDragStart(e, piece.piece)}
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

        /* Allow dragged pieces to appear above dialog */
        body .chessboard-1-piece-dragging {
          z-index: 10000 !important;
          position: fixed !important;
        }

        /* Chessboard.js dragging class variants */
        body .chessboard-piece-dragging {
          z-index: 10000 !important;
          position: fixed !important;
        }

        /* Generic piece dragging */
        div[data-piece-dragging="true"] {
          z-index: 10000 !important;
          position: fixed !important;
        }
      `}</style>
    </Dialog>
  );
}

// Convert position object to FEN
function positionToFen(position: Record<string, string>, sideToMove: "w" | "b" = "w"): string {
  // Map piece notation from board format (wK, bP) to FEN format (K, k, P, p)
  const pieceMap: Record<string, string> = {
    wK: "K", wQ: "Q", wR: "R", wB: "B", wN: "N", wP: "P",
    bK: "k", bQ: "q", bR: "r", bB: "b", bN: "n", bP: "p"
  };

  let fen = "";

  for (let rank = 8; rank >= 1; rank--) {
    let emptyCount = 0;

    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + rank;
      const piece = position[square];

      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        // Convert piece notation to FEN format
        const fenPiece = pieceMap[piece];
        if (!fenPiece) {
          throw new Error(`Invalid piece notation: ${piece}`);
        }
        fen += fenPiece;
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) {
      fen += emptyCount;
    }

    if (rank > 1) {
      fen += "/";
    }
  }

  // Add side to move and castling rights
  fen += ` ${sideToMove} KQkq - 0 1`;

  return fen;
}
