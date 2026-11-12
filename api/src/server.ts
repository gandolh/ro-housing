import closeWithGrace from "close-with-grace";
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

const app = await buildApp(config, {
  wicket: config.wicket && wicketClient(config.wicket),
  server: {
    logger: true,
    // Longer than the proxy keeps an idle upstream connection (Caddy: 2 minutes), so the proxy never
    // sends a request down a socket the server has just closed. connectionTimeout and requestTimeout
    // stay at Fastify's defaults: a refresh answers only when every source is done, which can take
    // minutes (docs/decisions.md).
    keepAliveTimeout: 125_000,
  },
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

// SIGINT, SIGTERM or an uncaught error: stop taking requests, finish those in flight, close the
// browser and exit. After 10 s it exits anyway.
closeWithGrace({ delay: 10_000, logger: app.log }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, "closing after an uncaught error");
  else app.log.info(`closing on ${signal ?? "request"}`);
  await app.close();
  await closeBrowser();
});
