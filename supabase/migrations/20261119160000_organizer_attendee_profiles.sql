create policy "Organizers can read attendee profiles"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.rsvps
      join public.events on events.id = rsvps.event_id
      where rsvps.user_id = profiles.id
        and events.organizer_id = (select auth.uid())
    )
  );
