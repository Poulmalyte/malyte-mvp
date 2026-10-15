-- Malyte — Consumption Cycle (migration 3)
-- 1. Customer language on each journey (from Shopify order.customer_locale).
-- 2. One answer per question per week: re-clicking a button updates the answer.

begin;

alter table public.cycle_journeys
  add column if not exists language text not null default 'en';

create unique index if not exists cycle_answers_one_per_question
  on public.cycle_answers (journey_id, week, question_id);

commit;
