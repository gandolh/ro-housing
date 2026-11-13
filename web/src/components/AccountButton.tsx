import {
  useLogout,
  useSession,
  useWardLink,
  useWardResult,
  useWardSignOut,
} from "../../vendor/ward/ward-auth-react.js";
import { accountMessage } from "../messages.ts";
import { navigate, usePage } from "../route.ts";
import { Icon } from "./Icon.tsx";
import { ThemeSwitch } from "./ThemeSwitch.tsx";
import { Button } from "./ui/Button.tsx";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/Dialog.tsx";

/**
 * The signed-in user's name in the header, opening the account dialog: who is
 * signed in and how, "Link Ward" when the API has Ward and this account has
 * none, and sign-out. The dialog is the `/ro-housing/account` address, where
 * Ward sends the browser back after linking (`?ward=linked`), so it opens by
 * itself then. A dialog, not a page, so the tabs behind it keep an open draft.
 */
export function AccountButton() {
  const session = useSession();
  const open = usePage() === "account";
  const link = useWardLink();
  const result = useWardResult();
  const logout = useLogout();
  const wardSignOut = useWardSignOut();

  if (session.status !== "signed_in") return null;
  const { user, ward } = session;
  const viaWard = session.session.origin === "ward";
  const linked = ward.linked || link.linked || result.result === "linked";
  const failure = link.error ?? result.error ?? logout.error ?? wardSignOut.error;

  return (
    <Dialog open={open} onOpenChange={(next) => navigate(next ? "account" : "app", { replace: !next })}>
      <DialogTrigger
        render={(props) => (
          <Button {...props} variant="ghost" className="max-[820px]:h-11">
            <Icon name="user" />
            {user.username}
          </Button>
        )}
      />
      <DialogContent>
        <DialogTitle>Account</DialogTitle>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
          <dt className="text-ink-dim">Signed in as</dt>
          <dd>{user.username}</dd>
          <dt className="text-ink-dim">Signed in with</dt>
          <dd>{viaWard ? "Ward" : "your ro-housing password"}</dd>
          {ward.enabled && (
            <>
              <dt className="text-ink-dim">Ward</dt>
              <dd>{linked ? "Linked" : "Not linked"}</dd>
            </>
          )}
        </dl>
        <div className="mt-4">
          <ThemeSwitch />
        </div>
        {result.result === "linked" && (
          <p role="status" className="mt-3 text-xs text-ok">
            Ward is linked. You can sign in with it from now on.
          </p>
        )}
        {failure && (
          <p role="alert" className="mt-3 text-xs text-bad">
            {accountMessage(failure)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {ward.enabled && !linked && (
            <Button disabled={link.pending} onClick={() => void link.link()}>
              {link.pending ? "Opening Ward…" : "Link Ward"}
            </Button>
          )}
          <Button disabled={logout.pending} onClick={() => void logout.logout()}>
            Sign out
          </Button>
          {viaWard && (
            <Button disabled={wardSignOut.pending} onClick={() => void wardSignOut.signOut()}>
              Sign out of Ward too
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
