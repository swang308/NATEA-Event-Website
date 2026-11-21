"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AuthFormLabels = {
  displayName: string;
  email: string;
  password: string;
  language: string;
  english: string;
  chinese: string;
  submit: string;
  working: string;
  error: string;
  confirmation: string;
  google: string;
  googleWorking: string;
};

type AuthFormProps = {
  mode: "login" | "signup";
  locale: string;
  labels: AuthFormLabels;
};

export function AuthForm({ mode, locale, labels }: AuthFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(locale === "zh-TW" ? "zh-TW" : "en");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConfirmation("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName, preferred_language: preferredLanguage } },
          })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (mode === "signup") {
        window.location.assign(`/${locale}`);
      } else {
        window.location.assign(`/${locale}`);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleSubmitting(true);

    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.error);
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-4 text-left">
      <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting} className="w-full rounded-full border border-line px-6 py-3.5 font-bold text-ink transition hover:border-teal hover:text-teal-d disabled:cursor-not-allowed disabled:opacity-60">
        {isGoogleSubmitting ? labels.googleWorking : labels.google}
      </button>
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block text-sm font-bold">
            {labels.displayName}
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
          </label>
        )}
        <label className="block text-sm font-bold">
          {labels.email}
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        <label className="block text-sm font-bold">
          {labels.password}
          <input required minLength={6} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        {mode === "signup" && (
          <label className="block text-sm font-bold">
            {labels.language}
            <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 font-normal outline-none focus:border-teal">
              <option value="en">{labels.english}</option>
              <option value="zh-TW">{labels.chinese}</option>
            </select>
          </label>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {confirmation && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{confirmation}</p>}
        <button disabled={isSubmitting} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold !text-white transition hover:bg-teal-d disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? labels.working : labels.submit}
        </button>
      </form>
    </div>
  );
}
