"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setError("Supabase is not configured. Please check your environment variables.");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");

      if (errorDescription) {
        setError("Something went wrong. Please try again.");
        return;
      }

      if (!code) {
        router.replace("/");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError("Something went wrong. Please try again.");
        return;
      }

      router.replace("/");
    }

    handleCallback();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
      <div className="w-full rounded-3xl border bg-[var(--card)] p-8 text-center">
        {error ? (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Completing sign in...
          </div>
        )}
      </div>
    </main>
  );
}
