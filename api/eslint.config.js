import { houseStyle } from "../vendor/house-style/eslint.config.js";

// The house config from the vendored house-style copy, given this project's folders. The compiler is
// the first gate; the house adds only what it cannot see. The three config files sit in no tsconfig, so
// the house config lints them without type information.
export default [
  ...houseStyle({
    root: import.meta.dirname,
    server: "src",
    // The seed CLI talks to the person running it, and the server entry logs before its logger exists.
    console: ["src/seed.ts", "src/server.ts"],
    ignores: ["src/details/fixtures/**"],
  }),
  {
    // A warning for now (2026-11-11): these files still read the environment themselves. When the
    // server takes its settings from config.ts, this block goes and the rule is an error again.
    name: "ro-housing-api/process-env-warns",
    files: ["src/**"],
    ignores: ["**/*.test.ts"],
    rules: { "n/no-process-env": "warn" },
  },
];
