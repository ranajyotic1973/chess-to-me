import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";

export interface SelectableListItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: ReactNode;
}

interface SelectableListProps {
  items: SelectableListItem[];
  title?: string;
  hint?: string;
  /** Controlled: pass a non-null id to show the detail view, null to show the list. */
  selectedId?: string | null;
  onSelect: (id: string, index: number) => void;
  /** Called when the back button is pressed. Parent clears selectedId and handles any mode changes. */
  onBack: () => void;
  /** Optional content rendered in the sticky header, before the back button (e.g. a selection summary). */
  detailHeaderText?: ReactNode;
  /** When true, also show a back button in the LIST view (e.g. this list is itself one level
   *  of a drill-down and a parent list exists to return to). Uses the same onBack callback. */
  showBackInList?: boolean;
  /** Content rendered inside the detail view when selectedId is non-null. */
  children?: ReactNode;
}

export default function SelectableList({
  items,
  title,
  hint,
  selectedId = null,
  onSelect,
  onBack,
  detailHeaderText,
  showBackInList = false,
  children
}: SelectableListProps) {
  if (selectedId !== null) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            position: "sticky",
            top: 0,
            zIndex: 1,
            flexShrink: 0,
            bgcolor: "background.paper",
            pb: 0.5,
          }}
        >
          {detailHeaderText}
          <Tooltip title="Back">
            <IconButton size="small" onClick={onBack} aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flexShrink: 1, minHeight: 0, maxHeight: "60vh", overflowY: "auto" }}>
          {children}
        </Box>
      </Box>
    );
  }

  const isSingleItem = items.length === 1;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {showBackInList && (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Back">
            <IconButton size="small" onClick={onBack} aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      )}
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
      {items.map((item, idx) => (
        <Box
          key={item.id}
          onClick={() => onSelect(item.id, idx)}
          sx={{
            p: 1.5,
            borderRadius: 1,
            backgroundColor: "action.hover",
            cursor: "pointer",
            border: 1,
            borderColor: "transparent",
            transition: "background-color 0.15s",
            "&:hover": { backgroundColor: "action.selected" }
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: isSingleItem ? "normal" : "nowrap"
                }}
              >
                {item.label}
              </Typography>
              {item.sublabel && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    mt: 0.25,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: isSingleItem ? "normal" : "nowrap"
                  }}
                >
                  {item.sublabel}
                </Typography>
              )}
            </Box>
            {item.badge != null && <Box sx={{ flexShrink: 0 }}>{item.badge}</Box>}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
