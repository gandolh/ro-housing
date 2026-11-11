import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
// Sets up the auth client before anything asks it about the session.
import "./auth.ts";
import { AuthGate } from "./AuthGate.tsx";
import { AccountButton } from "./components/AccountButton.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <AuthGate>
      <App account={<AccountButton />} />
    </AuthGate>
  </StrictMode>,
);
