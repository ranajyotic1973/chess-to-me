import { Box, IconButton, Stack, Typography } from "@mui/material";
import MinimizeIcon from "@mui/icons-material/Minimize";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CloseIcon from "@mui/icons-material/Close";

const VERSION = "v1.6.0";

export default function TitleBar() {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow?.();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <Box
      sx={{
        height: 40,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitAppRegion: "drag",
        zIndex: 10000,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* App Name and Version */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="subtitle2"
          sx={{
            color: "white",
            fontWeight: 600,
            fontSize: "0.9rem",
            letterSpacing: 0.5,
          }}
        >
          Chess To Me
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.75rem",
          }}
        >
          {VERSION}
        </Typography>
      </Stack>

      {/* Window Controls */}
      <Stack
        direction="row"
        spacing={0}
        sx={{
          WebkitAppRegion: "no-drag",
        }}
      >
        <IconButton
          size="small"
          onClick={handleMinimize}
          sx={{
            color: "white",
            padding: "6px",
            borderRadius: 0,
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
          aria-label="minimize"
        >
          <MinimizeIcon sx={{ fontSize: "1.2rem" }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleMaximize}
          sx={{
            color: "white",
            padding: "6px",
            borderRadius: 0,
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
          aria-label="maximize"
        >
          <CropSquareIcon sx={{ fontSize: "1.2rem" }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: "white",
            padding: "6px",
            borderRadius: 0,
            "&:hover": {
              backgroundColor: "rgba(255, 77, 77, 0.8)",
            },
          }}
          aria-label="close"
        >
          <CloseIcon sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
