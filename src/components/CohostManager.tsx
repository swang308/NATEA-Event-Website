"use client";

import { useState } from "react";

type Host = {
  id: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: "creator" | "cohost";
  status: "accepted" | "pending";
};

export function CohostManager({
  eventId,
  isCreator,
  initialHosts,
}: {
  eventId: string;
  isCreator: boolean;
  initialHosts: Host[];
}) {
  const [hosts, setHosts] = useState(initialHosts);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite() {
    if (!email.includes("@")) {
      setMessage("Enter a valid email.");
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/events/${eventId}/cohosts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Could not send the invite.");
      return;
    }
    setEmail("");
    setMessage("Invite sent. They need to accept it by email before they can edit.");
    setHosts([...hosts, { id: data.cohostId, userId: null, email, displayName: null, role: "cohost", status: "pending" }]);
  }

  async function remove(cohostId: string) {
    if (!confirm("Remove this co-host?")) return;
    const res = await fetch(`/api/events/${eventId}/cohosts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohostId }),
    });
    if (!res.ok) return;
    setHosts(hosts.filter((h) => h.id !== cohostId));
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-5">
      <h2 className="text-lg font-bold">Hosts</h2>
      <ul className="mt-3 space-y-2">
        {hosts.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {h.displayName || h.email}
              {h.role === "creator" ? " — Creator (collects payments)" : " — Co-host"}
              {h.status === "pending" ? " (invite pending)" : ""}
            </span>
            {isCreator && h.role === "cohost" && (
              <button type="button" onClick={() => remove(h.id)} className="text-red-600 underline">
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {isCreator && (
        <div className="mt-4">
          <label className="text-sm font-bold" htmlFor="cohost-email">Invite a co-host by email</label>
          <div className="mt-2 flex gap-2">
            <input
              id="cohost-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2"
            />
            <button type="button" onClick={invite} disabled={busy} className="rounded-full bg-teal-600 px-5 py-2 font-bold text-white disabled:opacity-50">
              {busy ? "Sending…" : "Invite"}
            </button>
          </div>
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        </div>
      )}
    </div>
  );
}