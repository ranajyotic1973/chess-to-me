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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
