-- Formation verify uses anon key on Railway when service role is absent.

drop policy if exists formation_receipts_insert on storage.objects;
create policy formation_receipts_insert
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'efaa-formation-receipts');

drop policy if exists formation_receipts_read on storage.objects;
create policy formation_receipts_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'efaa-formation-receipts');

drop policy if exists efaa_formation_applications_insert on public.efaa_formation_applications;
create policy efaa_formation_applications_insert
  on public.efaa_formation_applications for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists efaa_formation_applications_select on public.efaa_formation_applications;
create policy efaa_formation_applications_select
  on public.efaa_formation_applications for select
  to anon, authenticated
  using (true);

drop policy if exists efaa_formation_applications_update on public.efaa_formation_applications;
create policy efaa_formation_applications_update
  on public.efaa_formation_applications for update
  to anon, authenticated
  using (true)
  with check (true);
