import { houseStyle } from "./vendor/house-style/eslint.config.js";

// The root holds only the harness: the scripts and the tool configs. The two projects lint themselves
// with their own eslint.config.js, so this one skips them.
export default houseStyle({
  root: import.meta.dirname,
  scripts: ["scripts", "docs/images"],
  playwright: ["e2e/**"],
  ignores: ["api/**", "web/**", "data/**"],
});
