import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { handleBoardMove } from "../thunks/boardThunks";

interface BoardState {
  currentFen: string;
  moveHistory: string[];
  selectedSquare: string | null;
}

const initialState: BoardState = {
  currentFen: "start",
  moveHistory: [],
  selectedSquare: null,
};

const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {
    setCurrentFen: (state, action: PayloadAction<string>) => {
      state.currentFen = action.payload;
    },
    addToMoveHistory: (state, action: PayloadAction<string>) => {
      state.moveHistory.push(action.payload);
    },
    resetMoveHistory: (state) => {
      state.moveHistory = [];
    },
    setSelectedSquare: (state, action: PayloadAction<string | null>) => {
      state.selectedSquare = action.payload;
    },
    resetBoard: (state) => {
      state.currentFen = "start";
      state.moveHistory = [];
      state.selectedSquare = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(handleBoardMove.fulfilled, (state, action) => {
      state.currentFen = action.payload.fen;
      if (action.payload.fen !== "start") {
        state.moveHistory.push(action.payload.fen);
      }
    });
  },
});

export const {
  setCurrentFen,
  addToMoveHistory,
  resetMoveHistory,
  setSelectedSquare,
  resetBoard,
} = boardSlice.actions;

export default boardSlice.reducer;
