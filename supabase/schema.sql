-- RydeTime Auto — Supabase Postgres schema
-- Run in the Supabase SQL editor (or via supabase db push).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  vin text not null unique,
  stock_number text not null,
  year int not null,
  make text not null,
  model text not null,
  trim text,
  body_style text,
  exterior_color text,
  interior_color text,
  mileage int not null default 0,
  price numeric(10,2) not null default 0,
  msrp numeric(10,2),
  status text not null default 'active' check (status in ('active','sold','hold_pending','fresh_arrival')),
  transmission text,
  drivetrain text,
  fuel_type text,
  engine text,
  doors int,
  seats int,
  description_dc text,
  description_ai text,
  meta_description text,
  slug text not null unique,
  carfax_url text,
  carfax_badge_one_owner boolean not null default false,
  carfax_badge_accident_free boolean not null default false,
  carfax_badge_service_records boolean not null default false,
  carfax_badge_great_value boolean not null default false,
  carfax_badge_good_value boolean not null default false,
  dc_vehicle_url text,
  featured boolean not null default false,
  ryans_pick boolean not null default false,
  best_fit_for text,
  ryans_take text,
  what_to_know text,
  video_url text,
  days_in_inventory int not null default 0,
  price_reduced boolean not null default false,
  original_price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  dc_last_synced timestamptz
);

create index if not exists idx_vehicles_status on vehicles (status);
create index if not exists idx_vehicles_slug on vehicles (slug);
create index if not exists idx_vehicles_price on vehicles (price);
create index if not exists idx_vehicles_make_model on vehicles (make, model);
create index if not exists idx_vehicles_featured on vehicles (featured) where featured = true;
create index if not exists idx_vehicles_created on vehicles (created_at desc);

-- ---------------------------------------------------------------------------
-- vehicle_photos
-- ---------------------------------------------------------------------------
create table if not exists vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicle_photos_vehicle on vehicle_photos (vehicle_id, sort_order);

-- ---------------------------------------------------------------------------
-- vehicle_features
-- ---------------------------------------------------------------------------
create table if not exists vehicle_features (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  feature_name text not null,
  category text
);

create index if not exists idx_vehicle_features_vehicle on vehicle_features (vehicle_id);

-- ---------------------------------------------------------------------------
-- vehicle_prep_badges
-- ---------------------------------------------------------------------------
create table if not exists vehicle_prep_badges (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  badge_type text not null check (badge_type in (
    'state_inspection','oil_change','new_tires','new_brakes',
    'detailed','multi_point_review','battery_checked','fluids_topped'
  )),
  created_at timestamptz not null default now(),
  unique (vehicle_id, badge_type)
);

create index if not exists idx_vehicle_prep_badges_vehicle on vehicle_prep_badges (vehicle_id);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text,
  phone text,
  vehicle_id uuid references vehicles(id) on delete set null,
  vin text,
  stock_number text,
  message text,
  lead_type text not null default 'inquiry' check (lead_type in (
    'inquiry','test_drive','trade','finance','hold','chat','matchmaker','price_drop','carfax','credit_app'
  )),
  budget text,
  down_payment text,
  monthly_payment_goal text,
  trade_vin text,
  trade_year int,
  trade_make text,
  trade_model text,
  trade_mileage int,
  trade_payoff text,
  preferred_date text,
  preferred_time text,
  source_url text,
  chat_summary text,
  dc_pushed boolean not null default false,
  dc_pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_created on leads (created_at desc);
create index if not exists idx_leads_type on leads (lead_type);
create index if not exists idx_leads_vehicle on leads (vehicle_id);

-- ---------------------------------------------------------------------------
-- lead_events
-- ---------------------------------------------------------------------------
create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  event_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_events_lead on lead_events (lead_id, created_at);

-- ---------------------------------------------------------------------------
-- credit_applications
-- A signed online credit application, stored REDACTED. The full SSN is NEVER
-- persisted here (only the last 4) and never logged — the complete application
-- (with SSN) is transmitted in-flight to DealerCenter's CRM intake and, if that
-- fails, the customer is re-contacted. This table is the audit record + the
-- data the dealership needs to recognize and follow up on the application.
-- ---------------------------------------------------------------------------
create table if not exists credit_applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,

  -- applicant (redacted — no full SSN)
  first_name text not null,
  middle_name text,
  last_name text not null,
  dob date,
  ssn_last4 text,
  drivers_license text,
  email text,
  phone text,

  -- current residence
  address text,
  city text,
  state text,
  zip text,
  housing_status text,            -- own / rent / other
  years_at_address numeric,
  months_at_address numeric,
  monthly_housing_payment text,
  prev_address text,              -- captured when < 2 yrs at current

  -- employment & income
  employment_status text,         -- employed / self_employed / retired / other
  employer_name text,
  job_title text,
  work_phone text,
  years_employed numeric,
  months_employed numeric,
  gross_monthly_income text,
  other_income text,
  other_income_source text,

  -- co-applicant (optional; redacted)
  co_first_name text,
  co_last_name text,
  co_dob date,
  co_ssn_last4 text,
  co_email text,
  co_phone text,
  co_employer_name text,
  co_gross_monthly_income text,
  co_relationship text,

  -- deal
  vehicle_id uuid references vehicles(id) on delete set null,
  vin text,
  stock_number text,
  requested_down_payment text,
  desired_monthly_payment text,

  -- e-signature / consent audit (ESIGN/UETA + FCRA authorization)
  signature_name text not null,
  consent_credit_pull boolean not null default false,
  signer_ip text,
  signer_user_agent text,
  signed_at timestamptz not null default now(),

  dc_pushed boolean not null default false,
  dc_pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_apps_lead on credit_applications (lead_id);
create index if not exists idx_credit_apps_created on credit_applications (created_at desc);

-- ---------------------------------------------------------------------------
-- chat_sessions / chat_messages
-- ---------------------------------------------------------------------------
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  vehicle_id uuid references vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session on chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  preferred_date text not null,
  preferred_time text not null,
  confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_created on appointments (created_at desc);

-- ---------------------------------------------------------------------------
-- trade_requests
-- ---------------------------------------------------------------------------
create table if not exists trade_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  vin text,
  year int,
  make text,
  model text,
  mileage int,
  condition text check (condition in ('Excellent','Good','Fair','Poor')),
  payoff_amount text,
  lender text,
  warning_lights boolean,
  accident_history boolean,
  title_status text check (title_status in ('Clean','Salvage','Rebuilt','Unknown')),
  photos_urls jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_trade_requests_created on trade_requests (created_at desc);

-- ---------------------------------------------------------------------------
-- hold_deposits
-- ---------------------------------------------------------------------------
create table if not exists hold_deposits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  amount numeric(10,2) not null default 500,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending','confirmed','released','forfeited')),
  acknowledged_policy boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_hold_deposits_vehicle on hold_deposits (vehicle_id);
create index if not exists idx_hold_deposits_status on hold_deposits (status);

-- ---------------------------------------------------------------------------
-- inventory_sync_logs
-- ---------------------------------------------------------------------------
create table if not exists inventory_sync_logs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','success','error')),
  vehicles_added int not null default 0,
  vehicles_updated int not null default 0,
  vehicles_sold int not null default 0,
  vehicles_unchanged int not null default 0,
  error_message text,
  feed_url text
);

create index if not exists idx_sync_logs_started on inventory_sync_logs (started_at desc);

-- ---------------------------------------------------------------------------
-- admin_overrides
-- ---------------------------------------------------------------------------
create table if not exists admin_overrides (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  field_name text not null,
  override_value text,
  created_at timestamptz not null default now(),
  unique (vehicle_id, field_name)
);

create index if not exists idx_admin_overrides_vehicle on admin_overrides (vehicle_id);

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ai_generation_logs
-- ---------------------------------------------------------------------------
create table if not exists ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete set null,
  generation_type text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vehicles_updated on vehicles;
create trigger trg_vehicles_updated before update on vehicles
  for each row execute function set_updated_at();

drop trigger if exists trg_chat_sessions_updated on chat_sessions;
create trigger trg_chat_sessions_updated before update on chat_sessions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   service role bypasses RLS automatically.
--   anon: read active inventory only. No public writes anywhere.
-- ---------------------------------------------------------------------------
alter table vehicles enable row level security;
alter table vehicle_photos enable row level security;
alter table vehicle_features enable row level security;
alter table vehicle_prep_badges enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table credit_applications enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table appointments enable row level security;
alter table trade_requests enable row level security;
alter table hold_deposits enable row level security;
alter table inventory_sync_logs enable row level security;
alter table admin_overrides enable row level security;
alter table site_settings enable row level security;
alter table ai_generation_logs enable row level security;

-- Public can read active (non-sold) vehicles only.
drop policy if exists "anon read active vehicles" on vehicles;
create policy "anon read active vehicles" on vehicles
  for select using (status in ('active','fresh_arrival','hold_pending'));

drop policy if exists "anon read photos of active vehicles" on vehicle_photos;
create policy "anon read photos of active vehicles" on vehicle_photos
  for select using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_photos.vehicle_id
        and v.status in ('active','fresh_arrival','hold_pending')
    )
  );

drop policy if exists "anon read features of active vehicles" on vehicle_features;
create policy "anon read features of active vehicles" on vehicle_features
  for select using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_features.vehicle_id
        and v.status in ('active','fresh_arrival','hold_pending')
    )
  );

drop policy if exists "anon read prep badges of active vehicles" on vehicle_prep_badges;
create policy "anon read prep badges of active vehicles" on vehicle_prep_badges
  for select using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_prep_badges.vehicle_id
        and v.status in ('active','fresh_arrival','hold_pending')
    )
  );

-- No anon policies on leads, lead_events, chat_*, appointments, trade_requests,
-- hold_deposits, inventory_sync_logs, admin_overrides, site_settings, or
-- ai_generation_logs: with RLS enabled and no policy, anon has no access.
-- All writes go through server-side API routes using the service role key.
