alter table public.rsvps
  add column if not exists paid_at timestamptz;
