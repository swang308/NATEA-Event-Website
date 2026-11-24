"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { LocationInput } from "@/components/LocationInput";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId?: string;
  initial?: {
    title: string; category: string; startsAt: string; endsAt: string; location: string;
    locationType: "in_person" | "online"; meetingUrl: string | null; priceCad: number;
    capacity: number; etransferEmail: string | null; paymentDeadline: string | null; description: string; agenda: string[]; status: "draft" | "pending" | "published" | "rejected"; imageUrl: string | null; includedText: string | null; whatToBring: string | null;
  };
  labels: {
    title: string;
    category: string;
    categories: Record<string, string>;
    date: string;
    endDate: string;
    location: string;
    locationType: string;
    inPerson: string;
    online: string;
    meetingUrl: string;
    locationPlaceholder: string;
    mapSetup: string;
    viewMap: string;
    price: string;
    capacity: string;
    etransferEmail: string;
    paymentDeadline: string;
    description: string;
    included: string;
    whatToBring: string;
    agenda: string;
    agendaTime: string;
    agendaTitle: string;
    addAgendaItem: string;
    removeAgendaItem: string;
    status: string;
    draft: string;
    published: string;
    pending: string;
    rejected: string;
    submitDraft: string;
    submitPending: string;
    submitPublished: string;
    working: string;
    error: string;
    success: string;
    image: string;
    imageHelp: string;
    imageTypeError: string;
    imageSizeError: string;
  };
};

export function EventForm({ labels, eventId, initial, canPublish = false }: Props & { canPublish?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"draft" | "pending" | "published">(initial?.status === "rejected" ? "pending" : initial?.status ?? (canPublish ? "published" : "draft"));
  const [locationType, setLocationType] = useState<"in_person" | "online">(initial?.locationType ?? "in_person");
  const [priceCad, setPriceCad] = useState(String(initial?.priceCad ?? 0));
  const [paymentDeadline, setPaymentDeadline] = useState(initial?.paymentDeadline ?? (initial?.priceCad ? defaultDeadline(initial.startsAt) : ""));
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(initial?.paymentDeadline));
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [agendaItems, setAgendaItems] = useState(() => initial?.agenda.map((item) => {
    const [time, ...title] = item.split(" — ");
    return { time: title.length ? time : "", title: title.length ? title.join(" — ") : item };
  }) ?? [{ time: "", title: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function defaultDeadline(startsAt: string) {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return "";
    const deadline = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const local = new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function handleStartChange(value: string) {
    if (!deadlineTouched && priceCad !== "0") setPaymentDeadline(defaultDeadline(value));
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000);
    setEndsAt(local.toISOString().slice(0, 16));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const startsAt = String(form.get("startsAt") || "");
      const endsAtRaw = String(form.get("endsAt") || "");
      const endsAt = endsAtRaw
        ? new Date(endsAtRaw).toISOString()
        : new Date(new Date(startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
      const submittedPaymentDeadline = priceCad === "0" ? null : paymentDeadline ? new Date(paymentDeadline).toISOString() : defaultDeadline(startsAt) ? new Date(defaultDeadline(startsAt)).toISOString() : null;
      const image = form.get("image");
      let imageUrl = initial?.imageUrl ?? null;
      if (image instanceof File && image.size > 0) {
        if (!image.type.startsWith("image/")) throw new Error(labels.imageTypeError);
        if (image.size > 5 * 1024 * 1024) throw new Error(labels.imageSizeError);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(labels.error);
        const path = `${user.id}/${crypto.randomUUID()}.${image.name.split(".").pop()?.toLowerCase() || "jpg"}`;
        const upload = await supabase.storage.from("event-images").upload(path, image, { upsert: false, contentType: image.type });
        if (upload.error) throw upload.error;
        imageUrl = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
      }
      const response = await fetch(eventId ? `/api/events/${eventId}` : "/api/events", {
        method: eventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          category: form.get("category"),
          startsAt: new Date(startsAt).toISOString(),
          endsAt,
          location: locationType === "online" ? "Online" : form.get("location"),
          locationType,
          meetingUrl: locationType === "online" ? form.get("meetingUrl") : null,
          priceCad: form.get("priceCad"),
          capacity: form.get("capacity"),
          etransferEmail: form.get("etransferEmail"),
          paymentDeadline: submittedPaymentDeadline,
          description: form.get("description"),
          includedText: form.get("includedText"),
          whatToBring: form.get("whatToBring"),
          agenda: agendaItems
            .filter((item) => item.title.trim())
            .map((item) => item.time.trim() ? `${item.time.trim()} — ${item.title.trim()}` : item.title.trim()),
          imageUrl,
          status,
        }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || labels.error);
      console.log("submit status:", status);
      router.push(status === "published" ? (eventId ? `/events/${eventId}` : `/events/${result.id}`) : "/my-events");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal";
  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block text-sm font-bold">{labels.title}<input name="title" required maxLength={200} defaultValue={initial?.title} className={fieldClass} /></label>
      <label className="block text-sm font-bold">{labels.category}<select name="category" required defaultValue={initial?.category ?? "Workshop"} className={`${fieldClass} bg-white`}><option value="Workshop">{labels.categories.Workshop}</option><option value="Panel">{labels.categories.Panel}</option><option value="Social">{labels.categories.Social}</option><option value="Study Group">{labels.categories["Study Group"]}</option></select></label>
      <label className="block text-sm font-bold">{labels.date}<input name="startsAt" required type="datetime-local" defaultValue={initial?.startsAt} onChange={(event) => handleStartChange(event.target.value)} className={fieldClass} /></label>
      <label className="block text-sm font-bold">{labels.endDate}<input name="endsAt" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={fieldClass} /></label>
      <fieldset><legend className="text-sm font-bold">{labels.locationType}</legend><div className="mt-2 flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="radio" name="locationType" checked={locationType === "in_person"} onChange={() => setLocationType("in_person")} />{labels.inPerson}</label><label className="flex items-center gap-2"><input type="radio" name="locationType" checked={locationType === "online"} onChange={() => setLocationType("online")} />{labels.online}</label></div></fieldset>
      {locationType === "in_person" ? (
        <LocationInput name="location" label={labels.location} placeholder={labels.locationPlaceholder} mapLabel={labels.viewMap} initialValue={initial?.location} />
      ) : (
        <label className="block text-sm font-bold">{labels.meetingUrl}<input name="meetingUrl" type="url" placeholder="https://zoom.us/j/..." defaultValue={initial?.meetingUrl ?? ""} className={fieldClass} /></label>
      )}
      <label className="block text-sm font-bold">{labels.image}<span className="mt-1 block text-xs font-normal text-muted">{labels.imageHelp}</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={`${fieldClass} bg-white`} /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold">{labels.price}<input name="priceCad" required min="0" step="1" type="number" value={priceCad} onChange={(event) => { setPriceCad(event.target.value); if (event.target.value === "0") setPaymentDeadline(""); else if (!deadlineTouched) { const startsInput = event.currentTarget.form?.elements.namedItem("startsAt"); if (startsInput instanceof HTMLInputElement) setPaymentDeadline(defaultDeadline(startsInput.value)); } }} className={fieldClass} /></label><label className="block text-sm font-bold">{labels.capacity}<input name="capacity" required min="2" step="1" type="number" defaultValue={initial?.capacity ?? 20} className={fieldClass} /></label></div>
      <label className="block text-sm font-bold">{labels.etransferEmail}<input name="etransferEmail" type="email" defaultValue={initial?.etransferEmail ?? ""} className={fieldClass} /></label>
      {priceCad !== "0" && <label className="block text-sm font-bold">{labels.paymentDeadline}<input name="paymentDeadline" required type="datetime-local" value={paymentDeadline} onChange={(event) => { setPaymentDeadline(event.target.value); setDeadlineTouched(true); }} className={fieldClass} /></label>}
      <label className="block text-sm font-bold">{labels.description}<textarea name="description" rows={5} defaultValue={initial?.description} className={fieldClass} /></label>
      <label className="block text-sm font-bold">{labels.included}<textarea name="includedText" rows={3} defaultValue={initial?.includedText ?? ""} className={fieldClass} /></label>
      <label className="block text-sm font-bold">{labels.whatToBring}<textarea name="whatToBring" rows={3} defaultValue={initial?.whatToBring ?? ""} className={fieldClass} /></label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">{labels.agenda}</legend>
        {agendaItems.map((item, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
            <input type="time" aria-label={labels.agendaTime} value={item.time} onChange={(event) => setAgendaItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, time: event.target.value } : current))} className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal" />
            <input type="text" aria-label={labels.agendaTitle} placeholder={labels.agendaTitle} value={item.title} onChange={(event) => setAgendaItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, title: event.target.value } : current))} className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal" />
            <button type="button" aria-label={labels.removeAgendaItem} disabled={agendaItems.length === 1} onClick={() => setAgendaItems((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-muted disabled:opacity-40">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setAgendaItems((items) => [...items, { time: "", title: "" }])} className="text-sm font-bold text-purple">+ {labels.addAgendaItem}</button>
      </fieldset>
      <fieldset><legend className="text-sm font-bold">{labels.status}</legend><div className="mt-2 flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="radio" name="status" checked={status === "draft"} onChange={() => setStatus("draft")} />{labels.draft}</label><label className="flex items-center gap-2"><input type="radio" name="status" checked={status === "pending"} onChange={() => setStatus("pending")} />{labels.pending}</label>{canPublish && <label className="flex items-center gap-2"><input type="radio" name="status" checked={status === "published"} onChange={() => setStatus("published")} />{labels.published}</label>}</div></fieldset>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button disabled={isSubmitting} className="w-full rounded-full bg-teal px-6 py-3.5 font-bold text-white transition hover:bg-teal-d disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? labels.working : status === "published" ? labels.submitPublished : status === "pending" ? labels.submitPending : labels.submitDraft}</button>
    </form>
  );
}