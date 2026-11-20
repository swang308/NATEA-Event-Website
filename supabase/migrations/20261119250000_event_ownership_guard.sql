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

create or replace function public.validate_event_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is null then
      raise exception 'A signed-in user is required to create an event';
    end if;
    new.organizer_id := (select auth.uid());
  elsif new.organizer_id <> old.organizer_id then
    raise exception 'Event ownership cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_event_ownership on public.events;
create trigger validate_event_ownership
  before insert or update of organizer_id on public.events
  for each row execute procedure public.validate_event_ownership();

drop policy if exists "Organizers can read their own events" on public.events;
create policy "Organizers can read their own events"
  on public.events for select to authenticated
  using (organizer_id = (select auth.uid()));

drop policy if exists "Admins can read all events" on public.events;
create policy "Admins can read all events"
  on public.events for select to authenticated
  using (public.is_admin());

drop policy if exists "Organizers can update their events" on public.events;
create policy "Organizers can update their events"
  on public.events for update to authenticated
  using (organizer_id = (select auth.uid()) or public.is_admin())
  with check (organizer_id = (select auth.uid()) or public.is_admin());
