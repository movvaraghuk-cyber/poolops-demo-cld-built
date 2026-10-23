-- Run once in the Supabase SQL editor before deploying this branch.
-- Every change is additive, so the current main branch keeps working after it runs.

-- How each client wants to hear about invoices: 'sms', 'email' or 'both'.
alter table clients add column if not exists preferred_contact text not null default 'sms';

-- Pay links: each invoice gets an unguessable token so clients can pay without logging in.
alter table invoices add column if not exists pay_token text;
create unique index if not exists invoices_pay_token_key on invoices (pay_token);
update invoices set pay_token = replace(gen_random_uuid()::text, '-', '') where pay_token is null;

-- Which channels the invoice was sent through, and when photos for it get deleted.
alter table invoices add column if not exists sent_via text[] not null default '{}';
alter table invoices add column if not exists photos_expire_at timestamptz;
update invoices set photos_expire_at = paid_at + interval '30 days'
  where status = 'paid' and photos_expire_at is null;

-- Set once the cleanup job has removed a submission's photos from storage.
alter table job_submissions add column if not exists photos_deleted_at timestamptz;

-- Photo storage. Files live under random paths; the cleanup job deletes them
-- 30 days after the invoice is paid (see api/cleanup-photos.js).
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

drop policy if exists "job photos upload" on storage.objects;
create policy "job photos upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'job-photos');

drop policy if exists "job photos read" on storage.objects;
create policy "job photos read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'job-photos');
