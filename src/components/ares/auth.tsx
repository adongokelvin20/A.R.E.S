"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, Check, ArrowLeft } from "lucide-react";
import { AresLogo } from "./logo";

type Mode = "login" | "signup";

export function AresAuth({ initialMode = "signup" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After successful auth, the server will redirect to "/" which renders the app shell.
  // We use a full-page redirect (not reload) so the URL is clean.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (!ownerName.trim() || !businessName.trim() || !email.trim()) {
        setError("Please fill in all fields.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, ownerName, businessName }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Signup failed");

        // Auto sign-in, then redirect to the app
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInRes?.error) throw new Error("Account created, but auto sign-in failed. Please log in.");
        // Full redirect to root -- server will render the app shell + onboarding
        window.location.href = "/";
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong");
        setLoading(false);
      }
      return;
    }

    // login
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-ares-mist via-white to-ares-foam px-4 py-10">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-ares-sea/10 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-ares-sea-deep/10 blur-3xl" />
        <div className="absolute inset-0 ares-grid-bg opacity-40" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to site link */}
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-ares-sea-deep"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Kevtech
        </a>

        <div className="overflow-hidden rounded-3xl border border-ares-line bg-white shadow-[0_30px_80px_-40px_rgba(11,31,51,0.25)]">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-ares-sea via-ares-sea-deep to-ares-navy" />
          <div className="p-6 sm:p-8">
            {/* Brand */}
            <div className="flex flex-col items-center text-center">
              <AresLogo className="h-14 w-14" />
              <div className="mt-3">
                <div className="font-mono text-lg font-bold tracking-[0.18em] text-ares-navy">Kevtech</div>
                <div className="text-[10px] tracking-wide text-muted-foreground">
                  AUTOMATED ROUTING &amp; EXECUTION SYSTEM
                </div>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-ares-navy">
                {mode === "signup" ? "Create your workspace" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "signup"
                  ? "Your AI employee is one signup away."
                  : "Sign in to your command center."}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-ares-mist p-1">
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  mode === "signup" ? "bg-white text-ares-navy shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  mode === "login" ? "bg-white text-ares-navy shadow-sm" : "text-muted-foreground"
                }`}
              >
                Log in
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              {mode === "signup" && (
                <>
                  <Field
                    label="Your name"
                    type="text"
                    value={ownerName}
                    onChange={setOwnerName}
                    placeholder="e.g. Sarah Mensah"
                    autoComplete="name"
                  />
                  <Field
                    label="Business name"
                    type="text"
                    value={businessName}
                    onChange={setBusinessName}
                    placeholder="e.g. Accra Threads Co."
                    autoComplete="organization"
                  />
                </>
              )}
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@business.com"
                autoComplete="email"
              />

              {/* Password with visibility toggle */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ares-navy">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ares-sea-deep"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ares-navy">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ares-sea-deep"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && password === confirm && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600">
                      <Check className="h-3 w-3" /> Passwords match
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ares-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ares-sea-deep disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create workspace" : "Log in"}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              {mode === "signup" ? (
                <>Already have an account? <button onClick={() => setMode("login")} className="font-semibold text-ares-sea-deep hover:underline">Log in</button></>
              ) : (
                <>New to Kevtech? <button onClick={() => setMode("signup")} className="font-semibold text-ares-sea-deep hover:underline">Create a workspace</button></>
              )}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="font-semibold text-ares-sea-deep hover:underline">Terms</Link>
          {" "}and{" "}
          <Link href="/legal/privacy" className="font-semibold text-ares-sea-deep hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ares-navy">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
      />
    </div>
  );
}
