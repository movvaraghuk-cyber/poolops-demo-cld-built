-- Real logins + row level security.
-- 1. Create the logins first: Supabase dashboard > Authentication > Users > Add user > Create new user,
--    tick "Auto Confirm User", emails owner@serviceops.test, manager@serviceops.test,
--    contractor1@serviceops.test, customer1@serviceops.test ... customer4@serviceops.test
--    (or run scripts/create-users.js, which does the same).
-- 2. Paste this whole file into the SQL editor and run it. Safe to run again.
-- After this runs, the old main branch (hardcoded passwords) can no longer read data.

-- ---------- who is who ----------

-- One row per login. role decides what the database lets them see.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null check (role in ('manager', 'contractor', 'client')),
  display_name text not null,
  client_id text  -- set for role = 'client': which clients row is theirs
);

-- security definer so policies can read profiles without tripping over profiles' own RLS.
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.app_username() returns text
language sql stable security definer set search_path = public as $$
  select username from profiles where id = auth.uid()
$$;

create or replace function public.app_client_id() returns text
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid()
$$;

-- ---------- row level security ----------

alter table profiles enable row level security;
alter table clients enable row level security;
alter table jobs enable row level security;
alter table job_submissions enable row level security;
alter table invoices enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select to authenticated
  using (id = auth.uid() or (select app_role()) = 'manager');

-- Managers (owner + office) can do everything.
drop policy if exists "manager all" on clients;
create policy "manager all" on clients for all to authenticated
  using ((select app_role()) = 'manager') with check ((select app_role()) = 'manager');
drop policy if exists "manager all" on jobs;
create policy "manager all" on jobs for all to authenticated
  using ((select app_role()) = 'manager') with check ((select app_role()) = 'manager');
drop policy if exists "manager all" on job_submissions;
create policy "manager all" on job_submissions for all to authenticated
  using ((select app_role()) = 'manager') with check ((select app_role()) = 'manager');
drop policy if exists "manager all" on invoices;
create policy "manager all" on invoices for all to authenticated
  using ((select app_role()) = 'manager') with check ((select app_role()) = 'manager');

-- Contractors: their own jobs (and unassigned ones), read only. No access to clients or invoices.
-- They get the address through contractor_jobs() and send work through submit_job().
drop policy if exists "contractor reads own jobs" on jobs;
create policy "contractor reads own jobs" on jobs for select to authenticated
  using ((select app_role()) = 'contractor' and (assigned_to is null or assigned_to = (select app_username())));
drop policy if exists "contractor reads own submissions" on job_submissions;
create policy "contractor reads own submissions" on job_submissions for select to authenticated
  using ((select app_role()) = 'contractor' and exists (
    select 1 from jobs j where j.id = job_submissions.job_id
      and (j.assigned_to is null or j.assigned_to = (select app_username()))));

-- Clients: only their own record, jobs, photos and bills, read only.
drop policy if exists "client reads own record" on clients;
create policy "client reads own record" on clients for select to authenticated
  using ((select app_role()) = 'client' and id = (select app_client_id()));
drop policy if exists "client reads own jobs" on jobs;
create policy "client reads own jobs" on jobs for select to authenticated
  using ((select app_role()) = 'client' and client_id = (select app_client_id()));
drop policy if exists "client reads own submissions" on job_submissions;
create policy "client reads own submissions" on job_submissions for select to authenticated
  using ((select app_role()) = 'client' and exists (
    select 1 from jobs j where j.id = job_submissions.job_id and j.client_id = (select app_client_id())));
drop policy if exists "client reads own invoices" on invoices;
create policy "client reads own invoices" on invoices for select to authenticated
  using ((select app_role()) = 'client' and client_id = (select app_client_id()));

-- ---------- functions the app calls ----------

-- A contractor's job list: the address and the work, never the client's name, phone, email or price.
create or replace function public.contractor_jobs() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', j.id, 'client_id', j.client_id, 'service_type', j.service_type, 'status', j.status,
    'notes', j.notes, 'assigned_to', j.assigned_to, 'address', c.address)), '[]'::json)
  from jobs j left join clients c on c.id = j.client_id
  where app_role() = 'contractor' and (j.assigned_to is null or j.assigned_to = app_username())
$$;

-- A contractor sends a finished job to the office. Only works on their own pending jobs.
create or replace function public.submit_job(p_job_id text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if app_role() is distinct from 'contractor' then
    raise exception 'Only contractors can send jobs';
  end if;
  if not exists (select 1 from jobs where id = p_job_id and status = 'pending'
                 and (assigned_to is null or assigned_to = app_username())) then
    raise exception 'This job isn''t yours or was already sent';
  end if;
  -- jsonb_populate_record casts each field to whatever type the column already has.
  insert into job_submissions (job_id, checklist, notes, photos, geo_lat, geo_lng, submitted_at)
  select p_job_id, r.checklist, r.notes, r.photos, r.geo_lat, r.geo_lng, r.submitted_at
  from jsonb_populate_record(null::job_submissions, p) r
  on conflict (job_id) do update set
    checklist = excluded.checklist, notes = excluded.notes, photos = excluded.photos,
    geo_lat = excluded.geo_lat, geo_lng = excluded.geo_lng, submitted_at = excluded.submitted_at;
  update jobs set status = 'submitted' where id = p_job_id;
end
$$;

-- Display names of contractors, for "Contractor 1" labels. Nothing else about them.
create or replace function public.contractor_names() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(username, display_name), '{}'::json)
  from profiles where role = 'contractor'
$$;

-- The pay page (no login): everything one bill needs, found by the secret token in the link.
create or replace function public.invoice_by_token(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'invoice', to_json(i),
    'client', json_build_object('id', c.id, 'address', c.address),
    'jobs', (select coalesce(json_agg(to_json(j)), '[]'::json) from jobs j
             where j.id::text in (select jsonb_array_elements_text(to_jsonb(i.job_ids)))),
    'submissions', (select coalesce(json_agg(to_json(s)), '[]'::json) from job_submissions s
             where s.job_id::text in (select jsonb_array_elements_text(to_jsonb(i.job_ids)))),
    'contractors', contractor_names())
  from invoices i left join clients c on c.id = i.client_id
  where p_token is not null and length(p_token) >= 16 and i.pay_token = p_token
$$;

revoke execute on function public.contractor_jobs() from public, anon;
revoke execute on function public.submit_job(text, jsonb) from public, anon;
revoke execute on function public.contractor_names() from public, anon;
grant execute on function public.contractor_jobs() to authenticated;
grant execute on function public.submit_job(text, jsonb) to authenticated;
grant execute on function public.contractor_names() to authenticated;
grant execute on function public.invoice_by_token(text) to anon, authenticated;

-- ---------- photo uploads ----------

-- Only logged-in contractors and managers can upload. Reading stays public: the bucket is
-- public and every file sits under a random path, which is how pay-link photos load.
drop policy if exists "job photos upload" on storage.objects;
create policy "job photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos' and public.app_role() in ('contractor', 'manager'));

-- ---------- link the logins to roles ----------

-- Gives each login created in step 1 its role. Logins that don't exist yet are skipped;
-- run this file again after adding them.
insert into profiles (id, username, role, display_name, client_id)
select u.id, v.username, v.role, v.display_name, v.client_id
from (values
  ('owner', 'manager', 'Owner', null::text),
  ('manager', 'manager', 'Manager', null),
  ('contractor1', 'contractor', 'Contractor 1', null),
  ('customer1', 'client', 'Maria Chen', 'c1'),
  ('customer2', 'client', 'Robert Diaz', 'c2'),
  ('customer3', 'client', 'Aiko Tanaka', 'c3'),
  ('customer4', 'client', 'The Nguyen Family', 'c4')
) as v (username, role, display_name, client_id)
join auth.users u on lower(u.email) = v.username || '@serviceops.test'
on conflict (id) do update set
  username = excluded.username, role = excluded.role,
  display_name = excluded.display_name, client_id = excluded.client_id;

-- Shows which logins are set up. Every username above should be listed.
select username, role, display_name from profiles order by role, username;
