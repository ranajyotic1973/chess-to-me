/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.{js,ts}", "**/*.test.{js,ts}"],
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest"]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "!src/**/*.{jsx,tsx}",
    "!src/**/*.test.{js,ts}",
    "!node_modules/**"
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // better-sqlite3 is compiled against Electron's Node.js ABI and cannot
    // load in the system Node.js test environment. The mock uses node:sqlite.
    "^better-sqlite3$": "<rootDir>/__mocks__/better-sqlite3.js"
  }
};
