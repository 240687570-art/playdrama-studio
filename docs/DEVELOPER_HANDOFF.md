# 开发交接手册

## 项目目录

```text
D:\代码\playdrama-studio
```

## 当前技术状态

这是一个本地可运行的前端原型，加第一版本地 API 服务。

当前还没有真实数据库、正式账号、支付、云端部署。

主要代码：

- `src/App.tsx`：创作台、剧情编辑、预览、发布设置、模型路由界面。
- `src/App.css`：界面样式。
- `server/index.mjs`：本地 API 服务，使用 Node 内置 HTTP，无额外后端依赖。
- `docs/`：产品、运营、商业化、AI 团队、后端接口和交接文档。

## 启动命令

前端：

```powershell
cd D:\代码\playdrama-studio
npm run dev
```

默认地址：

```text
http://127.0.0.1:5177
```

后端 API：

```powershell
npm run api
```

默认地址：

```text
http://127.0.0.1:8787
```

如果 8787 端口被占用：

```powershell
$env:PORT = "8788"
npm run api
```

## 验证命令

```powershell
npm run build
npm run lint
node --check server/index.mjs
```

## 当前核心数据

前端核心对象是 `StoryProject`。

它包含：

- 项目信息
- 发布设置
- 模型路由设置
- 剧情节点
- 分支选择
- 条件变量
- 角色信息
- 更新时间

当前前端保存方式：

```text
浏览器 localStorage
```

当前交接和备份方式：

```text
JSON 导入 / 导出
```

当前后端保存方式：

```text
server/data/playdrama-db.json
```

注意：这是本地 JSON 数据库，适合内测和交接。多人协作和正式商用前，要迁移到 PostgreSQL / Supabase / 云数据库。

迁移准备文件：

```text
.env.example
docs/database-schema.sql
docs/cloud-database-migration.md
```

`/api/health` 会返回当前存储驱动、JSON 数据路径和 `DATABASE_URL` 是否已经配置。

PostgreSQL / Supabase 模式：

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run db:import-json
npm run db:verify
$env:PLAYDRAMA_STORAGE_DRIVER = "postgres"
npm run api
```

当前 PostgreSQL 驱动会在保存时同步一份内存快照到数据库，适合内测迁移验证。正式生产前建议继续改成按接口操作的增量写入。

前端侧边栏会读取 `/api/health` 的 `storage` 字段，显示数据库迁移状态和最多 3 个缺失项。

本地登录骨架：

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/me
GET  /api/auth/providers
POST /api/invitations/:token/accept
```

当前是 `local-demo` 模式：按邮箱创建或切换本地用户，并为新用户自动创建个人工作区。它不是最终商用鉴权，但已经把真实登录入口、当前会话和审计归属位置留好了。

登录成功会返回 `authToken`，前端保存在：

```text
playdrama.authToken.v1
```

后续 API 请求会自动带 `Authorization: Bearer <authToken>`。当前 token 存在 Node 进程内存里，服务重启后失效；正式 Auth 接入时可以使用 `AUTH_PROVIDER=trusted-identity`，由上游登录网关校验 session/JWT 后透传 `x-playdrama-identity-*` 请求头；或继续把 `requestUserId(req)` 替换成供应商 SDK 校验。

真实认证接入路线看：

```text
docs/auth-provider-plan.md
```

真实邮件接入路线看：

```text
docs/email-provider-plan.md
```

## 已有后端接口

详细看：

```text
docs/backend-runbook.md
docs/backend-contracts.md
```

当前已经有：

- 用户和工作区接口
- 项目创建、读取、更新、删除接口
- 发布快照接口
- 玩家运行时读取接口
- 玩家事件埋点接口
- 分析事件读取接口
- 国内模型供应商接口
- AI 任务占位接口

## 已经打通的前后端流程

- 保存项目：前端写入 `localStorage`，并尝试同步到 API。
- 重置示例：前端重置后同步到 API。
- 导入 JSON：导入后同步到 API。
- 生成发布包：发布设置面板调用后端 build 接口。
- 玩家选择埋点：生成发布包后，玩家点击选择会记录 `choice_selected` 事件。
- 工作区权限：`/api/me` 返回当前用户、工作区和权限。
- 本地登录：`POST /api/auth/login` 会按邮箱创建或切换当前用户。
- 本地退出：`POST /api/auth/logout` 会回到默认 Creator 用户。
- 工作区切换：`/api/me?workspaceId={workspaceId}` 返回指定工作区会话。
- 新建工作区：`POST /api/workspaces`。
- 工作区作品列表：前端会按当前 `workspaceId` 调用 `/api/workspaces/{workspaceId}/projects`。
- 新建作品：前端创建本地草稿后立即同步到当前工作区 API。
- 复制作品：前端复制当前作品数据，生成新 ID 后保存为新项目。
- 归档作品：前端把 `lifecycleStatus` 更新为 `archived`，不会删除数据库记录。
- 恢复归档：前端把 `lifecycleStatus` 改回 `active`，并重新加入活跃作品列表。
- 项目活动：前端按当前 `project.id` 筛选 `/api/audit`，并支持按 action 筛选。
- 团队成员：`/api/workspaces/wks_001/members` 返回成员列表。
- 邀请成员：`POST /api/workspaces/wks_001/members`，支持 `owner/editor/analyst/viewer`。
- 接受邀请：`POST /api/invitations/{token}/accept` 会把成员状态从 `invited` 改成 `active`。
- 邀请有效期：默认 `INVITE_EXPIRES_DAYS=7`。
- 邮件占位：默认 `EMAIL_PROVIDER=log`，后端会记录邮件发送 payload。
- 本地邮件测试桥：`npm run email:webhook-dev`，API 配置 `EMAIL_PROVIDER=webhook` 和 `EMAIL_WEBHOOK_URL=http://127.0.0.1:8790/send`。
- 重发邀请：`POST /api/workspaces/{workspaceId}/members/{memberId}/resend` 会刷新 token 和过期时间。
- 取消邀请：`DELETE /api/workspaces/{workspaceId}/members/{memberId}/invite` 会把状态改为 `cancelled`。
- 投递历史：`GET /api/workspaces/{workspaceId}/invite-deliveries` 返回最近邀请邮件记录。
- 投递状态：`PATCH /api/workspaces/{workspaceId}/invite-deliveries/{deliveryId}` 更新为 `logged/queued/sent/failed/bounced`。
- 邮件供应商：`GET /api/email/provider` 返回当前 `EMAIL_PROVIDER` 配置状态。
- 邮件服务商推荐：`GET /api/email/provider` 的 `recommendations` 返回阿里云邮件推送、腾讯云 SES、Resend、SendGrid 的推荐顺序。
- 阿里云邮件推送：`EMAIL_PROVIDER=aliyun-directmail`，后端用 HMAC-SHA1 调 `SingleSendMail`，必填 `ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_DM_ACCOUNT_NAME`。
- 阿里云上线体检：`GET /api/email/provider` 的 `aliyunDirectMail.readiness` 返回缺失项，前端团队面板会显示最多 3 个待处理项。
- 阿里云干跑：`ALIYUN_DM_DRY_RUN=true` 时不会调用阿里云，只生成 `dryrun_aliyun_` 投递记录，用来演练流程。
- 阿里云干跑验收：启动干跑 API 后运行 `npm run email:aliyun-dry-run:verify`。
- 腾讯云 SES：保留为备选，`EMAIL_PROVIDER=tencent-ses`，验收脚本为 `npm run email:tencent-dry-run:verify` 和 `npm run email:tencent-live:verify`。
- 邮件回调：`POST /api/email/callbacks/{provider}` 用 `EMAIL_CALLBACK_SECRET` 校验，并按 `providerMessageId` 更新投递状态。开发默认 `EMAIL_CALLBACK_SIGNATURE_MODE=bearer`，正式服务商可切到 `hmac-sha256`。
- 操作审计：`/api/audit` 返回最近项目和发布操作。

## 当前最该做的下一步

把本地 JSON 数据库迁移到云数据库，并把 demo 用户替换成真实登录。

建议顺序：

1. 选择 PostgreSQL / Supabase / 云数据库。
2. 执行 `docs/database-schema.sql` 建 Project、Publish Build、Analytics Event、User、Workspace 表。
3. 用真实 PostgreSQL / Supabase 实例跑一次 `npm run db:import-json`。
4. 跑 `npm run db:verify` 确认表、索引和导入数据。
5. 把内置 demo session 替换成真实登录。
6. 接真实登录，并准备把本地 JSON 数据库迁移到云数据库。

## 模型和合规

国内公开商用版默认使用国内模型供应商，不把 OpenAI/GPT 作为默认公开能力。

必须参考：

```text
docs/MODEL_PROVIDER_STRATEGY.md
```

## 商用环境体检

正式灰度前运行：

```powershell
npm run prod:verify
```

脚本位置：

```text
server/verify-production-readiness.mjs
```

说明文档：

```text
docs/production-readiness.md
```

这个检查会把数据库、登录、邮件、AI 模型、内容安全、支付和公网部署按业务领域列出。只要结果是 `BLOCKED`，就说明当前环境还缺外部账号、密钥或域名，不能对外宣称已经正式商用。
