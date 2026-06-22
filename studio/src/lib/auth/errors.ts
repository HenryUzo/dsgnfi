function includesMessage(error: string, fragment: string) {
  return error.toLowerCase().includes(fragment.toLowerCase());
}

export function mapSupabaseAuthError(message: string) {
  if (includesMessage(message, "invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (includesMessage(message, "email not confirmed")) {
    return "Your email is not confirmed yet. Check your inbox before signing in.";
  }

  if (includesMessage(message, "user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (includesMessage(message, "password should be at least")) {
    return "Your password does not meet Supabase security requirements.";
  }

  if (includesMessage(message, "signup is disabled")) {
    return "Signup is disabled for this Supabase project.";
  }

  if (includesMessage(message, "rate limit")) {
    return "Too many authentication attempts. Wait a moment and try again.";
  }

  return message;
}

export function mapAuthQueryMessage(code: string | null | undefined) {
  switch (code) {
    case "logout_failed":
      return "Logout failed. Please try again.";
    case "missing_env":
      return "Supabase environment variables are missing. Update .env.local before testing auth.";
    case "session_fetch_failed":
      return "Supabase could not verify the current session. Please sign in again.";
    case "auth_callback_failed":
      return "The authentication callback could not complete. Try signing in again.";
    case "recovery_link_invalid":
      return "The password recovery link is missing or invalid.";
    case "signed_out":
      return "You have been signed out.";
    case "password_updated":
      return "Your password has been updated. Sign in with the new password.";
    default:
      return null;
  }
}
