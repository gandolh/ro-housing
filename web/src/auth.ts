import { configureAuth, getAuthClient, type AuthClient } from "../vendor/ward/ward-auth-react.js";
import { onUnauthorized } from "./api.ts";
import { API_BASE } from "./base.ts";

/**
 * Signing in, from the browser. The app keeps its own accounts and session:
 * an opaque `ro_housing_session` cookie, HttpOnly, scoped to
 * `/ro-housing-api`. The vendored ward-auth hooks (`web/vendor/ward/`) talk to
 * the API's `/auth/*` routes and hold one shared session state, which the gate
 * (AuthGate.tsx) renders from; they draw nothing.
 *
 * Set up once, when the app loads: the client reads the result of a Ward
 * round trip (`?ward=linked`, `?ward_error=…`) from the address and takes it
 * out of the address bar. Any API call answered 401 asks the server about the
 * session again, which flips the gate to the login page.
 */
export const AUTH_BASE_PATH = `${API_BASE}/auth`;

configureAuth({ basePath: AUTH_BASE_PATH });

export function authClient(): AuthClient {
  return getAuthClient();
}

onUnauthorized(() => {
  void authClient()
    .refresh()
    .catch(() => undefined);
});
