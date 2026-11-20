"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  eventId: string;
  label: string;
  confirmation: string;
  working: string;
  error: string;
};

export function DeleteEventButton({ eventId, label, confirmation, working, error }: Props) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteEvent() {
    if (!window.confirm(confirmation)) return;
    setIsWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || error);
      router.push("/my-events");
      router.refresh();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : error);
      setIsWorking(false);
    }
  }

  return <div><button type="button" onClick={deleteEvent} disabled={isWorking} className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60">{isWorking ? working : label}</button>{message && <p role="alert" className="mt-2 text-xs text-red-700">{message}</p>}</div>;
}
