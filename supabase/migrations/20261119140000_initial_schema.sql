create extension if not exists pgcrypto;

create type public.user_role as enum ('member', 'admin');
create type public.site_language as enum ('en', 'zh-TW');
create type public.event_category as enum ('Workshop', 'Panel', 'Social', 'Study Group');
create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.payment_status as enum ('free', 'unpaid', 'pending', 'paid');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  email text not null unique,
  avatar_url text,
  role public.user_role not null default 'member',
  preferred_language public.site_language not null default 'en',
  etransfer_email text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id),
  title text not null check (char_length(trim(title)) between 1 and 200),
  category public.event_category not null,
  description text not null default '',
  agenda text[] not null default '{}',
  starts_at timestamptz not null,
  location text not null,
  price_cad integer not null default 0 check (price_cad >= 0),
  capacity integer not null check (capacity >= 2),
  etransfer_email text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  payment_status public.payment_status not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.email_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  announce boolean not null default true,
  rsvp_confirm boolean not null default true,
  payment_reminder boolean not null default true,
  reminder_24h boolean not null default true
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(trim(email)) between 3 and 320),
  name text,
  preferred_language public.site_language not null default 'en',
  subscribed_at timestamptz not null default now(),
  source text not null default 'home-newsletter'
);

create index rsvps_event_id_idx on public.rsvps (event_id);
create index rsvps_user_id_idx on public.rsvps (user_id);
create index events_organizer_id_idx on public.events (organizer_id);
create index events_starts_at_idx on public.events (starts_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  selected_language public.site_language := case
    when new.raw_user_meta_data ->> 'preferred_language' = 'zh-TW' then 'zh-TW'::public.site_language
    else 'en'::public.site_language
  end;
begin
  insert into public.profiles (id, display_name, email, avatar_url, preferred_language)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    selected_language
  );
  insert into public.email_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_rsvp_payment_status()
returns trigger
language plpgsql
as $$
declare
  event_record public.events%rowtype;
  attendee_count integer;
begin
  select * into event_record from public.events where id = new.event_id for update;
  if event_record.id is null then
    raise exception 'Event does not exist';
  end if;
  if event_record.status <> 'published' or event_record.starts_at <= now() then
    raise exception 'RSVPs are only available for published future events';
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.event_id::text, 0));
    select count(*) into attendee_count from public.rsvps where event_id = new.event_id;
    if attendee_count >= event_record.capacity then
      raise exception 'Event is full';
    end if;
  end if;
  if event_record.price_cad = 0 then
    new.payment_status := 'free';
  elsif new.payment_status = 'free' then
    raise exception 'Paid events cannot have free RSVPs';
  end if;
  return new;
end;
$$;

create trigger validate_rsvp_payment_status
  before insert or update on public.rsvps
  for each row execute procedure public.set_rsvp_payment_status();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.email_preferences enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "Public can read published events"
  on public.events for select
  using (status = 'published');

create policy "Members can create events"
  on public.events for insert to authenticated
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can update their events"
  on public.events for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can delete their events"
  on public.events for delete to authenticated
  using (organizer_id = (select auth.uid()));

create policy "Members can read their profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Members can update their profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select role from public.profiles where id = (select auth.uid())));

create policy "Members can read their RSVPs"
  on public.rsvps for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events
      where events.id = rsvps.event_id and events.organizer_id = (select auth.uid())
    )
  );

create policy "Members can create their RSVPs"
  on public.rsvps for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members can cancel their RSVPs"
  on public.rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Attendees can mark payment sent"
  on public.rsvps for update to authenticated
  using (user_id = (select auth.uid()) and payment_status = 'unpaid')
  with check (user_id = (select auth.uid()) and payment_status = 'pending');

create policy "Organizers can confirm payments"
  on public.rsvps for update to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id and events.organizer_id = (select auth.uid())
    )
  )
  with check (
    payment_status = 'paid'
    and exists (
      select 1 from public.events
      where events.id = rsvps.event_id and events.organizer_id = (select auth.uid())
    )
  );

create policy "Members can read their email preferences"
  on public.email_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members can update their email preferences"
  on public.email_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers for insert
  with check (true);

create or replace view public.public_event_attendees as
select
  r.event_id,
  p.display_name,
  p.avatar_url,
  r.payment_status
from public.rsvps r
join public.profiles p on p.id = r.user_id
join public.events e on e.id = r.event_id
where e.status = 'published';

grant select on public.public_event_attendees to anon, authenticated;
