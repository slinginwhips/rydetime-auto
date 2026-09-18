-- ---------------------------------------------------------------------------
-- BDC (business development center) — auto-response to marketplace leads
--
-- Adds source/threading columns to `leads`, a per-lead message thread, and a
-- private storage bucket + table for paperwork customers text in. Idempotent —
-- safe to re-run.
-- ---------------------------------------------------------------------------

alter table leads
  -- Which marketplace the lead came from (cargurus|carfax|offerup|credit_acceptance|website|...).
  add column if not exists source text,
  -- Provider's own lead id, used to dedupe repeat deliveries of the same lead.
  add column if not exists external_id text,
  -- How the BDC reaches this customer: sms | email | offerup_relay | none.
  add column if not exists reply_channel text,
  -- The concrete phone (E.164) / email / relay address that reply_channel sends to.
  add column if not exists reply_target text,
  -- Honored STOP — never message again.
  add column if not exists opted_out boolean not null default false,
  -- BDC lifecycle: new | contacted | replied | opted_out | manual.
  add column if not exists bdc_status text not null default 'new';

-- One lead per (source, external_id) so a redelivered email can't double-text.
create unique index if not exists idx_leads_source_external
  on leads (source, external_id) where external_id is not null;
-- Fast inbound matching: find the lead by the number/address that replied.
create index if not exists idx_leads_reply_target on leads (reply_target);

-- Per-lead conversation thread — one row per message either direction.
create table if not exists bdc_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null,                 -- sms | email | offerup_relay
  body text,
  -- false when drafted-but-not-sent (BDC disarmed / dry run); true once delivered.
  sent boolean not null default true,
  skip_reason text,                      -- why an outbound wasn't sent, if applicable
  provider_sid text,                     -- Twilio Message SID / Resend id
  created_at timestamptz not null default now()
);
create index if not exists idx_bdc_messages_lead on bdc_messages (lead_id, created_at);

-- Paperwork a customer texts in (MMS), filed against their lead.
create table if not exists bdc_attachments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  message_id uuid references bdc_messages(id) on delete set null,
  storage_path text not null,            -- path within the bdc-attachments bucket
  content_type text,
  filename text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bdc_attachments_lead on bdc_attachments (lead_id, created_at);

-- Private bucket for texted-in documents (never public — these are PII/financial).
insert into storage.buckets (id, name, public)
values ('bdc-attachments', 'bdc-attachments', false)
on conflict (id) do nothing;

-- Server-only: the BDC and admin pages use the service role, which bypasses
-- RLS. No policies = anon/authenticated keys can't read customer threads.
alter table bdc_messages enable row level security;
alter table bdc_attachments enable row level security;
