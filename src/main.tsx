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

// Log to console (captured by electron main process)
function logRenderer(level: string, message: string, meta?: any): void {
  const entry = `[${new Date().toISOString()}] [${level}] [renderer] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  console.log(entry);
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
logRenderer("INFO", "main.tsx loaded");

// Hide splash screen immediately when React mounts
if (typeof window !== "undefined") {
  if ((window as any).hideSplashScreen) {
    logRenderer("DEBUG", "Calling hideSplashScreen");
    try {
      (window as any).hideSplashScreen();
      logRenderer("INFO", "Splash screen hidden");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logRenderer("ERROR", "Failed to hide splash screen", { error: msg });
    }
  } else {
    logRenderer("WARN", "hideSplashScreen not found on window");
  }
}

const root = document.getElementById("root");
if (root) {
  logRenderer("DEBUG", "Creating React root");
  createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
  logRenderer("INFO", "React app rendered");
} else {
  logRenderer("ERROR", "Root element not found");
}
