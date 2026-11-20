create or replace view public.organizer_event_attendees
with (security_barrier = true)
as
select
  r.id as rsvp_id,
  r.event_id,
  r.user_id,
  r.payment_status,
  r.created_at,
  e.title as event_title,
  p.display_name,
  p.email
from public.rsvps r
join public.events e on e.id = r.event_id
join public.profiles p on p.id = r.user_id
where e.organizer_id = (select auth.uid());

grant select on public.organizer_event_attendees to authenticated;
