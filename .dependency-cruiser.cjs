// The house dependency-cruiser preset, from the vendored house-style copy: no cycles, no unresolvable
// imports, a feature used through its index only, no Fastify in lib/. It runs once over both projects.
module.exports = {
  extends: "./vendor/house-style/.dependency-cruiser.cjs",
  forbidden: [
    // A warning for now (2026-11-11): lib/host.ts and lib/origin.ts (and their tests) import Fastify's
    // instance type. When those helpers take plain values and the caller hands them over, this goes and
    // the rule is an error again.
    { name: "lib-without-fastify", severity: "warn" },
  ],
};
