# PlayDrama Studio 数据库迁移报告

生成时间：2026-05-20T09:48:37.082Z

决策：READY_TO_VERIFY

## 当前状态

- 本地 JSON 数据库：已找到
- 本地数据路径：D:\代码\playdrama-studio\server\data\playdrama-db.json
- 目标存储驱动：postgres
- DATABASE_URL：已配置

## 数据规模

| JSON 字段 | PostgreSQL 表 | 记录数 |
| --- | --- | ---: |
| users | app_users | 38 |
| workspaces | workspaces | 23 |
| memberships | workspace_memberships | 39 |
| projects | projects | 2 |
| builds | publish_builds | 4 |
| events | analytics_events | 87 |
| aiUsageEvents | ai_usage_events | 1 |
| contentSafetyReviews | content_safety_reviews | 2 |
| paymentOrders | payment_orders | 2 |
| auditLog | audit_log | 72 |
| inviteEmailDeliveries | invite_email_deliveries | 12 |

## 执行顺序

1. 新建 PostgreSQL / Supabase 数据库。
2. 在目标库执行 `docs/database-schema.sql`，或设置 `DATABASE_URL` 后运行 `npm run db:schema`。
3. 设置 `DATABASE_URL`。
4. 运行 `npm run db:schema`。
5. 运行 `npm run db:import-json`。
6. 运行 `npm run db:verify`，确认 `Result: PASS`。
7. 设置 `PLAYDRAMA_STORAGE_DRIVER=postgres` 后重启 API。
8. 运行 `npm run readiness:api` 和 `npm run launch:gate`。

## PowerShell 模板

```powershell
cd D:\代码\playdrama-studio
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run db:schema
npm run db:import-json
npm run db:verify
$env:PLAYDRAMA_STORAGE_DRIVER = "postgres"
npm run api
```

## 注意

- 不要把真实 `DATABASE_URL` 写进代码仓库。
- 导入前先备份本地 JSON 数据和目标云数据库。
- 当前 PostgreSQL 驱动适合内测迁移验证，正式大规模商用前还要继续做增量写入优化。
