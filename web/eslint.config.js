import { houseStyle } from "../vendor/house-style/eslint.config.js";

// The house config from the vendored house-style copy, given this project's folders. The compiler is
// the first gate; the house adds only what it cannot see.
export default [
  ...houseStyle({
    root: import.meta.dirname,
    web: "src",
  }),
  {
    // Warnings for now (2026-11-11): four pages load their data by setting state inside an effect, and
    // SavedPage reads a ref while rendering. Fixing them changes when the pages render, so each needs a
    // test first. When the pages load through a data hook and the ref read moves into an effect or
    // handler, this block goes and both rules are errors again.
    name: "ro-housing-web/react-hooks-warns",
    files: ["src/**"],
    rules: { "react-hooks/set-state-in-effect": "warn", "react-hooks/refs": "warn" },
  },
];
