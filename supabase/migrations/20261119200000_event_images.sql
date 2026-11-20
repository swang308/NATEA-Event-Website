alter table public.events add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

create policy "Authenticated users can upload event images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update their event images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their event images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
