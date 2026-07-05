import { Box } from "@mui/material";
import { Chess } from "chess.js";
import { CHESS_STARTING_POSITION_FEN, normalizeStartingPosition } from "../constants/chess";

interface MiniBoardProps {
  /** Position to render. "start" is accepted and mapped to the initial position. */
  fen: string;
  /** Pixel size of the (square) board. */
  size?: number;
}

const LIGHT = "#f0d9b5";
const DARK = "#b58863";

/**
 * A stateless, read-only chess board. Given a FEN it renders the position with
 * the app's piece images — no interaction, no engine, no side effects. Used by
 * the line-preview popup so previewing a line never touches the main board.
 */
export default function MiniBoard({ fen, size = 320 }: MiniBoardProps) {
  let board: ReturnType<Chess["board"]>;
  try {
    board = new Chess(normalizeStartingPosition(fen)).board();
  } catch {
    board = new Chess(CHESS_STARTING_POSITION_FEN).board();
  }

  return (
    <Box
      data-testid="preview-board"
      sx={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.2)",
        flexShrink: 0,
      }}
    >
      {board.map((row, r) =>
        row.map((piece, c) => {
          const isLight = (r + c) % 2 === 0;
          const code = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;
          return (
            <Box
              key={`${r}-${c}`}
              sx={{ backgroundColor: isLight ? LIGHT : DARK, position: "relative" }}
            >
              {code && (
                <Box
                  component="img"
                  src={`chesspieces/wikipedia/${code}.png`}
                  alt={code}
                  sx={{ width: "100%", height: "100%", display: "block" }}
                />
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
}
