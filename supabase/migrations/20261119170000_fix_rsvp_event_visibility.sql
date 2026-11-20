create or replace function public.set_rsvp_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  attendee_count integer;
begin
  select * into event_record
  from public.events
  where id = new.event_id
  for update;

  if event_record.id is null then
    raise exception 'Event does not exist';
  end if;

  if event_record.status <> 'published' or event_record.starts_at <= now() then
    raise exception 'RSVPs are only available for published future events';
  end if;

  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.event_id::text, 0));
    select count(*) into attendee_count
    from public.rsvps
    where event_id = new.event_id;

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
