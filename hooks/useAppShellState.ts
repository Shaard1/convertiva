"use client";

import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { signOutUser } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";
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

    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    async function initializeUsage() {
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;

      if (!isMounted) {
        return;
      }

      const authUser = mapSupabaseUser(session);
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

    void initializeUsage();

    const listener = supabase?.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, nextSession) => {
        const authUser = mapSupabaseUser(nextSession);

        if (!isMounted) {
          return;
        }

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
      },
    );

    return () => {
      isMounted = false;
      listener?.data.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
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
