import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

/**
 * Formats a move notation string with the current move highlighted in bold with a yellow square.
 * Used in the line detail box to visually indicate which move the user is currently viewing.
 *
 * @param moveNotation - The SAN move notation string (e.g., "1. e4 e5 2. ♘f3 ♞f6")
 * @param currentMoveIndex - Zero-based index of the current move (0 = first move, 1 = second move, etc.)
 * @returns A React element with the current move in bold and a yellow square (🟨) indicator preceding it.
 *          Returns the original notation string if index is invalid or notation is empty.
 *
 * @example
 * // Returns JSX with "e5" bolded and preceded by 🟨
 * formatHighlightedMoveNotation("1. e4 e5 2. ♘f3", 1)
 */
export function formatHighlightedMoveNotation(
  moveNotation: string,
  currentMoveIndex: number
): ReactNode {
  // Return early for invalid input
  if (!moveNotation || currentMoveIndex < 0) {
    return moveNotation || "";
  }

  // Split the notation by spaces to get individual tokens
  const tokens = moveNotation.split(/\s+/);
  if (tokens.length === 0) {
    return moveNotation;
  }

  // Count moves, skipping move numbers (e.g., "1.", "2.", "10.") to find the target move
  let moveCount = 0;
  let targetTokenIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Skip move numbers (format: digits followed by a period)
    if (/^\d+\.$/.test(token)) {
      continue;
    }

    // Found a move token - check if it's the one we're highlighting
    if (moveCount === currentMoveIndex) {
      targetTokenIndex = i;
      break;
    }
    moveCount++;
  }

  // If the requested move index exceeds the number of moves, return notation without highlighting
  if (targetTokenIndex === -1) {
    return moveNotation;
  }

  // Build the highlighted notation by rendering each token, with the current move in bold
  const highlightedTokens: ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (i === targetTokenIndex) {
      // This is the current move - render it bold with yellow background highlight
      highlightedTokens.push(
        <Typography
          key={`move-${i}`}
          component="span"
          sx={{
            fontWeight: "bold",
            backgroundColor: "#FFEB3B",
            display: "inline-block",
            px: 0.3,
            borderRadius: 0.5,
          }}
        >
          {tokens[i]}
        </Typography>
      );
    } else {
      // Regular move or move number - render without styling
      highlightedTokens.push(
        <Typography key={`move-${i}`} component="span" sx={{ display: "inline" }}>
          {tokens[i]}
        </Typography>
      );
    }

    // Add space between tokens (except after the last token)
    if (i < tokens.length - 1) {
      highlightedTokens.push(" ");
    }
  }

  return <span>{highlightedTokens}</span>;
}
