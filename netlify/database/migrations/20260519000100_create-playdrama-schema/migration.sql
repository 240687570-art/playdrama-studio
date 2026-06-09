-- PlayDrama Studio PostgreSQL / Supabase starter schema
-- Run this in a new PostgreSQL database before migrating from server/data/playdrama-db.json.

create table if not exists app_users (
  id text primary key,
  display_name text not null,
  email text not null unique,
  role text not null default 'creator',
  avatar_initials text,
  created_at timestamptz not null default now()
);

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

create index if not exists idx_projects_workspace_status
  on projects (workspace_id, lifecycle_status);

create index if not exists idx_builds_project
  on publish_builds (project_id, created_at desc);

create index if not exists idx_events_project_created
  on analytics_events (project_id, created_at desc);

create index if not exists idx_audit_workspace_created
  on audit_log (workspace_id, created_at desc);

create index if not exists idx_audit_target
  on audit_log (target_type, target_id, created_at desc);

create index if not exists idx_invite_email_deliveries_workspace
  on invite_email_deliveries (workspace_id, created_at desc);
