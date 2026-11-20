alter type public.event_status add value if not exists 'pending';
alter type public.event_status add value if not exists 'rejected';

alter table public.events
  add column if not exists rejection_reason text;

create or replace function public.validate_event_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
begin
  select role into actor_role from public.profiles where id = (select auth.uid());

  if tg_op = 'INSERT' then
    if new.status = 'published' and actor_role <> 'admin' then
      raise exception 'Only admins can publish events';
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if actor_role = 'admin' then
    return new;
  end if;

  if old.status = 'draft' and new.status = 'pending' then
    return new;
  end if;

  if old.status = 'rejected' and new.status = 'pending' then
    return new;
  end if;

  if old.status = 'published' and new.status = 'cancelled' then
    return new;
  end if;

  raise exception 'You are not allowed to make this event status change';
end;
$$;

drop trigger if exists validate_event_status_transition on public.events;
create trigger validate_event_status_transition
  before insert or update of status on public.events
  for each row execute procedure public.validate_event_status_transition();

drop policy if exists "Organizers can update their events" on public.events;
create policy "Organizers can update their events"
  on public.events for update to authenticated
  using (organizer_id = (select auth.uid()) or exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ))
  with check (organizer_id = (select organizer_id from public.events where id = events.id));

create policy "Admins can review events"
  on public.events for update to authenticated
  using (exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ))
  with check (true);

create policy "Admins can read all events"
  on public.events for select to authenticated
  using (exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ));
