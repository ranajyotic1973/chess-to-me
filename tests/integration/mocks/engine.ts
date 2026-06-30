import type { AnalysisLine } from '../../../src/types';

/**
 * Mock engine responses for different positions
 */
export const MOCK_ENGINE_RESPONSES: Record<string, AnalysisLine[]> = {
  // Starting position - returns 4 lines (e4, d4, Nf3, c4)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': [
    {
      id: 'line-1',
      rank: 1,
      score: { type: 'cp', value: 26 },
      pv: ['e2e4', 'e7e5'],
      line: '1. e4 e5',
    },
    {
      id: 'line-2',
      rank: 2,
      score: { type: 'cp', value: 25 },
      pv: ['d2d4', 'g8f6'],
      line: '1. d4 Nf6',
    },
    {
      id: 'line-3',
      rank: 3,
      score: { type: 'cp', value: 24 },
      pv: ['g1f3', 'd7d5'],
      line: '1. Nf3 d5',
    },
    {
      id: 'line-4',
      rank: 4,
      score: { type: 'cp', value: 20 },
      pv: ['c2c4', 'e7e5'],
      line: '1. c4 e5',
    },
  ],

  // After 1. e4 - Italian game responses
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': [
    {
      id: 'line-1',
      rank: 1,
      score: { type: 'cp', value: 20 },
      pv: ['e7e5'],
      line: '1... e5',
    },
    {
      id: 'line-2',
      rank: 2,
      score: { type: 'cp', value: 18 },
      pv: ['c7c5'],
      line: '1... c5',
    },
    {
      id: 'line-3',
      rank: 3,
      score: { type: 'cp', value: 15 },
      pv: ['e7e6'],
      line: '1... e6',
    },
    {
      id: 'line-4',
      rank: 4,
      score: { type: 'cp', value: 12 },
      pv: ['d7d5'],
      line: '1... d5',
    },
  ],

  // After 1. e4 e5 2. Nf3 - Classic Italian responses
  'rnbqkbnr/pppppppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2': [
    {
      id: 'line-1',
      rank: 1,
      score: { type: 'cp', value: 22 },
      pv: ['g8f6'],
      line: '2... Nf6',
    },
    {
      id: 'line-2',
      rank: 2,
      score: { type: 'cp', value: 20 },
      pv: ['b8c6'],
      line: '2... Nc6',
    },
    {
      id: 'line-3',
      rank: 3,
      score: { type: 'cp', value: 18 },
      pv: ['d7d6'],
      line: '2... d6',
    },
    {
      id: 'line-4',
      rank: 4,
      score: { type: 'cp', value: 16 },
      pv: ['f7f6'],
      line: '2... f6',
    },
  ],
};

/**
 * Get mock engine response for a position
 */
export function getMockEngineResponse(fen: string): AnalysisLine[] {
  return MOCK_ENGINE_RESPONSES[fen] || getGenericResponse();
}

/**
 * Generic response when position not found in mocks
 */
function getGenericResponse(): AnalysisLine[] {
  return [
    {
      id: 'generic-1',
      rank: 1,
      score: { type: 'cp', value: 25 },
      pv: [],
      line: 'Best move',
    },
    {
      id: 'generic-2',
      rank: 2,
      score: { type: 'cp', value: 20 },
      pv: [],
      line: 'Second best',
    },
    {
      id: 'generic-3',
      rank: 3,
      score: { type: 'cp', value: 15 },
      pv: [],
      line: 'Third best',
    },
    {
      id: 'generic-4',
      rank: 4,
      score: { type: 'cp', value: 10 },
      pv: [],
      line: 'Fourth best',
    },
  ];
}
