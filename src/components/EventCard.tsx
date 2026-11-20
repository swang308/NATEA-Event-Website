import { Link } from "@/i18n/navigation";
import type { PublicEvent } from "@/lib/events";

export type EventCardLabels = {
  going: string;
  open: string;
  spots: string;
  details: string;
  free: string;
  categories: Record<PublicEvent["category"], string>;
};

type Props = {
  event: PublicEvent;
  locale: string;
  labels: EventCardLabels;
};

const colors = {
  Workshop: "bg-[linear-gradient(120deg,#2ea6b5,#1f7f8c)]",
  Panel: "bg-[linear-gradient(120deg,#8e3aa3,#5e1f6e)]",
  Social: "bg-[linear-gradient(120deg,#a5cf4a,#6f9a1d)]",
  "Study Group": "bg-[linear-gradient(120deg,#2ea6b5,#7b2d8e)]",
};

export function EventCard({ event, locale, labels }: Props) {
  const date = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.starts_at));
  const dateParts = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-CA", {
    month: "short",
    day: "2-digit",
  }).formatToParts(new Date(event.starts_at));
  const day = dateParts.find((part) => part.type === "day")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value.toUpperCase();
  const spots = event.capacity - event.attendee_count;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className={`${event.image_url ? "" : colors[event.category]} relative h-36 bg-cover bg-center p-5 text-white`} style={event.image_url ? { backgroundImage: `linear-gradient(120deg, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0.55)), url("${event.image_url}")` } : undefined}>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">{labels.categories[event.category]}</span>
        <div className="absolute bottom-5 left-5 rounded-xl bg-white px-3 py-2 text-center text-ink shadow">
          <strong className="display block text-2xl leading-6">{day}</strong>
          <span className="text-[10px] font-bold tracking-widest">{month}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="display text-xl font-bold leading-snug">{event.title}</h3>
        <p className="mt-4 text-sm text-muted line-clamp-2">{date}<br />{event.location_type === "online" ? (locale === "zh-TW" ? "線上" : "Online") : event.location}</p>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="font-medium text-muted">● {labels.going.replace("{count}", String(event.attendee_count))}</span>
          <span className="font-bold text-teal-d">{event.price_cad === 0 ? labels.free : `$${event.price_cad}`}</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted">
          <span>{spots > 0 ? labels.spots.replace("{count}", String(spots)) : labels.open}</span>
          <Link href={`/events/${event.id}`} className="font-bold text-purple">{labels.details}</Link>
        </div>
      </div>
    </article>
  );
}
