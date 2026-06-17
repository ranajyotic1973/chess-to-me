import { Alert, Stack } from "@mui/material";
import type { StatusBannerProps } from "../types";

export default function StatusBanner({ statusMessage, analysisStatus }: StatusBannerProps) {
  if (!statusMessage && !analysisStatus) {
    return null;
  }

  return (
    <Stack
      spacing={1}
      sx={{
        width: "100%",
        position: "fixed",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        maxWidth: "calc(100% - 32px)"
      }}
    >
      {statusMessage && (
        <Alert severity="info" variant="filled">
          {statusMessage}
        </Alert>
      )}
      {analysisStatus && (
        <Alert severity="warning" variant="outlined">
          {analysisStatus}
        </Alert>
      )}
    </Stack>
  );
}
