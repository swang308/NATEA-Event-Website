"use client";

import { useState } from "react";

type Props = {
  eventId: string;
  totalCents: number;
  labels: {
    payByCard: string;
    payByCardWorking: string;
    payByCardError: string;
  };
};

export default function PayByCardButton({
  eventId,
  totalCents,
  labels,
}: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "checkout failed");
      }
      window.location.assign(data.url);
    } catch {
      setError(labels.payByCardError);
      setWorking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={working}
        style={{ background: "#2ea6b5", color: "#ffffff" }}
        className="w-full rounded-full px-5 py-3 text-sm font-bold disabled:opacity-60"
      >
        {working
          ? labels.payByCardWorking
          : `${labels.payByCard} — $${(totalCents / 100).toFixed(2)} CAD`}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
