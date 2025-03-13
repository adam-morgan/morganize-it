const config = {
  projects: [
    {
      displayName: "server",
      preset: "ts-jest/presets/js-with-ts",
      rootDir: "./src",
      testMatch: ["<rootDir>/tests/server/**/?(*.)+(spec|test).[jt]s?(x)"],
      testEnvironment: "node",
      moduleFileExtensions: ["ts", "js", "node"],
      moduleDirectories: ["node_modules", "src"],
      setupFilesAfterEnv: ["<rootDir>/tests/server/jest.setup.ts"],
      globalSetup: "<rootDir>/tests/server/jest.globalSetup.ts",
      globalTeardown: "<rootDir>/tests/server/jest.globalTeardown.ts",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/out"],
      transform: {
        "^.+\\.(ts)$": ["ts-jest", { tsconfig: "tsconfig.jest.json", warnOnly: true }],
      },
    },
  ],
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!jest.config.ts",
    "!**/node_modules/**",
    "!**/.vscode/**",
    "!**/coverage/**",
    "!**/dist/**",
  ],
  coverageReporters: ["text", "lcov", "cobertura"],
};

export default config;
