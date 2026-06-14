// Jest stub for @chess-openings/eco.json (ESM-only package — CJS-incompatible in test env)
const openingBook = jest.fn().mockResolvedValue({});
const findOpening = jest.fn().mockReturnValue(undefined);
const getPositionBook = jest.fn().mockReturnValue({});
const lookupByMoves = jest.fn().mockReturnValue({ opening: undefined, movesBack: 0 });

module.exports = { openingBook, findOpening, getPositionBook, lookupByMoves };
