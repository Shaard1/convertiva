import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthResult = {
  error: string | null;
  success?: string | null;
};

const AUTH_REQUEST_TIMEOUT_MS = 10000;

function getSiteUrl() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

function toFriendlyAuthError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("email address not authorized")) {
    return "This email is not allowed by the current Supabase email settings. Add custom SMTP or invite this email to your Supabase project team.";
  }

  if (
    lowerMessage.includes("error sending confirmation email") ||
    lowerMessage.includes("smtp") ||
    lowerMessage.includes("email provider")
  ) {
    return "Supabase could not send the confirmation email. Check your SMTP settings or turn custom SMTP off while testing.";
  }

  if (lowerMessage.includes("signup") && lowerMessage.includes("disabled")) {
    return "Email signups are disabled in Supabase Auth settings.";
  }

  if (lowerMessage.includes("rate limit")) {
    return "Too many email attempts. Please wait a moment and try again.";
  }

  if (lowerMessage.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (lowerMessage.includes("already registered")) {
    return "This email is already registered.";
  }

  if (lowerMessage.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  return message || "Something went wrong. Please try again.";
}

async function withAuthTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(timeoutMessage));
      }
    }, AUTH_REQUEST_TIMEOUT_MS);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(error);
        }
      });
  });
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured yet. Add your environment variables to enable sign in.",
    };
  }

  try {
    const { error } = await withAuthTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      "Sign in is taking longer than expected. Please try again.",
    );
    return { error: error ? toFriendlyAuthError(error.message) : null };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn't sign you in right now. Please try again.",
    };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured yet. Add your environment variables to enable sign up.",
    };
  }

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });
    if (error) {
      return { error: toFriendlyAuthError(error.message) };
    }

    return {
      error: null,
      success:
        "Convertly Image sent a confirmation link to your email. Open it to finish creating your account.",
    };
  } catch {
    return { error: "We couldn't create your account right now. Please try again." };
  }
}

export async function signInWithOAuth(
  provider: "google",
): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured yet. Add your environment variables to enable social login.",
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    return { error: error ? toFriendlyAuthError(error.message) : null };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function sendPasswordResetEmail(email: string): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured yet. Add your environment variables to enable password reset.",
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });

    if (error) {
      return { error: "Unable to reset password. Please try again." };
    }

    return {
      error: null,
      success: "Password reset link sent. Please check your email.",
    };
  } catch {
    return { error: "Unable to reset password. Please try again." };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured yet. Add your environment variables to update your password.",
    };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: "Unable to reset password. Please try again." };
    }

    return { error: null, success: "Password updated successfully. You can now log in." };
  } catch {
    return { error: "Unable to reset password. Please try again." };
  }
}

export async function signOutUser(): Promise<AuthResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  } catch {
    return { error: "We couldn't log you out right now. Please try again." };
  }
}
