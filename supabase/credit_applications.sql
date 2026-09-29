-- ===========================================================================
-- RydeTime Auto — secure online credit application
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: everything is idempotent.
-- ===========================================================================

-- 1) Allow the new 'credit_app' lead_type on the existing leads table.
alter table leads drop constraint if exists leads_lead_type_check;
alter table leads add constraint leads_lead_type_check check (lead_type in (
  'inquiry','test_drive','trade','finance','hold','chat','matchmaker','price_drop','carfax','credit_app'
));

-- 2) The redacted credit-application record + e-signature audit trail.
--    The full SSN is NEVER stored here (only ssn_last4). The complete
--    application is transmitted to DealerCenter in-flight, not persisted.
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
  housing_status text,
  years_at_address numeric,
  months_at_address numeric,
  monthly_housing_payment text,
  prev_address text,

  -- employment & income
  employment_status text,
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

-- Separate, OPTIONAL SMS opt-in (Twilio A2P 10DLC compliance) — unchecked by
-- default on the form and never required to submit. Added after initial launch,
-- so it's a backfill-safe alter for existing databases.
alter table credit_applications add column if not exists sms_consent boolean not null default false;

-- Previous address/employer detail + full co-applicant mirror. Added after
-- launch, so backfill-safe alters. RUN THIS BEFORE deploying the matching site
-- code — the insert names these columns.
alter table credit_applications
  add column if not exists prev_years_at_address numeric,
  add column if not exists prev_months_at_address numeric,
  add column if not exists prev_employer_name text,
  add column if not exists prev_years_employed numeric,
  add column if not exists prev_months_employed numeric,
  add column if not exists no_prev_employer boolean not null default false,
  add column if not exists co_address text,
  add column if not exists co_city text,
  add column if not exists co_state text,
  add column if not exists co_zip text,
  add column if not exists co_housing_status text,
  add column if not exists co_monthly_housing_payment text,
  add column if not exists co_years_at_address numeric,
  add column if not exists co_months_at_address numeric,
  add column if not exists co_prev_address text,
  add column if not exists co_prev_years_at_address numeric,
  add column if not exists co_prev_months_at_address numeric,
  add column if not exists co_employment_status text,
  add column if not exists co_job_title text,
  add column if not exists co_work_phone text,
  add column if not exists co_years_employed numeric,
  add column if not exists co_months_employed numeric,
  add column if not exists co_prev_employer_name text,
  add column if not exists co_prev_years_employed numeric,
  add column if not exists co_prev_months_employed numeric,
  add column if not exists co_no_prev_employer boolean not null default false,
  add column if not exists co_drivers_license text,
  add column if not exists co_other_income text,
  add column if not exists co_other_income_source text;

create index if not exists idx_credit_apps_leadon credit_applications (lead_id);
create index if not exists idx_credit_apps_created on credit_applications (created_at desc);

-- 3) Lock it down: RLS ON, NO public policies. This denies the public/anon key
--    entirely (the anon key is exposed in the website's browser code), while the
--    server's service-role key still has full access because it bypasses RLS.
--    Matches how leads/vehicles are already secured. REQUIRED — this table holds
--    financial PII.
alter table credit_applications enable row level security;
