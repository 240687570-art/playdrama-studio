-- PlayDrama Studio PostgreSQL / Supabase starter schema
-- Run this in a new PostgreSQL database before migrating from server/data/playdrama-db.json.

create table if not exists app_users (
  id text primary key,
  display_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'creator',
  avatar_initials text,
  created_at timestamptz not null default now()
);

alter table app_users
  add column if not exists phone text;

create unique index if not exists idx_app_users_phone
  on app_users (phone)
  where phone is not null;

create table if not exists workspaces (
  id text primary key,
  name text not null,
  plan text not null default 'creator',
  owner_user_id text not null references app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists workspace_memberships (
  id text primary key,
  user_id text not null references app_users(id),
  workspace_id text not null references workspaces(id),
  role text not null,
  permissions jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  invited_at timestamptz,
  invite_token text unique,
  invite_expires_at timestamptz,
  accepted_at timestamptz,
  unique (user_id, workspace_id)
);

create table if not exists projects (
  id text primary key,
  workspace_id text not null references workspaces(id),
  title text not null,
  template text not null,
  publish jsonb not null default '{}'::jsonb,
  model_routing jsonb not null default '{}'::jsonb,
  nodes jsonb not null default '[]'::jsonb,
  variables jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  lifecycle_status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publish_builds (
  id text primary key,
  project_id text not null references projects(id),
  workspace_id text not null references workspaces(id),
  version integer not null,
  status text not null,
  visibility text not null,
  runtime_url text not null,
  snapshot jsonb not null,
  content_safety jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists analytics_events (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  build_id text references publish_builds(id),
  session_id text not null,
  event_name text not null,
  node_id text,
  choice_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_usage_events (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text references projects(id),
  task text not null,
  provider_id text not null,
  model text not null,
  status text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost text not null default '0',
  currency text not null default 'USD',
  latency_ms integer not null default 0,
  output_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_generation_jobs (
  id text primary key,
  actor_user_id text not null references app_users(id),
  workspace_id text not null references workspaces(id),
  project_id text references projects(id),
  task text not null,
  input jsonb not null default '{}'::jsonb,
  input_summary jsonb not null default '{}'::jsonb,
  retry_of text,
  status text not null default 'queued',
  stage text not null default 'queued',
  progress integer not null default 0,
  message text not null default '',
  error_code text not null default '',
  error_message text not null default '',
  raw_error_message text not null default '',
  output_summary jsonb,
  result jsonb,
  usage_event_id text references ai_usage_events(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists content_safety_reviews (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  provider text not null,
  policy_version text not null,
  status text not null,
  passed boolean not null default false,
  flag_count integer not null default 0,
  blocking_count integer not null default 0,
  review_count integer not null default 0,
  notice_count integer not null default 0,
  flags jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payment_orders (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  build_id text references publish_builds(id),
  user_id text references app_users(id),
  session_id text not null,
  provider text not null,
  status text not null,
  amount integer not null default 0,
  currency text not null default 'CNY',
  monetization text not null default 'Free',
  item_type text not null default 'ending',
  item_id text,
  unlock_node_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists distribution_jobs (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  build_id text references publish_builds(id),
  channel text not null,
  provider text not null,
  status text not null,
  title text not null default '',
  caption text not null default '',
  target_url text not null default '',
  mini_program_path text not null default '',
  external_id text,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists video_generation_jobs (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  shot_id text not null,
  node_id text not null default '',
  provider text not null,
  model text not null,
  status text not null,
  prompt text not null default '',
  duration text not null default '',
  aspect_ratio text not null default '9:16',
  external_id text,
  output_url text not null default '',
  thumbnail_url text not null default '',
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists final_video_renders (
  id text primary key,
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  status text not null,
  title text not null default '',
  aspect_ratio text not null default '9:16',
  clip_count integer not null default 0,
  output_url text not null default '',
  manifest_url text not null default '',
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists audit_log (
  id text primary key,
  user_id text not null references app_users(id),
  workspace_id text not null references workspaces(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists invite_email_deliveries (
  id text primary key,
  workspace_id text not null references workspaces(id),
  member_id text references workspace_memberships(id),
  provider text not null,
  to_email text not null,
  subject text not null,
  invite_url text not null,
  role text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_email_codes (
  id text primary key,
  email text not null,
  code_hash text not null,
  purpose text not null default 'login',
  status text not null default 'pending',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists auth_sms_codes (
  id text primary key,
  phone text not null,
  code_hash text not null,
  purpose text not null default 'login',
  status text not null default 'pending',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  token_hash text primary key,
  user_id text not null references app_users(id) on delete cascade,
  provider text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists marketing_leads (
  id text primary key,
  name text not null,
  company text not null default '',
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  scenario text not null default '',
  message text not null default '',
  source text not null default 'landing-page',
  status text not null default 'new',
  notification jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace_status
  on projects (workspace_id, lifecycle_status);

create index if not exists idx_builds_project
  on publish_builds (project_id, created_at desc);

create index if not exists idx_events_project_created
  on analytics_events (project_id, created_at desc);

create index if not exists idx_ai_usage_project_created
  on ai_usage_events (project_id, created_at desc);

create index if not exists idx_ai_usage_workspace_created
  on ai_usage_events (workspace_id, created_at desc);

create index if not exists idx_ai_generation_jobs_workspace_created
  on ai_generation_jobs (workspace_id, created_at desc);

create index if not exists idx_ai_generation_jobs_status_updated
  on ai_generation_jobs (status, updated_at desc);

create index if not exists idx_ai_generation_jobs_retry_of
  on ai_generation_jobs (retry_of);

create index if not exists idx_content_safety_project_created
  on content_safety_reviews (project_id, created_at desc);

create index if not exists idx_content_safety_workspace_created
  on content_safety_reviews (workspace_id, created_at desc);

create index if not exists idx_payment_orders_build_session
  on payment_orders (build_id, session_id, created_at desc);

create index if not exists idx_payment_orders_workspace_created
  on payment_orders (workspace_id, created_at desc);

create index if not exists idx_distribution_jobs_project_created
  on distribution_jobs (project_id, created_at desc);

create index if not exists idx_distribution_jobs_build_channel
  on distribution_jobs (build_id, channel, created_at desc);

create index if not exists idx_video_generation_jobs_project_created
  on video_generation_jobs (project_id, created_at desc);

create index if not exists idx_video_generation_jobs_status
  on video_generation_jobs (status, updated_at desc);

create index if not exists idx_final_video_renders_project_created
  on final_video_renders (project_id, created_at desc);

create index if not exists idx_final_video_renders_status_updated
  on final_video_renders (status, updated_at desc);

create index if not exists idx_audit_workspace_created
  on audit_log (workspace_id, created_at desc);

create index if not exists idx_audit_target
  on audit_log (target_type, target_id, created_at desc);

create index if not exists idx_invite_email_deliveries_workspace
  on invite_email_deliveries (workspace_id, created_at desc);

create index if not exists idx_marketing_leads_created
  on marketing_leads (created_at desc);

create index if not exists idx_marketing_leads_status
  on marketing_leads (status, created_at desc);

create index if not exists idx_auth_email_codes_email_created
  on auth_email_codes (email, created_at desc);

create index if not exists idx_auth_sms_codes_phone_created
  on auth_sms_codes (phone, created_at desc);

create index if not exists idx_auth_sessions_user_expires
  on auth_sessions (user_id, expires_at desc);
