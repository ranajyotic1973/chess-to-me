## 1. Constructor detection

- [x] 1.1 Introduce helper state that tracks whether either window.ChessBoard or window.Chessboard is defined and expose the resolved constructor to App.jsx.
- [x] 1.2 Use the resolved constructor when the view switches to analysis so we only call it when the library is actually present.

## 2. Retry flow & messaging

- [x] 2.1 Add a short retry loop (e.g., every 200ms for up to 2 seconds) that re-checks for the constructor before marking the library as missing.
- [x] 2.2 Only show the ChessboardJS failed to load message once all retries fail, and keep the board status fresh when the constructor becomes available mid-retry.
