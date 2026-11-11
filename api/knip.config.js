import preset from "../vendor/house-style/knip.json" with { type: "json" };

// knip has no `extends`, so this spreads the house preset. It runs per project (each has its own
// package.json and lockfile), and the root check:conventions calls both. The ESLint config is an entry
// because knip only finds it through an `eslint` dependency, and ESLint is installed once, in the folder
// above, so knip sees it, and knip itself, as binaries the project does not list.
export default { ...preset, entry: ["eslint.config.js"], ignoreBinaries: ["eslint", "knip"] };
