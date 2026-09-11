export const AUTH_SESSION_CHANGED_EVENT = "convertiva:auth-session-changed";

export function hasStoredSupabaseSession() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || typeof window === "undefined") return false;

  try {
    const projectReference = new URL(supabaseUrl).hostname.split(".")[0];
    return Boolean(
      projectReference &&
        window.localStorage.getItem(`sb-${projectReference}-auth-token`),
    );
  } catch {
    return false;
  }
}

export function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
