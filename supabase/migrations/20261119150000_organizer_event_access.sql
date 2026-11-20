create policy "Organizers can read their own events"
  on public.events for select to authenticated
  using (organizer_id = (select auth.uid()));
