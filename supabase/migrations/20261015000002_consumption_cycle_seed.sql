-- Malyte — Consumption Cycle (migration 2 of 2: seed data)
-- Loads the 6 niche profiles and their fixed questions (version 1).
-- Safe to re-run: profiles are updated, questions are added only if missing.

begin;

-- Skincare & body care
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('skincare_bodycare', 'Skincare & body care',
  array['more even skin tone', 'less dryness', 'calmer skin', 'smoother texture', 'more radiant skin'],
  array['hydration', 'comfort', 'evenness', 'texture', 'routine consistency', 'what they like about the product'],
  array['Never promise to cure, treat or heal any skin condition.', 'Never name medical conditions (acne, eczema, rosacea...) as something the product fixes.', 'If the customer reports irritation, advise stopping use and contacting the brand or a professional.'],
  'label_only', 'When and how to apply, amount, order in the routine, consistency, storage — as stated on the product page.')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'skincare_bodycare', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'skincare_bodycare' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'skincare_bodycare', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'skincare_bodycare' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'skincare_bodycare', 'progress', 'From 1 to 5, how does your skin feel today?', 'Not great', 'Great', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'skincare_bodycare' and kind = 'progress');

-- Haircare
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('haircare', 'Haircare',
  array['more shine', 'less frizz', 'healthier scalp feel', 'easier styling'],
  array['softness', 'shine', 'frizz', 'scalp comfort', 'manageability', 'washing frequency'],
  array['Never promise hair regrowth or to stop hair loss.', 'If the customer reports scalp irritation, advise stopping use.'],
  'general', 'Washing and rinsing technique, amount, drying and styling habits, storage. Never contradict the product page.')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'haircare', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'haircare' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'haircare', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'haircare' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'haircare', 'progress', 'From 1 to 5, how happy are you with your hair today?', 'Not happy', 'Very happy', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'haircare' and kind = 'progress');

-- Supplements
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('supplements', 'Supplements',
  array['a consistent daily routine', 'steadier energy through the day', 'a calmer evening routine', 'never forgetting my daily intake'],
  array['energy', 'sleep quality', 'consistency (days taken)', 'how they feel overall', 'when they take it'],
  array['Never make health claims or promise effects (no ''boosts immunity'', ''reduces anxiety'', etc.).', 'Never suggest changing the dose stated on the product page.', 'Questions ASK how the customer feels; they never imply the product caused it.', 'If the customer reports side effects, advise stopping and consulting a healthcare professional.'],
  'label_only', 'Timing, serving and how to take it exactly as stated on the product page; habits that help consistency (e.g. pairing with an existing daily moment).')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'supplements', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'supplements' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'supplements', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'supplements' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'supplements', 'progress', 'From 1 to 5, how do you feel overall this week?', 'Not great', 'Great', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'supplements' and kind = 'progress');

-- Sports nutrition
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('sports_nutrition', 'Sports nutrition',
  array['hit my daily protein target', 'more consistent training', 'an easier post-workout routine'],
  array['workouts this week', 'consistency', 'taste satisfaction', 'mixing preference', 'how they feel after training'],
  array['Never promise muscle gain, weight loss or performance results.', 'Never suggest exceeding the serving size on the product page.', 'Do not give diet or calorie targets.'],
  'label_only', 'Serving size, mixing and timing as stated on the product page; habits that help consistency.')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'sports_nutrition', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'sports_nutrition' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'sports_nutrition', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'sports_nutrition' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'sports_nutrition', 'progress', 'From 1 to 5, how consistent was your routine this week?', 'Not at all', 'Fully', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'sports_nutrition' and kind = 'progress');

-- Coffee & tea
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('coffee_tea', 'Coffee & tea',
  array['find my ideal cup', 'a better morning ritual', 'explore new flavours', 'less bitterness'],
  array['taste', 'strength preference', 'bitterness', 'brewing method', 'flavour preferences', 'favourite moment of the day'],
  array['No health claims about caffeine, antioxidants or wellbeing effects.'],
  'general', 'Brewing method, grind size, dose, water temperature, extraction time, storage and freshness. Never contradict the product page.')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'coffee_tea', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'coffee_tea' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'coffee_tea', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'coffee_tea' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'coffee_tea', 'progress', 'From 1 to 5, how much are you enjoying your cups?', 'Not much', 'Love it', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'coffee_tea' and kind = 'progress');

-- Pet food & pet care
insert into public.cycle_niche_profiles (niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope)
values ('pet', 'Pet food & pet care',
  array['a smooth food transition', 'a pet who enjoys mealtime', 'a consistent daily routine'],
  array['appetite', 'how much they enjoy it', 'energy', 'coat look', 'transition progress', 'pet size'],
  array['Never make veterinary claims or promise health outcomes.', 'Never suggest changing the feeding amount on the product page.', 'If the customer reports vomiting, diarrhoea or lethargy, advise stopping and contacting a vet.'],
  'label_only', 'Feeding amount, transition and timing exactly as stated on the product page; storage; mealtime routine.')
on conflict (niche) do update set
  label = excluded.label, goal_examples = excluded.goal_examples, adaptive_topics = excluded.adaptive_topics,
  compliance_rules = excluded.compliance_rules, usage_knowledge = excluded.usage_knowledge,
  usage_scope = excluded.usage_scope, updated_at = now();

insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'pet', 'goal', 'What would you like to achieve with it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'pet' and kind = 'goal');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'pet', 'frequency', 'How often will you use it?', null, null, 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'pet' and kind = 'frequency');
insert into public.cycle_fixed_questions (niche, kind, question, low_label, high_label, version, is_active)
select 'pet', 'progress', 'From 1 to 5, how much is your pet enjoying it?', 'Not at all', 'Loves it', 1, true
where not exists (select 1 from public.cycle_fixed_questions where niche = 'pet' and kind = 'progress');

commit;
