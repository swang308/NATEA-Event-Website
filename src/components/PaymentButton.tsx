"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  eventId: string;
  rsvpId: string;
  action: "mark-sent" | "confirm" | "refund";
  label: string;
  working: string;
  error: string;
  success: string;
  confirmation?: string;
};

export function PaymentButton({ eventId, rsvpId, action, label, working, error, success, confirmation }: Props) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  async function submit() {
    if (confirmation && !window.confirm(confirmation)) return;
    setIsWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rsvpId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || error);
      setCompleted(true);
      router.refresh();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : error);
    } finally {
      setIsWorking(false);
    }
  }

  return <div>{completed ? <p role="status" className="rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-800">{success}</p> : <button type="button" onClick={submit} disabled={isWorking} className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-d disabled:opacity-60">{isWorking ? working : label}</button>}{message && <p role="alert" className="mt-2 text-xs text-red-700">{message}</p>}</div>;
}
