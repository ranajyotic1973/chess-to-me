import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AnalysisLine, AnalysisEntry } from "../../types";
import { parseStockfishLine, sortLinesByScore } from "../../utils/analysisHelpers";

interface AnalyzePositionPayload {
  fen: string;
  deepMode: boolean;
  electronAPI: any;
  formState: any;
  advancedAnalysisMode: boolean;
}

interface AnalyzeResponse {
  ok: boolean;
  error?: string;
  analysis?: { lines: AnalysisLine[] };
}

export const analyzePosition = createAsyncThunk(
  "analysis/analyzePosition",
  async (payload: AnalyzePositionPayload, { rejectWithValue }) => {
    const {
      fen,
      deepMode,
      electronAPI,
      formState,
      advancedAnalysisMode,
    } = payload;

    if (!electronAPI?.analyzePosition) {
      return rejectWithValue("Analysis engine unavailable.");
    }

    try {
      const multiPvLines = advancedAnalysisMode || deepMode ? 20 : 4;
      const analysisDepth = advancedAnalysisMode ? formState.analysisDepth : 10;

      const response = (await electronAPI.analyzePosition({
        engine: formState.selectedEngine,
        fen,
        depth: analysisDepth,
        multiPv: multiPvLines,
      })) as AnalyzeResponse;

      if (!response?.ok) {
        return rejectWithValue(
          response?.error || "Engine analysis failed."
        );
      }

      const lines = (response.analysis?.lines || []) as AnalysisLine[];
      const sorted = sortLinesByScore(lines);

      // Parse lines to AnalysisEntry format
      const entries: AnalysisEntry[] = sorted.map((line, idx) =>
        parseStockfishLine(line, idx + 1, fen)
      );

      return { lines: sorted, entries };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

interface FetchExplanationPayload {
  lines: AnalysisEntry[];
  fen: string;
  llmProvider: string;
  electronAPI: any;
}

export const fetchExplanations = createAsyncThunk(
  "analysis/fetchExplanations",
  async (payload: FetchExplanationPayload, { rejectWithValue }) => {
    const { lines, fen, llmProvider, electronAPI } = payload;

    if (!electronAPI?.askQuestion) {
      return rejectWithValue("LLM unavailable.");
    }

    try {
      const messages = lines
        .map(
          (e, i) =>
            `Line ${i + 1} (${e.scoreLabel || "?"}): ${e.description}\n${e.llmUserMessage}`
        )
        .join("\n\n");

      const response = await electronAPI.askQuestion({
        provider: llmProvider,
        question: messages,
        systemRole: "analyzeLines",
        fen,
      });

      if (!response?.ok) {
        return rejectWithValue(response?.error || "LLM request failed.");
      }

      return response.explanation || "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

interface FetchPerMoveExplanationPayload {
  lineIndex: number;
  entry: AnalysisEntry;
  fen: string;
  llmProvider: string;
  electronAPI: any;
}

export const fetchPerMoveExplanation = createAsyncThunk(
  "analysis/fetchPerMoveExplanation",
  async (payload: FetchPerMoveExplanationPayload, { rejectWithValue }) => {
    const { lineIndex, entry, fen, llmProvider, electronAPI } = payload;

    if (!electronAPI?.askQuestion) {
      return rejectWithValue("LLM unavailable.");
    }

    try {
      const message = `Analyze this line:\n${entry.description}\n${entry.llmUserMessage}`;

      const response = await electronAPI.askQuestion({
        provider: llmProvider,
        question: message,
        systemRole: "explainLine",
        fen,
      });

      if (!response?.ok) {
        return rejectWithValue(response?.error || "LLM request failed.");
      }

      return {
        lineIndex,
        explanation: response.explanation || "",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

interface DeepAnalyzeLinePayload {
  lineIndex: number;
  entry: AnalysisEntry;
  fen: string;
  llmProvider: string;
  electronAPI: any;
}

export const deepAnalyzeLine = createAsyncThunk(
  "analysis/deepAnalyzeLine",
  async (payload: DeepAnalyzeLinePayload, { rejectWithValue }) => {
    const { lineIndex, entry, fen, llmProvider, electronAPI } = payload;

    if (!electronAPI?.askQuestion) {
      return rejectWithValue("LLM unavailable.");
    }

    try {
      const message = `Provide deep analysis for this line:\n${entry.description}\n${entry.llmUserMessage}\n\nProvide analysis in JSON format with fields: strategy, pros_cons, counter_attack, sacrifice, novelty, endgame_chances, alternatives`;

      const response = await electronAPI.askQuestion({
        provider: llmProvider,
        question: message,
        systemRole: "deepAnalyzePosition",
        fen,
      });

      if (!response?.ok) {
        return rejectWithValue(response?.error || "Deep analysis failed.");
      }

      return {
        lineIndex,
        results: response.deepAnalysis || {},
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);
