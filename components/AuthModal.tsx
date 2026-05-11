"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Mail, X } from "lucide-react";
import {
  sendPasswordResetEmail,
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/auth";

type AuthModalProps = {
  isOpen: boolean;
  mode: "login" | "signup";
  onClose: () => void;
};

type AuthMode = "login" | "signup" | "forgot";

export function AuthModal({ isOpen, mode, onClose }: AuthModalProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveMode(mode);
    setError(null);
    setSuccess(null);
  }, [mode]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const modalTitle = useMemo(() => {
    if (activeMode === "forgot") {
      return "Reset your password";
    }

    return activeMode === "login"
      ? "Log in to unlock more conversions"
      : "Sign up for higher daily limits";
  }, [activeMode]);

  const googleButtonLabel = "Continue with Google";

  function validateForm(): string | null {
    if (!email || (activeMode !== "forgot" && !password)) {
      return activeMode === "forgot"
        ? "Please enter your email address."
        : "Please enter your email and password.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return "Please enter a valid email address.";
    }

    if (activeMode === "forgot") {
      return null;
    }

    if (password.length < 6) {
      return "Use at least 6 characters for your password.";
    }

    if (activeMode === "signup" && password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function handleGoogleLogin() {
    setError(null);
    setSuccess(null);
    setIsGoogleLoading(true);
    const result = await signInWithOAuth("google");
    setIsGoogleLoading(false);

    if (result.error) {
      setError(result.error);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeMode === "forgot") {
        const result = await sendPasswordResetEmail(email);

        if (result.error) {
          setError(result.error);
          return;
        }

        setSuccess(result.success ?? "Password reset link sent. Please check your email.");
        return;
      }

      const result =
        activeMode === "login"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (activeMode === "signup") {
        setSuccess(
          result.success ??
            "Convertly Image sent a confirmation link to your email.",
        );
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/30 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border bg-[var(--card)] shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:rounded-[2rem]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[var(--card)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-sm font-medium text-[var(--primary)]">
              {activeMode === "login"
                ? "Welcome back"
                : activeMode === "signup"
                  ? "Create your account"
                  : "Forgot password"}
            </p>
            <h2
              id="auth-modal-title"
              className="mt-2 text-2xl font-semibold text-[var(--foreground)]"
            >
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {activeMode !== "forgot" ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border bg-[var(--card-muted)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {googleButtonLabel}
              </button>
              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </div>
          ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border bg-[var(--card-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
            />
          </div>

          {activeMode !== "forgot" ? (
            <div>
              <label htmlFor="auth-password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={activeMode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl border bg-[var(--card-muted)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {activeMode === "signup" ? (
            <div>
              <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-medium">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Repeat your password"
                  className="w-full rounded-2xl border bg-[var(--card-muted)] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
            >
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
            disabled={isSubmitting || isGoogleLoading}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#3E5F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4A35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E5F44] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {activeMode === "forgot"
                  ? "Sending reset link..."
                  : activeMode === "login"
                    ? "Logging in..."
                    : "Signing up..."}
              </>
            ) : activeMode === "forgot" ? (
              "Send reset link"
            ) : activeMode === "login" ? (
              "Log in"
            ) : (
              "Sign up"
            )}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
          {activeMode === "login" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveMode("signup");
                  setError(null);
                  setSuccess(null);
                }}
                className="transition hover:text-[var(--foreground)]"
              >
                Need an account? Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode("forgot");
                  setError(null);
                  setSuccess(null);
                }}
                className="transition hover:text-[var(--foreground)]"
              >
                Forgot password?
              </button>
            </>
          ) : null}

          {activeMode === "signup" ? (
            <button
              type="button"
              onClick={() => {
                setActiveMode("login");
                setError(null);
                setSuccess(null);
              }}
              className="transition hover:text-[var(--foreground)]"
            >
              Already have an account? Log in
            </button>
          ) : null}

          {activeMode === "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setActiveMode("login");
                setError(null);
                setSuccess(null);
              }}
              className="transition hover:text-[var(--foreground)]"
            >
              Back to login
            </button>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
