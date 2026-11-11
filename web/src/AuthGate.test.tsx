import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureAuth } from "../vendor/ward/ward-auth-react.js";
import { api, onUnauthorized } from "./api.ts";
import { AuthGate } from "./AuthGate.tsx";
import { pageOf } from "./route.ts";

const OWNER = {
  user: { id: "u1", username: "owner", role: "user", hasPassword: true },
  session: { origin: "local", expiresAt: Date.now() + 3_600_000 },
};

/** The auth routes on a stub: signed out until a login with the right password. */
function authServer({ ward = false } = {}) {
  let signedIn = false;
  const calls: string[] = [];
  const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    const wardStatus = { enabled: ward, linked: false };
    if (url === "/ro-housing-api/auth/session") {
      const body = signedIn ? { ...OWNER, ward: wardStatus } : { user: null, session: null, ward: wardStatus };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url === "/ro-housing-api/auth/login" && method === "POST") {
      const { password } = JSON.parse(String(init?.body)) as { password: string };
      if (password !== "right passphrase") {
        return new Response(JSON.stringify({ error: "invalid_credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      signedIn = true;
      return new Response(JSON.stringify({ ...OWNER, ward: wardStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  });
  configureAuth({ basePath: "/ro-housing-api/auth", fetch: fetchStub });
  return { calls };
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<AuthGate>", () => {
  it("shows the login page when signed out, with no sign-up and no Ward button when Ward is off", async () => {
    authServer();
    render(
      <AuthGate>
        <p>the app</p>
      </AuthGate>,
    );

    expect(await screen.findByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("the app")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in with Ward" })).not.toBeInTheDocument();
    expect(screen.queryByText(/sign up|register|create an account/i)).not.toBeInTheDocument();
  });

  it("offers Sign in with Ward when the API has it", async () => {
    authServer({ ward: true });
    render(
      <AuthGate>
        <p>the app</p>
      </AuthGate>,
    );
    expect(await screen.findByRole("button", { name: "Sign in with Ward" })).toBeInTheDocument();
  });

  it("says a wrong password, then signs in and shows the app", async () => {
    const { calls } = authServer();
    const user = userEvent.setup();
    render(
      <AuthGate>
        <p>the app</p>
      </AuthGate>,
    );
    await screen.findByRole("form", { name: "Sign in" });

    await user.type(screen.getByLabelText("Username"), "owner");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong username or password.");

    await user.type(screen.getByLabelText("Password"), "right passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("the app")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
    expect(calls.filter((c) => c === "POST /ro-housing-api/auth/login")).toHaveLength(2);
  });
});

describe("a 401 from the API", () => {
  it("tells the listeners, so the gate asks about the session again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })),
    );
    const heard = vi.fn();
    const stop = onUnauthorized(heard);
    await expect(api.listSources()).rejects.toThrow("unauthorized");
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("pageOf", () => {
  it("reads the three addresses under the base", () => {
    expect(pageOf("/ro-housing/", "/ro-housing/")).toBe("app");
    expect(pageOf("/ro-housing/login", "/ro-housing/")).toBe("login");
    expect(pageOf("/ro-housing/account/", "/ro-housing/")).toBe("account");
    expect(pageOf("/ro-housing/anything", "/ro-housing/")).toBe("app");
    expect(pageOf("/elsewhere/login", "/ro-housing/")).toBe("app");
  });
});
