import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource/sora/500.css";
import "@fontsource/sora/700.css";
import $ from "jquery";
import "./styles.css";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme";

if (typeof window !== "undefined") {
  window.$ = $;
  window.jQuery = $;
}

import ChessboardJS from "chessboardjs/www/js/chessboard.js";
import "chessboardjs/www/css/chessboard.css";
if (typeof window !== "undefined") {
  window.Chessboard = ChessboardJS;
  window.ChessBoard = ChessboardJS;
}

import App from "./App";

// Log to file via IPC
async function logToFile(level: string, message: string, meta?: any): Promise<void> {
  try {
    // Use the main process logger if available
    // For now, just log to console which is captured by electron logs
    const entry = `[${new Date().toISOString()}] [${level}] [renderer] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    console.log(entry);
  } catch (err) {
    console.error("Failed to log:", err);
  }
}

// Set up global error handlers
window.addEventListener("error", (event) => {
  const msg = event.error?.message || String(event);
  console.error(`[renderer] Window error: ${msg}`, event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason);
  console.error(`[renderer] Unhandled promise rejection: ${msg}`, event.reason);
});

// Log initialization start
logToFile("INFO", "main.tsx loaded").catch(console.error);

// Hide splash screen immediately when React mounts
if (typeof window !== "undefined") {
  if ((window as any).hideSplashScreen) {
    logToFile("DEBUG", "Calling hideSplashScreen").catch(console.error);
    try {
      (window as any).hideSplashScreen();
      logToFile("INFO", "Splash screen hidden").catch(console.error);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logToFile("ERROR", "Failed to hide splash screen", { error: msg }).catch(console.error);
    }
  } else {
    logToFile("WARN", "hideSplashScreen not found on window").catch(console.error);
  }
}

const root = document.getElementById("root");
if (root) {
  logToFile("DEBUG", "Creating React root").catch(console.error);
  createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
  logToFile("INFO", "React app rendered").catch(console.error);
} else {
  logToFile("ERROR", "Root element not found").catch(console.error);
}
