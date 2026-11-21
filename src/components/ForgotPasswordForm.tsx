"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Labels = {
  email: string; submit: string; sending: string; sent: string; backToLogin: string;
};

export function ForgotPasswordForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback?next=/${locale}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      window.location.assign(`/${locale}/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return <p role="status" className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{labels.sent}</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-bold">
          {labels.email}
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-teal" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold !text-white transition hover:bg-teal-d disabled:opacity-60">
          {isSubmitting ? labels.sending : labels.submit}
        </button>
      </form>
      <Link href={`/${locale}/login`} className="mt-6 inline-block text-sm font-bold text-teal-d">{labels.backToLogin}</Link>
    </>
  );
}
