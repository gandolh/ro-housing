import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ConfigError,
  databasePath,
  ENV_FILE,
  issuesDir,
  loadConfig,
  loadEnvFile,
  loadSeedConfig,
  REPO_ROOT,
} from "./config.ts";

const WARD = {
  WARD_OIDC_ISSUER: "https://example.com/ward-api/oidc",
  WARD_OIDC_CLIENT_ID: "ro-housing",
  WARD_OIDC_CLIENT_KEY: "not-a-real-key",
  WARD_OIDC_REDIRECT_URI: "https://example.com/ro-housing-api/auth/ward/callback",
};

describe("loadConfig", () => {
  it("defaults to local development: 127.0.0.1:3000, the Vite origin, no Ward", () => {
    expect(loadConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3000,
      webOrigins: undefined,
      chromiumDisableDevShm: false,
      publicOrigin: "http://127.0.0.1:5173",
      ward: undefined,
      trustedProxies: [],
      wicket: undefined,
    });
  });

  it("turns Fill the gaps on only with both Wicket settings", () => {
    const both = { WICKET_URL: "https://example.com/wicket-api", WICKET_TOKEN: "not-a-real-token" };
    expect(loadConfig(both).wicket).toEqual({ url: both.WICKET_URL, token: both.WICKET_TOKEN });
    expect(loadConfig({ WICKET_URL: both.WICKET_URL }).wicket).toBeUndefined();
    expect(loadConfig({ WICKET_TOKEN: both.WICKET_TOKEN, WICKET_URL: " " }).wicket).toBeUndefined();
    expect(() => loadConfig({ ...both, WICKET_URL: "wicket-api" })).toThrow(/WICKET_URL/);
  });

  it("reads the container’s settings", () => {
    const config = loadConfig({
      HOST: "0.0.0.0",
      PORT: "8809",
      WEB_ORIGINS: " http://localhost:4000 ",
      CHROMIUM_DISABLE_DEV_SHM: "1",
      PUBLIC_ORIGIN: "https://example.com",
      AUTH_TRUSTED_PROXIES: " 172.16.0.0/12, ,10.0.2.0/24",
      ...WARD,
    });
    expect(config).toMatchObject({
      host: "0.0.0.0",
      port: 8809,
      webOrigins: "http://localhost:4000",
      chromiumDisableDevShm: true,
      publicOrigin: "https://example.com",
      trustedProxies: ["172.16.0.0/12", "10.0.2.0/24"],
    });
    expect(config.ward?.clientId).toBe("ro-housing");
  });

  it("names every bad variable at once", () => {
    let error: unknown;
    try {
      loadConfig({ PORT: "eighty", PUBLIC_ORIGIN: "https://example.com/ro-housing/" });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toMatch(/PORT/);
    expect((error as Error).message).toMatch(/PUBLIC_ORIGIN/);
  });

  it("refuses half the Ward settings, or a callback outside the API prefix", () => {
    expect(() => loadConfig({ WARD_OIDC_ISSUER: WARD.WARD_OIDC_ISSUER })).toThrow(ConfigError);
    expect(() => loadConfig({ ...WARD, WARD_OIDC_REDIRECT_URI: "https://example.com/auth/ward/callback" })).toThrow(
      /ro-housing-api\/auth\/ward\/callback/,
    );
  });
});

describe("databasePath and issuesDir", () => {
  it("default to data/ and issues/ at the repo root", () => {
    expect(databasePath({})).toBe(join(REPO_ROOT, "data", "ro-housing.db"));
    expect(issuesDir({ RO_HOUSING_ISSUES_DIR: "  " })).toBe(join(REPO_ROOT, "issues"));
  });

  it("take an absolute path as it is, a relative one from the repo root, and :memory: for tests", () => {
    expect(databasePath({ RO_HOUSING_DB: "/srv/ro.db" })).toBe("/srv/ro.db");
    expect(databasePath({ RO_HOUSING_DB: "tmp/x.db" })).toBe(join(REPO_ROOT, "tmp", "x.db"));
    expect(databasePath({ RO_HOUSING_DB: ":memory:" })).toBe(":memory:");
    expect(issuesDir({ RO_HOUSING_ISSUES_DIR: "/data/issues" })).toBe("/data/issues");
  });
});

describe("loadSeedConfig", () => {
  it("reads the name and password the seed command was given, and leaves the rest to the prompt", () => {
    expect(loadSeedConfig({})).toEqual({ username: undefined, password: undefined });
    expect(loadSeedConfig({ SEED_USERNAME: " owner ", SEED_PASSWORD: " a pass " })).toEqual({
      username: "owner",
      password: " a pass ",
    });
    expect(loadSeedConfig({ SEED_USERNAME: "  ", SEED_PASSWORD: "" })).toEqual({
      username: undefined,
      password: undefined,
    });
  });
});

describe("loadEnvFile", () => {
  // Fails when this module moves deeper: the repo root is found by `../../`, and an `.env` that is
  // no longer found would not be an error, only silently unread.
  it("finds the repo root from where config.ts sits", () => {
    expect(existsSync(join(REPO_ROOT, ".env.example"))).toBe(true);
    expect(ENV_FILE).toBe(join(REPO_ROOT, ".env"));
  });

  it("reads the keys the environment leaves unset, and treats a missing file as fine", () => {
    const dir = mkdtempSync(join(tmpdir(), "ro-housing-env-"));
    const key = "RO_HOUSING_TEST_ENV_KEY";
    try {
      writeFileSync(join(dir, ".env"), `${key}=from-file\n`);
      loadEnvFile(join(dir, ".env"));
      expect(process.env[key]).toBe("from-file");
      expect(() => loadEnvFile(join(dir, "missing.env"))).not.toThrow();
    } finally {
      delete process.env[key];
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
