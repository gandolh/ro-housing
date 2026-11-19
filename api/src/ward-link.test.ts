import type { FastifyInstance } from "fastify";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The real app on a throwaway database, with Ward on a stubbed issuer.
const issues = mkdtempSync(join(tmpdir(), "ro-housing-ward-link-test-"));
process.env.RO_HOUSING_DB = ":memory:";
process.env.RO_HOUSING_ISSUES_DIR = issues;

const { buildApp } = await import("./app.ts");
const { loadConfig } = await import("./config.ts");
const { db } = await import("./db/index.ts");
const { openAccounts, seedUser } = await import("./plugins/accounts.ts");
const { usernameSkeleton } = await import("../vendor/ward/ward-auth.js");

const PUBLIC = "https://example.com";
const ISSUER = "https://example.com/ward-api/oidc";
const PASSWORD = "a long test passphrase";

function clientKey(): string {
  const jwk = generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" });
  return Buffer.from(JSON.stringify({ ...jwk, kid: "test-key" })).toString("base64url");
}

/** Ward's discovery document and nothing else: the link start needs no more. */
const wardStub: typeof fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/.well-known/openid-configuration")) {
    return new Response(
      JSON.stringify({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["EdDSA"],
        token_endpoint_auth_methods_supported: ["private_key_jwt"],
        token_endpoint_auth_signing_alg_values_supported: ["EdDSA"],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response("not found", { status: 404 });
};

describe("linking Ward asks for the password", () => {
  let app: FastifyInstance;
  let cookie = "";

  const link = (payload?: unknown, headers: Record<string, string> = {}) =>
    app.inject({
      method: "POST",
      url: "/ro-housing-api/auth/ward/link",
      headers: { origin: PUBLIC, ...headers },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });

  beforeAll(async () => {
    const config = loadConfig({
      PUBLIC_ORIGIN: PUBLIC,
      HOST: "0.0.0.0",
      WARD_OIDC_ISSUER: ISSUER,
      WARD_OIDC_CLIENT_ID: "ro-housing",
      WARD_OIDC_CLIENT_KEY: clientKey(),
      WARD_OIDC_REDIRECT_URI: `${PUBLIC}/ro-housing-api/auth/ward/callback`,
    });
    if (!config.ward) throw new Error("the test config has no Ward");
    app = await buildApp({ ...config, ward: { ...config.ward, fetch: wardStub } });
    await seedUser(openAccounts(db), { username: "owner", password: PASSWORD });
    const login = await app.inject({
      method: "POST",
      url: "/ro-housing-api/auth/login",
      headers: { origin: PUBLIC },
      payload: { username: "owner", password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    cookie = String(login.headers["set-cookie"]).split(";")[0]!;
  });
  afterAll(async () => {
    await app.close();
    rmSync(issues, { recursive: true, force: true });
  });

  it("refuses a link with no session", async () => {
    expect((await link({ currentPassword: PASSWORD })).statusCode).toBe(401);
  });

  it("refuses a link without the password", async () => {
    const response = await link({}, { cookie });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });
  });

  it("refuses a link with a wrong password", async () => {
    const response = await link({ currentPassword: "not the passphrase" }, { cookie });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: "invalid_credentials" });
  });

  it("starts the link with the right password", async () => {
    const response = await link({ currentPassword: PASSWORD }, { cookie });
    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).toContain(`${ISSUER}/authorize`);
  });

  it("refuses a local account whose name looks like an existing one (the app has no /register route)", async () => {
    const accounts = openAccounts(db);
    expect(usernameSkeleton("AIice")).toBe(usernameSkeleton("alice"));
    await seedUser(accounts, { username: "alice", password: PASSWORD });
    await expect(accounts.createUser({ username: "AIice", password: PASSWORD, role: "user" })).rejects.toThrow(
      /taken/i,
    );
  });
});
