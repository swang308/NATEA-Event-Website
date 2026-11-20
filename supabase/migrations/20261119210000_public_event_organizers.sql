create or replace view public.public_event_organizers as
select distinct
  e.id as event_id,
  p.display_name,
  p.avatar_url
from public.events e
join public.profiles p on p.id = e.organizer_id
where e.status = 'published';

grant select on public.public_event_organizers to anon, authenticated;
