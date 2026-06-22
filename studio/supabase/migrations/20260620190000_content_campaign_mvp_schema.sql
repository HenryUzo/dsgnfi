create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'team_member', 'viewer')),
  status text not null check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  location text,
  description text,
  contact_name text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null unique references public.clients(id) on delete cascade,
  brand_summary text,
  services jsonb not null default '[]'::jsonb,
  target_audience text,
  tone_of_voice text,
  content_pillars jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  common_objections jsonb not null default '[]'::jsonb,
  preferred_ctas jsonb not null default '[]'::jsonb,
  words_to_use jsonb not null default '[]'::jsonb,
  words_to_avoid jsonb not null default '[]'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  offer_examples jsonb not null default '[]'::jsonb,
  instagram_notes text,
  facebook_notes text,
  gbp_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  objective text,
  target_audience text,
  offer text,
  campaign_theme text,
  start_date date,
  end_date date,
  platforms jsonb not null default '[]'::jsonb,
  content_types jsonb not null default '[]'::jsonb,
  number_of_posts integer not null default 0,
  tone text,
  key_message text,
  cta text,
  internal_notes text,
  status text not null default 'draft' check (status in ('draft', 'planning', 'content_generated', 'in_review', 'approved', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  platform text not null,
  content_type text not null,
  suggested_date date,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'changes_requested', 'approved', 'ready_to_publish', 'published_manually')),
  objective text,
  hook text,
  cta text,
  hashtags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_variants (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  version_number integer not null,
  ai_generated_copy text,
  edited_copy text,
  creative_direction text,
  model_used text,
  approval_status text not null default 'draft' check (approval_status in ('draft', 'needs_review', 'changes_requested', 'approved')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_item_id, version_number)
);

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  type text not null,
  file_url text not null,
  storage_path text,
  tags jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  generation_type text not null,
  prompt_input jsonb not null default '{}'::jsonb,
  ai_output jsonb not null default '{}'::jsonb,
  model_used text,
  status text not null default 'success' check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agency_members_agency_id on public.agency_members(agency_id);
create index if not exists idx_agency_members_user_id on public.agency_members(user_id);

create index if not exists idx_clients_agency_id on public.clients(agency_id);
create index if not exists idx_clients_created_at on public.clients(created_at desc);

create index if not exists idx_brand_profiles_agency_id on public.brand_profiles(agency_id);
create index if not exists idx_brand_profiles_client_id on public.brand_profiles(client_id);
create index if not exists idx_brand_profiles_created_at on public.brand_profiles(created_at desc);

create index if not exists idx_campaigns_agency_id on public.campaigns(agency_id);
create index if not exists idx_campaigns_client_id on public.campaigns(client_id);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_campaigns_created_at on public.campaigns(created_at desc);

create index if not exists idx_content_items_agency_id on public.content_items(agency_id);
create index if not exists idx_content_items_client_id on public.content_items(client_id);
create index if not exists idx_content_items_campaign_id on public.content_items(campaign_id);
create index if not exists idx_content_items_status on public.content_items(status);
create index if not exists idx_content_items_suggested_date on public.content_items(suggested_date);
create index if not exists idx_content_items_created_at on public.content_items(created_at desc);

create index if not exists idx_content_variants_agency_id on public.content_variants(agency_id);
create index if not exists idx_content_variants_content_item_id on public.content_variants(content_item_id);
create index if not exists idx_content_variants_created_at on public.content_variants(created_at desc);

create index if not exists idx_content_comments_agency_id on public.content_comments(agency_id);
create index if not exists idx_content_comments_content_item_id on public.content_comments(content_item_id);
create index if not exists idx_content_comments_created_at on public.content_comments(created_at desc);

create index if not exists idx_assets_agency_id on public.assets(agency_id);
create index if not exists idx_assets_client_id on public.assets(client_id);
create index if not exists idx_assets_campaign_id on public.assets(campaign_id);
create index if not exists idx_assets_created_at on public.assets(created_at desc);

create index if not exists idx_ai_generations_agency_id on public.ai_generations(agency_id);
create index if not exists idx_ai_generations_client_id on public.ai_generations(client_id);
create index if not exists idx_ai_generations_campaign_id on public.ai_generations(campaign_id);
create index if not exists idx_ai_generations_created_at on public.ai_generations(created_at desc);

create index if not exists idx_activity_logs_agency_id on public.activity_logs(agency_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

create or replace function public.is_agency_member(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_members am
    where am.agency_id = target_agency_id
      and am.user_id = auth.uid()
      and am.status = 'active'
  );
$$;

create or replace function public.is_agency_admin(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_members am
    where am.agency_id = target_agency_id
      and am.user_id = auth.uid()
      and am.status = 'active'
      and am.role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_agency_member(uuid) to authenticated;
grant execute on function public.is_agency_admin(uuid) to authenticated;

create trigger set_agencies_updated_at
before update on public.agencies
for each row execute function public.set_updated_at();

create trigger set_agency_members_updated_at
before update on public.agency_members
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_brand_profiles_updated_at
before update on public.brand_profiles
for each row execute function public.set_updated_at();

create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create trigger set_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create trigger set_content_variants_updated_at
before update on public.content_variants
for each row execute function public.set_updated_at();

create trigger set_content_comments_updated_at
before update on public.content_comments
for each row execute function public.set_updated_at();

create trigger set_assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.clients enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.content_items enable row level security;
alter table public.content_variants enable row level security;
alter table public.content_comments enable row level security;
alter table public.assets enable row level security;
alter table public.ai_generations enable row level security;
alter table public.activity_logs enable row level security;

create policy "agencies_select_for_members"
on public.agencies
for select
to authenticated
using (public.is_agency_member(id));

create policy "agencies_insert_for_authenticated_users"
on public.agencies
for insert
to authenticated
with check (auth.uid() is not null);

create policy "agencies_update_for_admins"
on public.agencies
for update
to authenticated
using (public.is_agency_admin(id))
with check (public.is_agency_admin(id));

create policy "agencies_delete_for_admins"
on public.agencies
for delete
to authenticated
using (public.is_agency_admin(id));

create policy "agency_members_select_for_members"
on public.agency_members
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "agency_members_insert_for_admins_or_first_owner"
on public.agency_members
for insert
to authenticated
with check (
  public.is_agency_admin(agency_id)
  or (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and not exists (
      select 1
      from public.agency_members existing_member
      where existing_member.agency_id = agency_members.agency_id
    )
  )
);

create policy "agency_members_update_for_admins"
on public.agency_members
for update
to authenticated
using (public.is_agency_admin(agency_id))
with check (public.is_agency_admin(agency_id));

create policy "agency_members_delete_for_admins"
on public.agency_members
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "clients_select_for_members"
on public.clients
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "clients_insert_for_members"
on public.clients
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "clients_update_for_members"
on public.clients
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "clients_delete_for_admins"
on public.clients
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "brand_profiles_select_for_members"
on public.brand_profiles
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "brand_profiles_insert_for_members"
on public.brand_profiles
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "brand_profiles_update_for_members"
on public.brand_profiles
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "brand_profiles_delete_for_admins"
on public.brand_profiles
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "campaigns_select_for_members"
on public.campaigns
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "campaigns_insert_for_members"
on public.campaigns
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "campaigns_update_for_members"
on public.campaigns
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "campaigns_delete_for_admins"
on public.campaigns
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "content_items_select_for_members"
on public.content_items
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "content_items_insert_for_members"
on public.content_items
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "content_items_update_for_members"
on public.content_items
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "content_items_delete_for_admins"
on public.content_items
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "content_variants_select_for_members"
on public.content_variants
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "content_variants_insert_for_members"
on public.content_variants
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "content_variants_update_for_members"
on public.content_variants
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "content_variants_delete_for_admins"
on public.content_variants
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "content_comments_select_for_members"
on public.content_comments
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "content_comments_insert_for_members"
on public.content_comments
for insert
to authenticated
with check (
  public.is_agency_member(agency_id)
  and (user_id is null or user_id = auth.uid())
);

create policy "content_comments_update_for_members"
on public.content_comments
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "content_comments_delete_for_admins"
on public.content_comments
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "assets_select_for_members"
on public.assets
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "assets_insert_for_members"
on public.assets
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "assets_update_for_members"
on public.assets
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "assets_delete_for_admins"
on public.assets
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "ai_generations_select_for_members"
on public.ai_generations
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "ai_generations_insert_for_members"
on public.ai_generations
for insert
to authenticated
with check (public.is_agency_member(agency_id));

create policy "ai_generations_update_for_members"
on public.ai_generations
for update
to authenticated
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

create policy "ai_generations_delete_for_admins"
on public.ai_generations
for delete
to authenticated
using (public.is_agency_admin(agency_id));

create policy "activity_logs_select_for_members"
on public.activity_logs
for select
to authenticated
using (public.is_agency_member(agency_id));

create policy "activity_logs_insert_for_members"
on public.activity_logs
for insert
to authenticated
with check (
  public.is_agency_member(agency_id)
  and (user_id is null or user_id = auth.uid())
);

create policy "activity_logs_delete_for_admins"
on public.activity_logs
for delete
to authenticated
using (public.is_agency_admin(agency_id));
