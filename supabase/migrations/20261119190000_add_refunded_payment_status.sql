alter type public.payment_status add value if not exists 'refunded';

drop policy if exists "Organizers can confirm payments" on public.rsvps;

create policy "Organizers can confirm or refund payments"
  on public.rsvps for update to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = rsvps.event_id
        and events.organizer_id = (select auth.uid())
    )
  )
  with check (
    payment_status in ('paid', 'refunded')
    and exists (
      select 1
      from public.events
      where events.id = rsvps.event_id
        and events.organizer_id = (select auth.uid())
    )
  );
