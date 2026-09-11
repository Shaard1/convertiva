"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, Subscription } from "@supabase/supabase-js";
import {
  AUTH_SESSION_CHANGED_EVENT,
  hasStoredSupabaseSession,
} from "@/lib/auth-session-client";
import {
  getAuthenticatedUsage,
  getGuestUsage,
  getSyncedGuestUsage,
} from "@/lib/usage";
import { AuthUser } from "@/types/auth";
import { UserUsage } from "@/types/usage";

function mapSupabaseUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
  };
}

export function useAppShellState() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    const guestUsage = getGuestUsage();
    setUsage(guestUsage);

    let isMounted = true;
    let subscription: Subscription | undefined;
    let synchronizedUserId: string | null | undefined;
    let authInitialized = false;

    async function synchronizeSession(session: Session | null) {
      const authUser = mapSupabaseUser(session);
      const userId = authUser?.id ?? null;
      if (!isMounted || synchronizedUserId === userId) {
        return;
      }

      synchronizedUserId = userId;
      setUser(authUser);

      if (authUser) {
        try {
          setUsage(await getAuthenticatedUsage(authUser));
        } catch {
          setUsage(guestUsage);
        }
        return;
      }

      const synchronizedGuestUsage = await getSyncedGuestUsage();

      if (isMounted) {
        setUsage(synchronizedGuestUsage);
      }
    }

    async function initializeAuth() {
      if (authInitialized) return;
      authInitialized = true;

      const { getSupabaseBrowserClient } = await import("@/lib/supabase");
      if (!isMounted) return;

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        await synchronizeSession(null);
        return;
      }

      const listener = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, nextSession) => {
          void synchronizeSession(nextSession);
        },
      );
      subscription = listener.data.subscription;

      const session = (await supabase.auth.getSession()).data.session;
      await synchronizeSession(session);
    }

    async function initializeSession() {
      if (hasStoredSupabaseSession()) {
        await initializeAuth();
        return;
      }

      await synchronizeSession(null);
    }

    function handleAuthSessionChange() {
      synchronizedUserId = undefined;
      void initializeAuth();
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChange);

    const initialize = () => void initializeSession();
    const supportsIdleCallback = typeof window.requestIdleCallback === "function";
    const initializationId = supportsIdleCallback
      ? window.requestIdleCallback(initialize, { timeout: 1_200 })
      : window.setTimeout(initialize, 0);

    return () => {
      isMounted = false;
      if (supportsIdleCallback) {
        window.cancelIdleCallback(initializationId);
      } else {
        window.clearTimeout(initializationId);
      }
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChange);
      subscription?.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { signOutUser } = await import("@/lib/auth");
    await signOutUser();
    setUser(null);
    setUsage(await getSyncedGuestUsage());
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function closeAuth() {
    setAuthModalOpen(false);
  }

  return {
    authModalOpen,
    authMode,
    closeAuth,
    handleLogout,
    openAuth,
    setUsage,
    usage,
    user,
  };
}
