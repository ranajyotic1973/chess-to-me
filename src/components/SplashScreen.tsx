import { Box, Stack, Typography } from "@mui/material";

interface SplashScreenProps {
  version?: string;
}

export default function SplashScreen({ version = "1.0.0" }: SplashScreenProps) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}
    >
      <Stack
        spacing={3}
        alignItems="center"
        sx={{
          textAlign: "center"
        }}
      >
        <Box
          component="img"
          src="./chesspieces/wikipedia/wK.png"
          alt="Chess King"
          sx={{
            width: "180px",
            height: "180px",
            filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))"
          }}
        />
        <Stack spacing={1}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: "bold",
              color: "white",
              letterSpacing: "2px"
            }}
          >
            Chess To Me
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: "300",
              letterSpacing: "1px"
            }}
          >
            v{version}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
