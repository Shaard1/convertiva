"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePassword(password);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(result.success ?? "Password updated successfully. You can now log in.");
      setTimeout(() => {
        router.replace("/");
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
      <div className="w-full rounded-3xl border bg-[var(--card)] p-8">
        <p className="text-sm font-medium text-[var(--primary)]">Reset password</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
          Choose a new password
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Enter your new password and confirm it below.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                className="w-full rounded-2xl border bg-[var(--card-muted)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                className="w-full rounded-2xl border bg-[var(--card-muted)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--background-secondary)] px-4 py-3 text-sm text-[var(--foreground)]">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
