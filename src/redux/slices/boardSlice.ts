import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { handleBoardMove as handleBoardMoveThunk } from "../thunks/boardThunks";
import { CHESS_STARTING_POSITION_KEY } from "../../constants/chess";

interface BoardState {
  currentFen: string;
  moveHistory: string[];
  selectedSquare: string | null;
}

const initialState: BoardState = {
  currentFen: CHESS_STARTING_POSITION_KEY,
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
      state.currentFen = CHESS_STARTING_POSITION_KEY;
      state.moveHistory = [];
      state.selectedSquare = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(handleBoardMoveThunk.fulfilled, (state, action) => {
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
