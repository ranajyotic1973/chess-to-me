import { Avatar, Badge, Box, Popover, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { PuzzlePointsState } from "../types";

interface ProfileIconProps {
  refreshTrigger?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileIcon({ refreshTrigger }: ProfileIconProps) {
  const [displayName, setDisplayName] = useState<string>("");
  const [pointsState, setPointsState] = useState<PuzzlePointsState>({ points: null, frozenAtZero: false });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const electronAPI = typeof window !== "undefined" ? (window as any).electronAPI : null;

  const load = async () => {
    if (!electronAPI) return;
    const [name, pts] = await Promise.all([
      electronAPI.getDisplayName?.() as Promise<string>,
      electronAPI.getPoints?.() as Promise<PuzzlePointsState>
    ]);
    if (name !== undefined) setDisplayName(name);
    if (pts !== undefined) setPointsState(pts);
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const initials = getInitials(displayName || "?");

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ cursor: "pointer", position: "relative", display: "inline-flex" }}
        aria-label="Profile"
      >
        <Badge
          badgeContent={pointsState.points === null ? null : String(pointsState.points)}
          color="primary"
          max={99999}
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.65rem",
              height: 18,
              minWidth: 18,
              padding: "0 4px"
            }
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "secondary.main",
              fontSize: "0.85rem",
              fontWeight: 700
            }}
          >
            {initials}
          </Avatar>
        </Badge>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, minWidth: 180 } }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {displayName || "—"}
        </Typography>
        {pointsState.points === null ? (
          <Typography variant="body2" color="text.secondary">
            No puzzles solved yet
          </Typography>
        ) : (
          <>
            <Typography variant="body2">
              Puzzle points: <strong>{pointsState.points}</strong>
            </Typography>
            {pointsState.frozenAtZero && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Points are at zero — keep solving to earn more!
              </Typography>
            )}
          </>
        )}
      </Popover>
    </>
  );
}
