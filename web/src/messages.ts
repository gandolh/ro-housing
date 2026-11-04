import type { AuthError } from '../vendor/ward/ward-auth-react.js';

/** The app's words for the codes the auth hooks hand back. */

const UNREACHABLE = "ro-housing can't be reached. Check your connection and try again.";

function waitText(seconds: number): string {
  if (seconds < 90) {
    const whole = Math.max(1, Math.ceil(seconds));
    return `${whole} ${whole === 1 ? 'second' : 'seconds'}`;
  }
  return `${Math.ceil(seconds / 60)} minutes`;
}

export function loginMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Wrong username or password.';
    case 'too_many_attempts':
      return error.retryAfterSeconds === undefined
        ? 'Too many tries. Wait a few minutes, then try again.'
        : `Too many tries. Wait ${waitText(error.retryAfterSeconds)}, then try again.`;
    case 'cross_site':
      return 'Open ro-housing from its own address to sign in.';
    case 'network':
      return UNREACHABLE;
    default:
      return "Couldn't sign in. Try again.";
  }
}

export function wardSignInMessage(error: AuthError): string {
  switch (error.code) {
    case 'access_denied':
      return "Ward didn't let you in to ro-housing. Sign in with your password, or grant ro-housing to your account in Ward.";
    case 'ward_unavailable':
      return "Ward isn't answering. Sign in with your password instead.";
    case 'ward_misconfigured':
      return "Sign in with Ward isn't set up right on this server. Sign in with your password.";
    case 'invalid_callback':
      return 'That Ward sign-in expired. Try again.';
    case 'network':
      return UNREACHABLE;
    default:
      return "Couldn't sign in with Ward. Try again, or sign in with your password.";
  }
}

/** Why the last session ended, on the login page. Nothing for a plain sign-out. */
export function sessionReasonMessage(reason: string | undefined): string | null {
  switch (reason) {
    case 'ward_unavailable':
      return 'Ward is unreachable right now, so your Ward sign-in has paused. Sign in with your password.';
    case 'ward_session_ended':
      return 'Your Ward session ended. Sign in again.';
    case 'ward_misconfigured':
      return "Sign in with Ward isn't set up right on this server. Sign in with your password.";
    default:
      return null;
  }
}

export function accountMessage(error: AuthError): string {
  switch (error.code) {
    case 'already_linked':
      return 'A Ward account is already linked.';
    case 'ward_account_in_use':
      return 'That Ward account is linked to another ro-housing user.';
    case 'access_denied':
      return "Ward didn't let you in to ro-housing. Grant ro-housing to your account in Ward, then try again.";
    case 'invalid_callback':
      return 'That Ward sign-in expired. Try again.';
    case 'ward_unavailable':
      return "Ward isn't answering right now. Try again later.";
    case 'ward_misconfigured':
      return "Ward isn't set up right on this server. Check the WARD_OIDC settings.";
    case 'unauthorized':
      return 'Your session ended. Sign in again.';
    case 'network':
      return UNREACHABLE;
    default:
      return "That didn't work. Try again.";
  }
}
