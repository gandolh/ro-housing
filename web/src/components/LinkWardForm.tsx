import { useRef, useState, type FormEvent } from "react";
import type { useWardLink } from "../../vendor/ward/ward-auth-react.js";
import { accountMessage } from "../messages.ts";
import { Button } from "./ui/Button.tsx";
import { Input } from "./ui/Input.tsx";

/**
 * "Link Ward": the account's password, typed again, and the button that sends the browser to Ward
 * with it. A refusal (a wrong password, too many tries) stays beside the field, which keeps focus.
 */
export function LinkWardForm({ link }: { link: ReturnType<typeof useWardLink> }) {
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (link.pending) return;
    if (password === "") {
      setMissing(true);
      input.current?.focus();
      return;
    }
    const started = await link.link(password);
    if (!started) input.current?.focus();
  }

  const invalid = missing || link.error !== null;
  return (
    <form
      className="mt-4 flex flex-col gap-2"
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-label="Link Ward"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-dim">Current password</span>
        <Input
          ref={input}
          name="current-password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setMissing(false);
          }}
        />
      </label>
      {missing && (
        <p role="alert" className="text-xs text-bad">
          Enter your password to link Ward.
        </p>
      )}
      {link.error !== null && (
        <p role="alert" className="text-xs text-bad">
          {accountMessage(link.error)}
        </p>
      )}
      <div>
        <Button type="submit" disabled={link.pending}>
          {link.pending ? "Opening Ward…" : "Link Ward"}
        </Button>
      </div>
    </form>
  );
}
