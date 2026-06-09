# 云数据库迁移手册

## 目标

把当前本地数据文件：

```text
server/data/playdrama-db.json
```

迁移到 PostgreSQL / Supabase，让项目支持多人内测、云端保存和后续部署。

## 推荐顺序

1. 新建 PostgreSQL 或 Supabase 项目。
2. 执行 `docs/database-schema.sql`，或设置 `DATABASE_URL` 后运行 `npm run db:schema`。
3. 把 `.env.example` 复制成 `.env`，填写 `DATABASE_URL`。
4. 运行 `npm run db:schema` 确认目标库表结构是最新版本。
5. 运行一次性导入脚本：`npm run db:import-json`。
6. 将 `PLAYDRAMA_STORAGE_DRIVER` 从 `json` 改成 `postgres`。
7. 跑接口回归：`/api/health`、`/api/workspaces`、项目保存、发布、埋点、审计。

## 当前 Netlify 预览环境

Netlify 预览站点已经使用 Netlify Database / Neon Postgres：

```text
https://playdrama-studio-preview.netlify.app
```

已配置环境变量：

```text
PLAYDRAMA_STORAGE_DRIVER=postgres
NETLIFY_DATABASE_READY=true
APP_BASE_URL=https://playdrama-studio-preview.netlify.app
```

已应用迁移：

```text
netlify/database/migrations/20260519000100_create-playdrama-schema/migration.sql
netlify/database/migrations/20260519000200_seed-playdrama-demo/migration.sql
```

线上验证结果：

```text
/api/health 200
storage.driver=postgres
storage.productionReady=true
/api/readiness database item=PASS
commercialReadiness=blocked 3/17
```

这说明数据库这一项已经从商用阻塞项中移除。后续如果改用 Supabase 或独立 PostgreSQL，仍可按下面的 `DATABASE_URL` 流程迁移。

## 当前代码状态

当前后端已经能通过 `/api/health` 暴露存储驱动、JSON 数据路径和 `DATABASE_URL` 是否配置。

当前可运行版本已经有两个存储驱动：

- `json`：默认本地文件模式。
- `postgres`：PostgreSQL / Supabase / Netlify Database 模式，需要先执行 schema，并配置 `DATABASE_URL` 或 `NETLIFY_DATABASE_READY=true`。

注意：当前 PostgreSQL 驱动仍是内测期实现，会在每次保存时把内存快照同步回数据库，适合 beta 小规模验证；生产版再拆成按表、按操作的增量写入。

## 导入命令

先生成当前本地数据迁移报告：

```powershell
cd D:\代码\playdrama-studio
npm run db:report
```

报告会写入：

```text
docs/database-migration-report.md
docs/database-migration-report.json
```

PowerShell 示例：

```powershell
cd D:\代码\playdrama-studio
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run db:import-json
```

如果本地 JSON 数据库不在默认路径，额外设置：

```powershell
$env:PLAYDRAMA_DB_PATH = "D:\代码\playdrama-studio\server\data\playdrama-db.json"
```

## 当前数据映射

- `users` -> `app_users`
- `workspaces` -> `workspaces`
- `memberships` -> `workspace_memberships`
- `projects` -> `projects`
- `builds` -> `publish_builds`
- `events` -> `analytics_events`
- `auditLog` -> `audit_log`
- `inviteEmailDeliveries` -> `invite_email_deliveries`

## 验证

健康检查应显示：

```json
{
  "storage": {
    "driver": "postgres",
    "databaseUrlConfigured": true
  }
}
```

当前本地版本会显示：

```json
{
  "storage": {
    "driver": "json",
    "databaseUrlConfigured": false
  }
}
```

## 注意

中国大陆公开商用版的 AI 模型仍按 `docs/MODEL_PROVIDER_STRATEGY.md` 执行，数据库迁移不改变模型合规策略。
