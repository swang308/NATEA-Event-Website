"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  eventId: string;
  isRsvped: boolean;
  paymentStatus: "free" | "unpaid" | "pending" | "paid" | "refunded" | "cancel_requested" | null;
  priceCents: number;
  initialPlusOnes?: number;
  initialPlusOneName?: string | null;
  initialEtransferEmail?: string | null;
  showStatus?: boolean;
  labels: {
    rsvp: string;
    cancel: string;
    requestCancel: string;
    cancelConfirm: string;
    cancelPaidConfirm: string;
    cancelRequested: string;
    working: string;
    error: string;
    free: string;
    unpaid: string;
    pending: string;
    paid: string;
    refunded: string;
    bringGuest: string;
    guestName: string;
    guestNamePlaceholder: string;
    guestNote: string;
    guest: string;
    refundEmailTitle: string;
    refundEmailLabel: string;
    refundEmailPlaceholder: string;
    refundEmailRequired: string;
    confirmRefundRequest: string;
    back: string;
  };
};

export function RsvpButton({ eventId, isRsvped, paymentStatus, priceCents, initialPlusOnes = 0, initialPlusOneName = null, initialEtransferEmail = null, showStatus = true, labels }: Props) {
  const router = useRouter();
  const [rsvped, setRsvped] = useState(isRsvped);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(paymentStatus);
  const [plusOnes, setPlusOnes] = useState(initialPlusOnes);
  const [plusOneName, setPlusOneName] = useState(initialPlusOneName ?? "");
  const [refundEmail, setRefundEmail] = useState(initialEtransferEmail ?? "");
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const isPaidRsvp = currentPaymentStatus === "paid" || currentPaymentStatus === "pending";

  async function toggleRsvp() {
    setError("");
    // Cancelling
    if (rsvped) {
      // Paid / pending: first click shows the refund-email form
      if (isPaidRsvp && !showRefundForm) {
        setShowRefundForm(true);
        return;
      }
      if (isPaidRsvp) {
        if (!refundEmail || !refundEmail.includes("@")) {
          setError(labels.refundEmailRequired);
          return;
        }
      } else if (!window.confirm(labels.cancelConfirm)) {
        return;
      }
      setWorking(true);
      try {
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isPaidRsvp ? { action: "request-cancel", etransfer_email: refundEmail.trim() } : { action: "request-cancel" }),
        });
        const result = await response.json() as { error?: string; requested?: boolean };
        if (!response.ok) throw new Error(result.error || labels.error);
        if (result.requested) {
          setCurrentPaymentStatus("cancel_requested");
          setShowRefundForm(false);
        } else {
          setRsvped(false);
        }
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : labels.error);
      } finally {
        setWorking(false);
      }
      return;
    }
    // RSVPing
    setWorking(true);
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plus_ones: plusOnes,
          plus_one_name: plusOnes > 0 ? plusOneName.trim() || null : null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || labels.error);
      setRsvped(true);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.error);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      {!rsvped && priceCents > 0 && (
        <div className="mt-6 space-y-3 rounded-xl border border-line bg-bg2 p-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={plusOnes === 1}
              onChange={(event) => setPlusOnes(event.target.checked ? 1 : 0)}
              className="h-4 w-4 accent-teal"
            />
            {labels.bringGuest} (+${(priceCents / 100).toFixed(0)})
          </label>
          {plusOnes === 1 && (
            <input
              value={plusOneName}
              onChange={(event) => setPlusOneName(event.target.value)}
              placeholder={labels.guestNamePlaceholder}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-teal"
            />
          )}
          <p className="text-xs text-muted">{labels.guestNote}</p>
        </div>
      )}

      {showRefundForm ? (
        <div className="mt-3 space-y-3 rounded-xl border border-line bg-bg2 p-4">
          <p className="text-sm font-bold">{labels.refundEmailTitle}</p>
          <label className="block text-sm text-muted">{labels.refundEmailLabel}</label>
          <input
            type="email"
            value={refundEmail}
            onChange={(event) => setRefundEmail(event.target.value)}
            placeholder={labels.refundEmailPlaceholder}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-teal"
          />
          <div className="flex gap-3">
            <button onClick={toggleRsvp} disabled={working} className="rounded-full bg-teal px-5 py-3 font-bold text-white disabled:opacity-60">
              {working ? labels.working : labels.confirmRefundRequest}
            </button>
            <button onClick={() => setShowRefundForm(false)} className="rounded-full border border-line px-5 py-3 font-bold">
              {labels.back}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={toggleRsvp} disabled={working} className={`inline-flex justify-center rounded-full px-5 py-3.5 font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${rsvped ? "mt-3 w-auto border-0 bg-transparent px-0 py-1 text-sm text-muted underline underline-offset-4 hover:text-ink" : "mt-6 w-full bg-teal text-white hover:bg-teal-d"}`}>
          {working ? labels.working : rsvped ? (isPaidRsvp ? labels.requestCancel : labels.cancel) : labels.rsvp}
        </button>
      )}
      {showStatus && rsvped && <p className="mt-3 text-center text-sm font-medium text-green-d">
        {currentPaymentStatus === "free" ? labels.free : currentPaymentStatus === "paid" ? labels.paid : currentPaymentStatus === "refunded" ? labels.refunded : currentPaymentStatus === "pending" ? labels.pending : currentPaymentStatus === "cancel_requested" ? labels.cancelRequested : labels.unpaid}
      </p>}
      {showStatus && rsvped && plusOnes > 0 && (
        <p className="mt-3 text-center text-sm font-medium text-muted">
          {labels.guestName}: {plusOneName || "—"}
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}