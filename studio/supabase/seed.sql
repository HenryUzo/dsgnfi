insert into public.agencies (
  id,
  name,
  slug,
  logo_url
)
values (
  '0d4d9d66-f2d2-4db4-b5a5-69a57c6b8d40',
  'Dsgnfi Studio',
  'dsgnfi-studio',
  null
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  logo_url = excluded.logo_url;

insert into public.clients (
  id,
  agency_id,
  name,
  industry,
  website,
  location,
  description,
  contact_name,
  contact_email,
  status
)
values (
  'f78fb495-a3de-4d93-bdd6-e4d8697cf349',
  '0d4d9d66-f2d2-4db4-b5a5-69a57c6b8d40',
  'Lili Veterinary Hospital',
  'Veterinary Care',
  'https://lilivet.com',
  'Stone Oak / San Antonio, Texas',
  'A veterinary hospital focused on accessible, compassionate pet care and education.',
  'Clinic Team',
  'hello@lilivet.com',
  'active'
)
on conflict (id) do update
set
  agency_id = excluded.agency_id,
  name = excluded.name,
  industry = excluded.industry,
  website = excluded.website,
  location = excluded.location,
  description = excluded.description,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  status = excluded.status;

insert into public.brand_profiles (
  id,
  agency_id,
  client_id,
  brand_summary,
  services,
  target_audience,
  tone_of_voice,
  content_pillars,
  faqs,
  common_objections,
  preferred_ctas,
  words_to_use,
  words_to_avoid,
  competitors,
  offer_examples,
  instagram_notes,
  facebook_notes,
  gbp_notes
)
values (
  'dcf6266c-9c77-4779-abf4-5089d59ff1e5',
  '0d4d9d66-f2d2-4db4-b5a5-69a57c6b8d40',
  'f78fb495-a3de-4d93-bdd6-e4d8697cf349',
  'Warm, professional veterinary care for pet parents who want clear guidance and dependable treatment.',
  '["Wellness exams", "Preventive care", "Vaccinations", "Diagnostics", "Surgery", "Urgent pet care"]'::jsonb,
  'Pet parents in Stone Oak and greater San Antonio who value trustworthy, compassionate care.',
  'Warm, professional, reassuring, practical, and safety-focused.',
  '["Pet wellness education", "Preventive care reminders", "Seasonal pet safety", "Appointment readiness"]'::jsonb,
  '["When should I bring my pet in for a summer check-up?", "How do I know if heat is affecting my pet?"]'::jsonb,
  '["Vet visits are too stressful", "I am not sure if this issue is serious enough", "Preventive care can wait"]'::jsonb,
  '["Book an appointment", "Call the clinic", "Schedule your visit today"]'::jsonb,
  '["compassionate", "clear guidance", "trusted care", "pet parents"]'::jsonb,
  '["guaranteed cure", "instant results", "cheap fix"]'::jsonb,
  '["Local veterinary hospitals", "Urgent pet clinics", "Neighborhood pet care providers"]'::jsonb,
  '["Seasonal wellness exams", "Summer safety check-ins", "Preventive care reminders"]'::jsonb,
  'Keep captions concise, warm, and practical. Prioritize clear hooks and strong pet safety reminders.',
  'Lean into educational posts that explain next steps for concerned pet owners.',
  'Use short, informative updates tied to timely seasonal concerns and local intent.'
)
on conflict (client_id) do update
set
  agency_id = excluded.agency_id,
  brand_summary = excluded.brand_summary,
  services = excluded.services,
  target_audience = excluded.target_audience,
  tone_of_voice = excluded.tone_of_voice,
  content_pillars = excluded.content_pillars,
  faqs = excluded.faqs,
  common_objections = excluded.common_objections,
  preferred_ctas = excluded.preferred_ctas,
  words_to_use = excluded.words_to_use,
  words_to_avoid = excluded.words_to_avoid,
  competitors = excluded.competitors,
  offer_examples = excluded.offer_examples,
  instagram_notes = excluded.instagram_notes,
  facebook_notes = excluded.facebook_notes,
  gbp_notes = excluded.gbp_notes;

insert into public.campaigns (
  id,
  agency_id,
  client_id,
  title,
  objective,
  target_audience,
  offer,
  campaign_theme,
  start_date,
  end_date,
  platforms,
  content_types,
  number_of_posts,
  tone,
  key_message,
  cta,
  internal_notes,
  status
)
values (
  '6a9ac7d4-c9c5-4ef0-9315-f3e2bc4885ba',
  '0d4d9d66-f2d2-4db4-b5a5-69a57c6b8d40',
  'f78fb495-a3de-4d93-bdd6-e4d8697cf349',
  'Summer Pet Safety',
  'Educate pet parents and drive appointment bookings during peak summer conditions.',
  'Pet parents in Stone Oak / San Antonio.',
  'Seasonal wellness and safety-focused appointments.',
  'Summer safety awareness with practical pet care guidance.',
  '2026-06-15',
  '2026-07-31',
  '["instagram", "facebook", "google_business_profile"]'::jsonb,
  '["carousel", "reel_script", "static_post", "gbp_post"]'::jsonb,
  8,
  'Warm, professional, clear, and safety-focused.',
  'Help pet parents keep pets safe in the Texas heat and know when to book care.',
  'Book an appointment',
  'Foundational sample campaign for the Content + Campaign MVP.',
  'planning'
)
on conflict (id) do update
set
  agency_id = excluded.agency_id,
  client_id = excluded.client_id,
  title = excluded.title,
  objective = excluded.objective,
  target_audience = excluded.target_audience,
  offer = excluded.offer,
  campaign_theme = excluded.campaign_theme,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  platforms = excluded.platforms,
  content_types = excluded.content_types,
  number_of_posts = excluded.number_of_posts,
  tone = excluded.tone,
  key_message = excluded.key_message,
  cta = excluded.cta,
  internal_notes = excluded.internal_notes,
  status = excluded.status;

-- After signing up through the app, add your own auth.users ID as the seeded agency owner.
-- Replace YOUR_AUTH_USER_ID with the UUID from auth.users or Authentication > Users in Supabase.
--
-- insert into public.agency_members (
--   agency_id,
--   user_id,
--   role,
--   status
-- ) values (
--   '0d4d9d66-f2d2-4db4-b5a5-69a57c6b8d40',
--   'YOUR_AUTH_USER_ID',
--   'owner',
--   'active'
-- )
-- on conflict (agency_id, user_id) do update
-- set
--   role = excluded.role,
--   status = excluded.status;
