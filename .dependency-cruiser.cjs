// The house dependency-cruiser preset, from the vendored house-style copy: no cycles, no unresolvable
// imports, a feature used through its index only, no Fastify in lib/. It runs once over both projects.
// Nothing is lowered here. adapters/ stays a folder of its own (db/ seeds the sources from its registry,
// and refresh runs it), so it is not a feature and needs no exception.
module.exports = {
  extends: "./vendor/house-style/.dependency-cruiser.cjs",
};
