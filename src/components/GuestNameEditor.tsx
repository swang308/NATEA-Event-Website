"use client";

import { useState } from "react";

type Props = {
  eventId: string;
  initialName: string | null;
  labels: {
    guestName: string;
    guestNamePlaceholder: string;
    editGuest: string;
    saveGuest: string;
    cancelEdit: string;
    error: string;
  };
};

export function GuestNameEditor({ eventId, initialName, labels }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [draft, setDraft] = useState(initialName ?? "");
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setWorking(true);
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-guest", plus_one_name: draft.trim() || null }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || labels.error);
      setName(draft.trim());
      setEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.error);
    } finally {
      setWorking(false);
    }
  }

  if (!editing) {
    return (
      <p className="mt-1 text-sm text-muted">
        {labels.guestName}: {name || "—"}{" "}
        <button onClick={() => { setDraft(name); setEditing(true); }} className="font-bold text-teal-d underline underline-offset-4">{labels.editGuest}</button>
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={labels.guestNamePlaceholder}
        className="w-full rounded-xl border border-line bg-white px-4 py-2 text-sm outline-none focus:border-teal"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={working} className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{labels.saveGuest}</button>
        <button onClick={() => { setDraft(name); setEditing(false); }} className="rounded-full border border-line px-4 py-2 text-sm font-bold">{labels.cancelEdit}</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
