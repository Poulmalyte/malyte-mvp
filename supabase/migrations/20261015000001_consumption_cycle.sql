-- ═══════════════════════════════════════════════════════════════
-- Malyte — Consumption Cycle (migration 1 of 2: structure)
-- Adds the routine/cycle switch, niche profiles, fixed questions
-- with versions, customer journeys, weekly steps and answers.
-- Safe to run once. Everything is inside one transaction:
-- if any statement fails, nothing is changed.
-- ═══════════════════════════════════════════════════════════════

begin;

-- 1. Switch per brand: "routine" (current) or "cycle" (new) ─────────
alter table public.shopify_installations
  add column if not exists journey_mode text not null default 'routine'
  check (journey_mode in ('routine', 'cycle'));

-- Snapshot on each order: a customer keeps the mode they started with
alter table public.shopify_orders
  add column if not exists journey_mode text
  check (journey_mode in ('routine', 'cycle'));

-- 2. Niche profiles (edited from the admin dashboard) ───────────────
create table if not exists public.cycle_niche_profiles (
  niche            text primary key,                 -- e.g. 'coffee_tea'
  label            text not null,                    -- e.g. 'Coffee & tea'
  goal_examples    text[] not null default '{}',
  adaptive_topics  text[] not null default '{}',     -- topics the adaptive questions may explore
  compliance_rules text[] not null default '{}',
  usage_knowledge  text not null default 'label_only'
                   check (usage_knowledge in ('general', 'label_only')),
  usage_scope      text not null default '',
  is_active        boolean not null default true,
  updated_at       timestamptz not null default now()
);

-- 3. Fixed questions, versioned ─────────────────────────────────────
-- Editing a question never overwrites it: the dashboard inserts a new
-- version and deactivates the old one, so past answers stay comparable.
create table if not exists public.cycle_fixed_questions (
  id          uuid primary key default gen_random_uuid(),
  niche       text not null references public.cycle_niche_profiles(niche) on update cascade,
  kind        text not null check (kind in ('goal', 'frequency', 'progress')),
  question    text not null,
  low_label   text,                                  -- progress scale: label for 1
  high_label  text,                                  -- progress scale: label for 5
  version     int  not null default 1,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (niche, kind, version)
);

-- Only one active version per niche + kind
create unique index if not exists cycle_fixed_questions_one_active
  on public.cycle_fixed_questions (niche, kind)
  where is_active;

-- 4. One journey per order in "cycle" mode ──────────────────────────
create table if not exists public.cycle_journeys (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null unique references public.shopify_orders(id) on delete cascade,
  merchant_id          uuid not null,                -- same value as shopify_orders.merchant_id; always filter by it
  customer_id          uuid references public.customers(id) on delete set null,
  niche                text references public.cycle_niche_profiles(niche) on update cascade,
  primary_product_id   text,                         -- Shopify product id of the primary product
  goal                 text,                         -- answer to the fixed goal question
  uses_per_day         numeric,                      -- answer to the fixed frequency question
  stock_estimates      jsonb not null default '[]',  -- one per order item (see StockEstimate)
  usage_guide          jsonb,                        -- "how to use your products" (see UsageGuide)
  reported_running_low boolean not null default false,
  in_control_group     boolean not null default false,
  current_week         int not null default 0,
  status               text not null default 'active'
                       check (status in ('active', 'completed', 'stopped')),
  started_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists cycle_journeys_merchant_idx on public.cycle_journeys (merchant_id);
create index if not exists cycle_journeys_active_idx   on public.cycle_journeys (status, current_week) where status = 'active';

-- 5. One row per week sent (week 0 = welcome email) ─────────────────
create table if not exists public.cycle_steps (
  id               uuid primary key default gen_random_uuid(),
  journey_id       uuid not null references public.cycle_journeys(id) on delete cascade,
  merchant_id      uuid not null,
  week             int  not null,
  token            text not null unique default replace(gen_random_uuid()::text, '-', ''), -- used in the one-click answer links
  content          jsonb not null,                   -- WeeklyResult / OnboardingOutput as generated
  email_sent_at    timestamptz,
  created_at       timestamptz not null default now(),
  unique (journey_id, week)
);

create index if not exists cycle_steps_merchant_idx on public.cycle_steps (merchant_id);

-- 6. Every answer (fixed, adaptive, follow-up) ──────────────────────
create table if not exists public.cycle_answers (
  id                 uuid primary key default gen_random_uuid(),
  journey_id         uuid not null references public.cycle_journeys(id) on delete cascade,
  step_id            uuid references public.cycle_steps(id) on delete set null,
  merchant_id        uuid not null,
  week               int  not null,
  question_id        text not null,                  -- 'goal' | 'frequency' | 'progress' | 'adaptive_w3' | 'followup_w3_1'
  question_kind      text not null
                     check (question_kind in ('goal', 'frequency', 'progress', 'adaptive', 'followup')),
  fixed_question_id  uuid references public.cycle_fixed_questions(id), -- which VERSION of a fixed question was answered
  question           text not null,                  -- text as shown to the customer
  answer             text not null,
  created_at         timestamptz not null default now()
);

create index if not exists cycle_answers_journey_idx  on public.cycle_answers (journey_id, week);
create index if not exists cycle_answers_merchant_idx on public.cycle_answers (merchant_id);

-- 7. Security: only the server (service role) can read/write these tables
alter table public.cycle_niche_profiles  enable row level security;
alter table public.cycle_fixed_questions enable row level security;
alter table public.cycle_journeys        enable row level security;
alter table public.cycle_steps           enable row level security;
alter table public.cycle_answers         enable row level security;

commit;
