alter table public.events
  add column if not exists payment_deadline timestamptz;

alter table public.rsvps
  add column if not exists payment_reminder_sent_at timestamptz;
