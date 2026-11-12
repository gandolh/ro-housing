import { ConfigError, databasePath, issuesDir, loadConfig, loadEnvFile, type Config } from "./config.ts";

// First: fills the environment from the repo root's .env. The app is imported after it, because the
// database module reads RO_HOUSING_DB when it loads.
loadEnvFile();
const { buildApp } = await import("./app.ts");
const { closeBrowser, configureBrowser } = await import("./lib/playwright.ts");
const { wicketClient } = await import("./lib/wicket.ts");

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`ro-housing cannot start:\n${err.message}`);
  process.exit(1);
}

const app = await buildApp({
  publicOrigin: config.publicOrigin,
  ward: config.ward,
  trustedProxies: config.trustedProxies,
  bindHost: config.host,
  webOriginsEnv: config.webOrigins,
  wicket: config.wicket && wicketClient(config.wicket),
  logger: true,
});
configureBrowser({ disableDevShm: config.chromiumDisableDevShm });
app.log.info(`database: ${databasePath()}; issues: ${issuesDir()}; public origin: ${config.publicOrigin}`);
app.log.info(
  config.ward ? "Sign in with Ward is on" : "WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward",
);
app.log.info(
  config.wicket
    ? `Fill the gaps is on, through Wicket at ${config.wicket.url}`
    : "WICKET_URL or WICKET_TOKEN is not set: no Fill the gaps",
);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    void (async () => {
      app.log.info(`received ${sig}, shutting down`);
      await app.close();
      await closeBrowser();
      process.exit(0);
    })();
  });
}
