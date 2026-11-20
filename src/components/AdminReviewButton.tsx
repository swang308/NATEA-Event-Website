"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type Props = { eventId: string; approveLabel: string; rejectLabel: string; reasonPlaceholder: string; working: string; error: string };

export function AdminReviewButton({ eventId, approveLabel, rejectLabel, reasonPlaceholder, working, error }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  async function review(action: "approve" | "reject") {
    const reason = action === "reject" ? window.prompt(reasonPlaceholder)?.trim() : "";
    if (action === "reject" && !reason) return;
    setIsWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || error);
      router.refresh();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : error);
    } finally {
      setIsWorking(false);
    }
  }

  return <div><div className="flex flex-wrap gap-2"><button type="button" disabled={isWorking} onClick={() => review("approve")} className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isWorking ? working : approveLabel}</button><button type="button" disabled={isWorking} onClick={() => review("reject")} className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-60">{rejectLabel}</button></div>{message && <p role="alert" className="mt-2 text-xs text-red-700">{message}</p>}</div>;
}
