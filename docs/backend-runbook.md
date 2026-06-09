# 后端服务运行手册

## 这是什么

这是 PlayDrama Studio 的第一版本地 API 服务。

它现在不是正式生产后端，而是给后续商业化开发使用的“接口骨架”。前端、AI 员工、后端工程师可以先按这些接口协作，之后再把本地 JSON 数据库换成真实云数据库。

## 启动命令

```powershell
cd D:\代码\playdrama-studio
npm run api
```

默认地址：

```text
http://127.0.0.1:8787
```

默认监听：

```text
HOST=127.0.0.1
PORT=8787
```

如果 8787 已经被其他服务占用，可以临时换端口：

```powershell
$env:PORT = "8788"
npm run api
```

健康检查：

```powershell
Invoke-WebRequest http://127.0.0.1:8787/api/health -UseBasicParsing
```

健康检查会返回当前存储状态：

```json
{
  "storage": {
    "driver": "json",
    "path": "D:\\代码\\playdrama-studio\\server\\data\\playdrama-db.json",
    "databaseUrlConfigured": false
  }
}
```

切到 PostgreSQL / Supabase 前，先参考：

```text
docs/database-schema.sql
docs/cloud-database-migration.md
```

## 本地数据库文件

API 会自动创建本地数据文件：

```text
D:\代码\playdrama-studio\server\data\playdrama-db.json
```

它会保存：

- 作品项目
- 发布快照
- 玩家埋点事件
- 用户、工作区、成员权限
- 操作审计日志

这已经能避免“服务重启后数据丢失”。但它仍然不是正式生产数据库，多人协作和公开商用前要迁移到 PostgreSQL、Supabase 或云数据库。

## 当前能做什么

- 查看当前模拟用户：`GET /api/me`
- 按工作区查看当前用户：`GET /api/me?workspaceId=wks_001`
- 本地登录：`POST /api/auth/login`
- 本地退出：`POST /api/auth/logout`
- 查看认证供应商：`GET /api/auth/providers`
- 查看邮件供应商：`GET /api/email/provider`
- 接受邀请：`POST /api/invitations/{token}/accept`
- 查看工作区：`GET /api/workspaces`
- 新建工作区：`POST /api/workspaces`
- 创建作品项目：`POST /api/workspaces/wks_001/projects`
- 查看工作区作品列表：`GET /api/workspaces/wks_001/projects`
- 读取作品项目：`GET /api/projects/{projectId}`
- 更新作品项目：`PATCH /api/projects/{projectId}`
- 删除作品项目：`DELETE /api/projects/{projectId}`
- 生成发布快照：`POST /api/projects/{projectId}/builds`
- 读取发布快照：`GET /api/builds/{buildId}`
- 玩家读取发布内容：`GET /api/play/{buildId}`
- 记录玩家事件：`POST /api/play/{buildId}/events`
- 查看埋点事件：`GET /api/analytics/events`
- 查看国内模型供应商：`GET /api/ai/providers`
- 调用 AI 任务占位接口：`POST /api/ai/{task}`
- 查看当前成员权限：`GET /api/workspaces/wks_001/members`
- 邀请成员：`POST /api/workspaces/wks_001/members`
- 重新发送邀请：`POST /api/workspaces/{workspaceId}/members/{memberId}/resend`
- 取消邀请：`DELETE /api/workspaces/{workspaceId}/members/{memberId}/invite`
- 查看邀请邮件投递历史：`GET /api/workspaces/{workspaceId}/invite-deliveries`
- 更新邀请邮件投递状态：`PATCH /api/workspaces/{workspaceId}/invite-deliveries/{deliveryId}`
- 查看操作审计：`GET /api/audit`

当前角色预设：

- `owner`：全部权限
- `editor`：读取、编辑、发布项目
- `analyst`：读取项目和查看数据
- `viewer`：只读查看项目

作品生命周期：

- `active`：正常显示在工作区作品列表
- `archived`：从活跃列表隐藏，但仍保存在本地数据库

当前前端归档走 `PATCH /api/projects/{projectId}`，不会硬删除数据。

## 本地登录骨架

当前登录是 `local-demo` 模式，不是最终商用鉴权。

登录示例：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"creator@example.com","displayName":"Creator"}'
```

如果邮箱不存在，后端会创建一个本地用户和个人工作区；如果邮箱已存在，后端会切换到该用户。后续接 Supabase Auth、手机号、微信、GitHub 或企业 SSO 时，优先替换这个入口。

登录成功会返回 `authToken`。前端会保存到浏览器本地存储，并在后续请求里带：

```text
Authorization: Bearer <authToken>
```

这已经支持请求级身份隔离：两个不同 token 同时访问 `/api/me` 会看到各自的用户。当前 token 仍是本地内存态，服务重启后会失效，正式商用前要替换成真实 Auth provider 的会话或 JWT。

## 邀请链接骨架

管理员邀请成员后，API 会返回：

```text
inviteUrl
```

本地前端会显示“本地邀请链接”。打开链接后，前端会调用：

```text
POST /api/invitations/{token}/accept
```

接受成功后，成员状态会从 `invited` 变成 `active`，并获得本地登录 token。

默认邀请有效期：

```text
INVITE_EXPIRES_DAYS=7
```

当前邮件发送是本地日志模式：

```text
EMAIL_PROVIDER=log
```

邀请时 API 会返回 `emailDelivery`，同时后端日志会记录收件人、角色、邀请链接和过期时间。接真实邮件服务时，替换 `sendInviteEmail` 即可。

如果要在本地模拟真实邮件服务，先启动测试桥：

```powershell
npm run email:webhook-dev
```

再用 webhook 模式启动 API：

```powershell
$env:EMAIL_PROVIDER='webhook'
$env:EMAIL_WEBHOOK_URL='http://127.0.0.1:8790/send'
$env:EMAIL_DEV_WEBHOOK_BASE='http://127.0.0.1:8790'
npm run api
```

查看测试桥收到的邮件：

```powershell
Invoke-RestMethod http://127.0.0.1:8790/deliveries
```

端到端验收：

```powershell
$env:PLAYDRAMA_API_BASE='http://127.0.0.1:8787'
$env:EMAIL_DEV_WEBHOOK_BASE='http://127.0.0.1:8790'
npm run email:webhook:verify
```

团队运营常用动作：

- 成员没收到邮件：点“重发”，后端刷新邀请 token 和过期时间。
- 发错人或不再邀请：点“取消”，成员状态变成 `cancelled`，旧邀请链接不能再接受。
- 查发送记录：团队面板会显示最近邀请邮件，也可以调用 `GET /api/workspaces/{workspaceId}/invite-deliveries`。
- 服务商回调或人工修正：调用 `PATCH /api/workspaces/{workspaceId}/invite-deliveries/{deliveryId}`，支持 `logged / queued / sent / failed / bounced`。
- 正式服务商回调：调用 `POST /api/email/callbacks/{provider}`，请求头带 `EMAIL_CALLBACK_SECRET`，用 `providerMessageId` 自动匹配投递记录。

服务商回调示例：

```powershell
Invoke-RestMethod http://127.0.0.1:8788/api/email/callbacks/webhook `
  -Method POST `
  -Headers @{ Authorization = 'Bearer local-callback-secret' } `
  -ContentType 'application/json' `
  -Body '{"providerMessageId":"dev-message-id","status":"delivered"}'
```

HMAC 回调模式：

```powershell
$env:EMAIL_CALLBACK_SIGNATURE_MODE='hmac-sha256'
```

签名算法：

```text
hex(hmac_sha256(raw_body, EMAIL_CALLBACK_SECRET))
```

签名请求头：

```text
x-playdrama-signature: sha256=<hex>
```

认证供应商接入计划：

```text
docs/auth-provider-plan.md
```

邮件服务接入计划：

```text
docs/email-provider-plan.md
```

服务商推荐顺序也会通过接口返回：

```powershell
Invoke-RestMethod http://127.0.0.1:8788/api/email/provider
```

当前推荐：阿里云邮件推送、腾讯云 SES、Resend、SendGrid。项目主线先选阿里云，腾讯云 SES 作为备选，海外测试可用 Resend。

阿里云邮件推送启动示例：

```powershell
$env:EMAIL_PROVIDER='aliyun-directmail'
$env:ALIYUN_ACCESS_KEY_ID='replace-me'
$env:ALIYUN_ACCESS_KEY_SECRET='replace-me'
$env:ALIYUN_DM_ACCOUNT_NAME='noreply@example.com'
$env:ALIYUN_DM_REGION='cn-hangzhou'
$env:ALIYUN_DM_FROM_ALIAS='PlayDrama Studio'
$env:EMAIL_CALLBACK_SECRET='replace-me'
$env:EMAIL_CALLBACK_SIGNATURE_MODE='hmac-sha256'
npm run api
```

阿里云干跑演练：

```powershell
$env:EMAIL_PROVIDER='aliyun-directmail'
$env:ALIYUN_DM_DRY_RUN='true'
npm run api
```

一键验收阿里云干跑链路：

```powershell
npm run email:aliyun-dry-run:verify
```

一键验收阿里云真实 staging 投递：

```powershell
$env:ALIYUN_DM_LIVE_TEST_EMAIL='internal-test@example.com'
npm run email:aliyun-live:verify
```

阿里云上线前体检：

```powershell
(Invoke-RestMethod http://127.0.0.1:8788/api/email/provider).aliyunDirectMail.readiness
```

腾讯云 SES 启动示例：

```powershell
$env:EMAIL_PROVIDER='tencent-ses'
$env:TENCENTCLOUD_SECRET_ID='replace-me'
$env:TENCENTCLOUD_SECRET_KEY='replace-me'
$env:TENCENT_SES_FROM_EMAIL='PlayDrama <noreply@example.com>'
$env:TENCENT_SES_REGION='ap-guangzhou'
$env:TENCENT_SES_TEMPLATE_ID='12345'
npm run api
```

未配置腾讯云凭证时，API 仍能启动，但邀请邮件会记录为 `failed`，错误信息会提示缺少变量。

腾讯云干跑演练：

```powershell
$env:EMAIL_PROVIDER='tencent-ses'
$env:TENCENT_SES_DRY_RUN='true'
npm run api
```

干跑会生成 `dryrun_` 消息 ID，不会发真实邮件。用于检查邀请、投递记录、页面展示和运营流程。

一键验收干跑链路：

```powershell
npm run email:tencent-dry-run:verify
```

验收脚本会检查 API 健康、provider 是否为 `tencent-ses`、干跑是否开启、邀请是否生成、投递记录是否为 `queued`、消息 ID 是否为 `dryrun_` 开头。

一键验收真实 staging 投递：

```powershell
$env:TENCENT_SES_LIVE_TEST_EMAIL='internal-test@example.com'
npm run email:tencent-live:verify
```

实发验收脚本只在真实凭证、发件地址、模板、回调密钥、HMAC、干跑关闭和测试收件箱都配置好后才会发起邀请。缺任一项会直接失败并列出原因。

腾讯云上线前体检：

```powershell
(Invoke-RestMethod http://127.0.0.1:8788/api/email/provider).tencentSes.readiness
```

所有 `ok` 都为 `true` 后，再邀请一个内部测试邮箱做真实投递。

## 给非技术接手人的说明

前端页面负责“看得见的编辑器和预览”。

后端服务负责“保存作品、发布版本、记录数据、连接 AI 模型”。

现在后端数据会保存到本地 JSON 数据库文件。下一阶段要把这个文件数据库迁移到云数据库，建议优先接 PostgreSQL 或 Supabase。

## PostgreSQL / Supabase 模式

先执行：

```text
docs/database-schema.sql
```

再导入本地 JSON 数据：

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run db:import-json
npm run db:verify
```

切换后端存储驱动：

```powershell
$env:PLAYDRAMA_STORAGE_DRIVER = "postgres"
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run api
```

当前 PostgreSQL 驱动适合内测迁移验证。生产版建议继续把全量快照保存改成按业务操作增量写入。

数据库验收脚本说明：

```text
docs/postgres-verification.md
```

前端侧边栏也会显示数据库迁移状态，非技术接手人可以直接看“数据库 · json/postgres”以及缺失项。

## AI 模型原则

中国大陆公开上线版本，默认使用国内模型供应商：

- DeepSeek
- 通义千问
- 豆包
- 智谱 GLM

OpenAI/GPT 相关能力默认不放在中国大陆公开版本里。海外版可以另开配置。

详细规则看：

```text
docs/MODEL_PROVIDER_STRATEGY.md
```

## 下一步开发

优先顺序：

1. 把本地 JSON 数据库迁移到 PostgreSQL / Supabase。
2. 加账号登录和工作区权限。
3. 加发布后的公开播放页。
4. 把 AI 占位接口接入真实国内模型。
5. 加运营数据看板。
