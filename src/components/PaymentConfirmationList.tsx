"use client";

import { PaymentButton } from "@/components/PaymentButton";
import { CopyButton } from "@/components/CopyButton";

type PendingPayment = {
  rsvpId: string;
  displayName: string;
  email: string;
  amount: number;
  dateSent: string | null;
};

type Props = {
  eventId: string;
  pendingPayments: PendingPayment[];
  confirmedTotal: number;
  labels: {
    title: string;
    count: string;
    confirmed: string;
    empty: string;
    confirm: string;
    working: string;
    error: string;
    updated: string;
    unknownAttendee: string;
    dateSent: string;
    copy: string;
    copied: string;
  };
};

export function PaymentConfirmationList({ eventId, pendingPayments, confirmedTotal, labels }: Props) {
  return (
    <section className="mt-10 rounded-2xl border border-line bg-bg2 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-2xl font-extrabold">{labels.title}</h2>
          <p className="mt-1 text-sm text-muted">{labels.confirmed.replace("{amount}", `$${confirmedTotal} CAD`)}</p>
        </div>
        <span className="rounded-full bg-teal/15 px-3 py-1 text-sm font-bold text-teal-d">{labels.count.replace("{count}", String(pendingPayments.length))}</span>
      </div>
      <div className="mt-5 grid gap-3">
        {pendingPayments.length > 0 ? pendingPayments.map((payment) => (
          <div key={payment.rsvpId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
            <div><p className="font-bold">{payment.displayName}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted"><span>{payment.email}</span>{payment.email && <CopyButton value={payment.email} label={labels.copy} copiedLabel={labels.copied} />}</div><p className="mt-1 text-sm font-bold text-ink">${payment.amount} CAD</p>{payment.dateSent && <p className="mt-1 text-xs text-muted">{(labels.dateSent ?? "Sent on {date}").replace("{date}", new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.dateSent)))}
</p>}</div>
            <PaymentButton eventId={eventId} rsvpId={payment.rsvpId} action="confirm" label={labels.confirm} working={labels.working} error={labels.error} success={labels.updated} />
          </div>
        )) : <p className="text-sm text-muted">{labels.empty}</p>}
      </div>
    </section>
  );
}
