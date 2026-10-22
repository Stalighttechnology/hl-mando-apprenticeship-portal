-- =============================================
-- Apprenticeship Recruitment Portal - HL Mando
-- =============================================

-- Roles enum
do $$ begin
  create type public.app_role as enum ('admin', 'viewer');
exception when duplicate_object then null; end $$;

-- User roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- Security definer role check (before policies that use it)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Admins can view all roles" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or user_id = auth.uid());
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Applications
-- =============================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique not null,
  full_name text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('male','female','other')),
  email text not null,
  mobile text not null,
  alt_phone text,
  qualification text not null check (qualification in ('diploma','be','any_degree')),
  branch text,
  college text not null,
  graduation_year int not null,
  score_type text not null check (score_type in ('percentage','cgpa')),
  score numeric(5,2) not null,
  current_address text not null,
  district text not null,
  state text not null,
  pin_code text not null,
  gov_id_type text check (gov_id_type in ('aadhaar','pan','passport','voter','driving','none')),
  gov_id_number text,
  experience_status text not null default 'fresher' check (experience_status in ('fresher','experienced')),
  experience_details text,
  skills text,
  emergency_contact_name text,
  emergency_contact_phone text,
  declaration_accuracy boolean not null,
  declaration_eligibility boolean not null,
  declaration_no_fee boolean not null,
  consent_data_processing boolean not null,
  privacy_notice_accepted boolean not null,
  marketing_consent boolean not null default false,
  status text not null default 'applied' check (status in ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','joined')),
  rejection_reason text,
  interview_at timestamptz,
  interview_location text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists applications_email_unique on public.applications (lower(email));
create unique index if not exists applications_mobile_unique on public.applications (mobile);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_created_idx on public.applications (created_at desc);
create index if not exists applications_name_idx on public.applications (lower(full_name));

grant select, update, delete on public.applications to authenticated;
grant insert on public.applications to anon;
grant all on public.applications to service_role;
alter table public.applications enable row level security;

create policy "anon can submit applications" on public.applications
  for insert to anon with check (true);
create policy "admins manage applications" on public.applications
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- =============================================
-- Documents
-- =============================================
create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  doc_kind text not null check (doc_kind in ('resume','marks_card','certificate','photo','other')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);
grant select, delete on public.application_documents to authenticated;
grant all on public.application_documents to service_role;
alter table public.application_documents enable row level security;
create policy "admins manage documents" on public.application_documents
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Status history / notes / audit log
-- =============================================
create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.application_status_history to authenticated;
grant all on public.application_status_history to service_role;
alter table public.application_status_history enable row level security;
create policy "admins manage status history" on public.application_status_history
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  note text not null,
  author_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.application_notes to authenticated;
grant all on public.application_notes to service_role;
alter table public.application_notes enable row level security;
create policy "admins manage notes" on public.application_notes
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  actor_id uuid,
  actor_email text,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "admins manage activity log" on public.activity_log
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Configurable settings
-- =============================================
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select, update on public.app_settings to authenticated;
grant select on public.app_settings to anon;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "public read settings" on public.app_settings for select to anon using (true);
create policy "admins manage settings" on public.app_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.app_settings (key, value) values
  ('registration_open', 'true'::jsonb),
  ('candidate_notifications_enabled', 'false'::jsonb),
  ('max_age', '26'::jsonb),
  ('min_age', '18'::jsonb)
on conflict (key) do nothing;

-- =============================================
-- Reference id sequence + registration function
-- =============================================
create sequence if not exists public.application_ref_seq start 10001;

create or replace function public.register_application(
  p_email text,
  p_mobile text,
  p_dob date,
  p_ip_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_ref text;
  v_age numeric;
  v_min_age int;
  v_max_age int;
begin
  -- rate limit: max 5 submissions per ip per hour
  if p_ip_hash is not null then
    select count(*) into v_count from public.applications
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_count >= 5 then
      raise exception 'RATE_LIMITED';
    end if;
  end if;

  -- duplicate checks (case-insensitive email, exact mobile)
  select count(*) into v_count from public.applications
    where lower(email) = lower(p_email) or mobile = p_mobile;
  if v_count > 0 then
    raise exception 'DUPLICATE_APPLICATION';
  end if;

  -- age eligibility
  select coalesce((value #>> '{}')::int, 18) into v_min_age from public.app_settings where key = 'min_age';
  select coalesce((value #>> '{}')::int, 26) into v_max_age from public.app_settings where key = 'max_age';
  if v_min_age is null then v_min_age := 18; end if;
  if v_max_age is null then v_max_age := 26; end if;
  v_age := date_part('year', age(now(), p_dob)) + date_part('month', age(now(), p_dob)) / 12;
  if v_age < v_min_age or v_age > v_max_age then
    raise exception 'AGE_NOT_ELIGIBLE';
  end if;

  v_ref := 'HLM' || to_char(now(), 'YY') || '-' || nextval('public.application_ref_seq')::text;
  return v_ref;
end $$;

grant execute on function public.register_application(text, text, date, text) to anon, authenticated;

-- =============================================
-- Storage policies for candidate-documents bucket
-- =============================================
create policy "admins read documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'candidate-documents' and public.has_role(auth.uid(), 'admin'));
create policy "admins delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'candidate-documents' and public.has_role(auth.uid(), 'admin'));
