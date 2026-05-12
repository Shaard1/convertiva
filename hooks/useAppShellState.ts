"use client";

import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { signOutUser } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAuthenticatedUsage, getGuestUsage } from "@/lib/usage";
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

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      const authUser = mapSupabaseUser(data.session);
      setUser(authUser);
      if (!authUser) {
        return;
      }

      getAuthenticatedUsage(authUser)
        .then(setUsage)
        .catch(() => setUsage(guestUsage));
    });

    const listener = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session) => {
        const authUser = mapSupabaseUser(session);
        setUser(authUser);

        if (!authUser) {
          setUsage(getGuestUsage());
          return;
        }

        try {
          setUsage(await getAuthenticatedUsage(authUser));
        } catch {
          setUsage(guestUsage);
        }
      },
    );

    return () => {
      isMounted = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    setUsage(getGuestUsage());
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
