-- Seed a minimal creator workspace so a freshly provisioned preview database
-- can pass basic verification and open the product without relying on JSON files.

insert into app_users
  (id, display_name, email, role, avatar_initials, created_at)
values
  ('usr_001', 'Creator', 'creator@example.com', 'owner', 'CR', '2026-05-17T04:33:14.380Z')
on conflict (id) do nothing;

insert into workspaces
  (id, name, plan, owner_user_id, created_at)
values
  ('wks_001', 'Creator Studio', 'creator', 'usr_001', '2026-05-17T04:33:14.381Z')
on conflict (id) do nothing;

insert into workspace_memberships
  (id, user_id, workspace_id, role, permissions, status, joined_at)
values
  (
    'mem_001',
    'usr_001',
    'wks_001',
    'owner',
    '["project:read","project:write","project:publish","analytics:read","member:manage"]'::jsonb,
    'active',
    '2026-05-17T04:33:14.381Z'
  )
on conflict (id) do nothing;

insert into projects
  (
    id,
    workspace_id,
    title,
    template,
    publish,
    model_routing,
    nodes,
    variables,
    characters,
    lifecycle_status,
    created_at,
    updated_at
  )
values
  (
    'playdrama-seed-project',
    'wks_001',
    'AI 互动短剧商业化样片',
    '悬疑互动短剧',
    '{"status":"draft","visibility":"private","category":"interactive-drama","audience":"creator-beta","monetization":"free","price":0}'::jsonb,
    '{"region":"china-mainland","primaryProvider":"deepseek","fallbackProviders":["qwen","doubao","zhipu"],"openaiEnabled":false}'::jsonb,
    '[
      {
        "id":"node-opening",
        "type":"opening",
        "title":"开场",
        "summary":"观众进入一个由选择推动的短剧开场。",
        "metric":"完播率",
        "choices":[
          {"id":"choice-investigate","label":"追查线索","targetNodeId":"node-clue","condition":""},
          {"id":"choice-call","label":"联系角色","targetNodeId":"node-call","condition":""}
        ]
      },
      {
        "id":"node-clue",
        "type":"branch",
        "title":"线索分支",
        "summary":"系统根据选择推进悬疑线。",
        "metric":"互动率",
        "choices":[]
      },
      {
        "id":"node-call",
        "type":"branch",
        "title":"角色通话",
        "summary":"观众通过角色关系进入另一条分支。",
        "metric":"转化率",
        "choices":[]
      }
    ]'::jsonb,
    '[{"name":"线索","type":"number","value":0},{"name":"信任","type":"number","value":1}]'::jsonb,
    '[{"name":"林夏","role":"主角","description":"短剧创作者样片中的核心角色。"}]'::jsonb,
    'active',
    now(),
    now()
  )
on conflict (id) do nothing;
