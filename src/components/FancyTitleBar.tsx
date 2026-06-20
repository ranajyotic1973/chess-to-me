import { Box, Typography } from "@mui/material";

interface FancyTitleBarProps {
  version?: string;
}

export default function FancyTitleBar({ version = "1.0.0" }: FancyTitleBarProps) {
  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, #667eea 0%, #5a67d8 50%, #764ba2 100%)",
        padding: "12px 20px",
        boxShadow: `
          0 4px 6px rgba(0, 0, 0, 0.1),
          0 10px 20px rgba(102, 126, 234, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1)
        `,
        borderBottom: "2px solid rgba(0, 0, 0, 0.2)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
          pointerEvents: "none"
        }
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          perspective: "1000px"
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            filter: "drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))",
            letterSpacing: "1px",
            fontStyle: "italic",
            transform: "perspective(600px) rotateX(2deg)",
            transition: "all 0.3s ease"
          }}
        >
          ♔ Chess To Me
        </Typography>
        <Typography
          sx={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.8) 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "0.85rem",
            fontWeight: "600",
            letterSpacing: "0.5px",
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))",
            padding: "2px 8px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)",
            backdropFilter: "blur(8px)",
            boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
        >
          v{version}
        </Typography>
      </Box>
    </Box>
  );
}
