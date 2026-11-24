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

  const acceptedHosts = hosts.filter((h) => h.status === "accepted");
  const pendingHosts = hosts.filter((h) => h.status === "pending");

  return (
    <div>
      <p className="text-sm text-muted">Hosts</p>
      <p className="mt-1 font-bold text-ink">
        {acceptedHosts.map((h) => h.displayName || h.email).join(" & ")}
      </p>
      {pendingHosts.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          Invite pending: {pendingHosts.map((h) => h.email).join(", ")}
        </p>
      )}
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
          {acceptedHosts.filter((h) => h.role === "cohost").length > 0 && (
            <ul className="mt-3 space-y-1">
              {acceptedHosts.filter((h) => h.role === "cohost").map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{h.displayName || h.email}</span>
                  <button type="button" onClick={() => remove(h.id)} className="text-red-600 underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}