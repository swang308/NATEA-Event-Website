"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Labels = {
  password: string; confirmPassword: string; submit: string; saving: string;
  mismatch: string; success: string; invalidLink: string; backToLogin: string;
};

export function ResetPasswordForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(labels.mismatch);
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "recovery" });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.invalidLink);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return <p role="status" className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{labels.success}</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-bold">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        <label className="block text-sm font-bold">
          Reset code
          <input required inputMode="numeric" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="12345678" className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal tracking-widest outline-none focus:border-teal" />
        </label>
        <label className="block text-sm font-bold">
          {labels.password}
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        <label className="block text-sm font-bold">
          {labels.confirmPassword}
          <input required minLength={6} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold !text-white transition hover:bg-teal-d disabled:opacity-60">
          {isSubmitting ? labels.saving : labels.submit}
        </button>
      </form>
      <Link href={`/${locale}/login`} className="mt-6 inline-block text-sm font-bold text-teal-d">{labels.backToLogin}</Link>
    </>
  );
}
