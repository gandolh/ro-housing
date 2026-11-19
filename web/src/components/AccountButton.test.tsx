import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureAuth } from "../../vendor/ward/ward-auth-react.js";
import { AuthGate } from "../AuthGate.tsx";
import { AccountButton } from "./AccountButton.tsx";

const OWNER = {
  user: { id: "u1", username: "owner", role: "user", hasPassword: true },
  session: { origin: "local", expiresAt: Date.now() + 3_600_000 },
  ward: { enabled: true, linked: false },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A signed-in session with Ward on; the link call answers as the test says. */
function stubAuth(linkAnswer: (body: unknown) => Response) {
  const linkBodies: unknown[] = [];
  const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/ro-housing-api/auth/session") return json(OWNER);
    if (url === "/ro-housing-api/auth/ward/link" && init?.method === "POST") {
      const body: unknown = JSON.parse(String(init.body));
      linkBodies.push(body);
      return linkAnswer(body);
    }
    return json({ error: "not_found" }, 404);
  });
  configureAuth({ basePath: "/ro-housing-api/auth", fetch: fetchStub });
  return { linkBodies };
}

function renderAccount() {
  window.history.replaceState(null, "", "/account");
  render(
    <AuthGate>
      <AccountButton />
    </AuthGate>,
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Link Ward in the account dialog", () => {
  it("sends the typed password with the link call", async () => {
    const { linkBodies } = stubAuth(() => json({ error: "invalid_credentials" }, 401));
    const user = userEvent.setup();
    renderAccount();

    await user.type(await screen.findByLabelText("Current password"), "my passphrase");
    await user.click(screen.getByRole("button", { name: "Link Ward" }));
    await screen.findByRole("alert");
    expect(linkBodies).toEqual([{ currentPassword: "my passphrase" }]);
  });

  it("says a wrong password beside the field and keeps the focus there", async () => {
    stubAuth(() => json({ error: "invalid_credentials" }, 401));
    const user = userEvent.setup();
    renderAccount();

    const field = await screen.findByLabelText("Current password");
    await user.type(field, "wrong");
    await user.click(screen.getByRole("button", { name: "Link Ward" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That password isn't right.");
    expect(field).toHaveFocus();
    expect(field).toBeInvalid();
  });

  it("says how long to wait after too many tries", async () => {
    stubAuth(() => json({ error: "too_many_attempts", retryAfterSeconds: 30 }, 429));
    const user = userEvent.setup();
    renderAccount();

    await user.type(await screen.findByLabelText("Current password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Link Ward" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wait 30 seconds");
  });

  it("asks for a password before it calls Ward at all", async () => {
    const { linkBodies } = stubAuth(() => json({ error: "invalid_credentials" }, 401));
    const user = userEvent.setup();
    renderAccount();

    await user.click(await screen.findByRole("button", { name: "Link Ward" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your password");
    expect(linkBodies).toEqual([]);
  });
});
