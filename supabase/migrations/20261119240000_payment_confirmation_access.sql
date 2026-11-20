create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

drop policy if exists "Members can update their profile" on public.profiles;
create policy "Members can update their profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.current_user_role());

drop policy if exists "Admins can read all RSVPs" on public.rsvps;
create policy "Admins can read all RSVPs"
  on public.rsvps for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop view if exists public.organizer_event_attendees;
create view public.organizer_event_attendees
with (security_barrier = true)
as
select
  r.id as rsvp_id,
  r.event_id,
  r.user_id,
  r.payment_status,
  r.created_at,
  e.title as event_title,
  e.price_cad,
  p.display_name,
  p.email
from public.rsvps r
join public.events e on e.id = r.event_id
join public.profiles p on p.id = r.user_id
where e.organizer_id = (select auth.uid())
   or public.is_admin();

grant select on public.organizer_event_attendees to authenticated;
