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
    "^@/(.*)$": "<rootDir>/src/$1"
  }
};
