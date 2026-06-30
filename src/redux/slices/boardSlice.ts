import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
});

export const {
  setCurrentFen,
  addToMoveHistory,
  resetMoveHistory,
  setSelectedSquare,
  resetBoard,
} = boardSlice.actions;

export default boardSlice.reducer;
