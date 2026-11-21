"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export const instant = false;

export default function ResetPasswordPage() {
  const t = useTranslations("Routes.resetPassword");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("invalidLink"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("description")}</p>
      {success ? (
        <p role="status" className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{t("success")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold">
            {t("password")}
            <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
          </label>
          <label className="block text-sm font-bold">
            {t("confirmPassword")}
            <input required minLength={6} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={isSubmitting} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold !text-white transition hover:bg-teal-d disabled:opacity-60">
            {isSubmitting ? t("saving") : t("submit")}
          </button>
        </form>
      )}
      <Link href="/en/login" className="mt-6 inline-block text-sm font-bold text-teal-d">{t("backToLogin")}</Link>
    </main>
  );
}
