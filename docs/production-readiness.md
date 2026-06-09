# 商用环境体检

这份文档给运营、AI 员工和后续开发者使用。目标是不用阅读云服务商的技术字段，也能知道平台正式商用前还缺什么。

## 一键检查

在项目目录运行：

```powershell
cd D:\代码\playdrama-studio
npm run prod:verify
```

也可以直接看产品侧边栏的 `商用体检` 卡片。前端读取 `/api/health` 的 `commercialReadiness` 字段，会把最重要的缺项显示给运营和接手团队。

如果只想给监控或部署脚本读取体检结果，可以请求：

```text
GET /api/readiness
```

运行中的 API 合约验收：

```powershell
npm run readiness:api
```

这个命令检查 API 是否在线、`/api/health` 和 `/api/readiness` 是否一致、体检项是否仍是 17 项、每一项是否都有运营可读字段。它不要求当前环境必须商用通过，只验证“拦截发布的信息是否可靠”。

真正上线前使用上线门禁：

```powershell
npm run launch:gate
```

5 月 21 日上线作战清单：

```powershell
npm run launch:may21
```

这个命令会生成 `docs/may21-launch-plan.md` 和 `docs/may21-launch-plan.json`，把“我方可继续推进”和“需要业务账号/密钥配合”的事项分开。

公网商用冒烟验收：

```powershell
$env:PLAYDRAMA_API_BASE = "https://playdrama-studio-preview.netlify.app"
npm run commercial:smoke
```

这个命令检查线上首页、健康检查、数据库、登录保护、AI/邮件状态和商用门禁。基础链路通过但商用门禁未通过时，它会返回失败退出码，这是为了阻止误上线。

部署前预检：

```powershell
npm run deploy:preflight
```

门禁输出 `GO` 才允许进入商用灰度；输出 `NO-GO` 时会列出阻塞项并返回失败退出码。部署时也可以指定运行中的 API：

```powershell
$env:PLAYDRAMA_API_BASE = "https://你的预发域名"
npm run launch:gate
```

生成可交接的上线准备报告：

```powershell
npm run launch:report
```

报告会写入：

```text
docs/launch-readiness-report.md
docs/launch-readiness-report.json
```

Markdown 适合发给运营、服务商或 AI 员工；JSON 适合后续接入自动化任务看板。

命令行脚本、`/api/health` 和 `/api/readiness` 都使用同一份规则：

```text
server/readiness.mjs
```

结果说明：

- `PASS`：这一项的关键环境变量已经配置。
- `TODO`：这一项仍然缺配置，后面会显示缺少的字段和处理动作。
- `BLOCKED`：只要还有 TODO，当前环境就不能标记为正式商用。

本地开发环境出现 `BLOCKED` 是正常的，因为真实数据库、真实登录、邮件、模型、支付和公网域名都需要外部账号。

## 必须完成的外部配置

### 数据库

目标：数据不再只保存在本地 JSON 文件里。

必须配置：

```text
PLAYDRAMA_STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://...
```

完成后运行：

```powershell
npm run db:import-json
npm run db:verify
```

### 登录

目标：替换 `local-demo` 登录。

必须配置：

```text
AUTH_PROVIDER=trusted-identity 或 supabase 或 authjs 或 wechat
AUTH_TRUSTED_IDENTITY_READY=true
AUTH_TRUSTED_IDENTITY_SECRET=高强度共享密钥
AUTH_SESSION_SECRET=高强度随机密钥
AUTH_PROVIDER_ADAPTER_READY=true
```

当前本地 demo 登录只适合内测，不适合公开商用。

供应商还需要各自配置：

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
WECHAT_LOGIN_APP_ID=
WECHAT_LOGIN_APP_SECRET=
```

`AUTH_PROVIDER_ADAPTER_READY=true` 只能在真实登录、退出、会话恢复、邀请接受、审计归属全部验收后设置。

### 邮件

目标：团队邀请、注册验证和运营通知能真实送达。

国内商用优先：

```text
EMAIL_PROVIDER=aliyun-directmail
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_DM_ACCOUNT_NAME=
EMAIL_CALLBACK_SECRET=
EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256
ALIYUN_DM_DRY_RUN=false
ALIYUN_DM_LIVE_TEST_EMAIL=
```

演练阶段可以用 `ALIYUN_DM_DRY_RUN=true`，但正式 staging 必须关闭。

真实 staging 发信验收：

```powershell
npm run email:aliyun-live:verify
```

### AI 模型

目标：国内公开商用版默认接国内大模型，不把 OpenAI/GPT 作为中国大陆公开商用默认能力。

可选供应商：

```text
AI_PROVIDER=deepseek 或 qwen 或 doubao 或 zhipu
AI_MODEL_NAME=
AI_PROVIDER_ADAPTER_READY=true
AI_COST_TRACKING_READY=true
DEEPSEEK_API_KEY=
QWEN_API_KEY=
DOUBAO_API_KEY=
ZHIPU_API_KEY=
```

只需要先选一个主供应商，跑通剧情生成、分支生成、内容安全和成本统计，再做多供应商路由。

`AI_PROVIDER_ADAPTER_READY=true` 只能在真实 `story_outline`、`expand_branch`、`character_bible`、`story_quality_check` 四类任务至少各成功一次后设置。`AI_COST_TRACKING_READY=true` 只能在调用日志能记录 provider、model、token、成本估算、workspaceId 和 projectId 后设置。

### 内容安全

目标：用户生成剧情、角色和发布内容进入审核链路。

必须配置：

```text
CONTENT_SAFETY_PROVIDER=真实审核服务名
CONTENT_SAFETY_API_KEY=
```

正式运营前要把敏感词、涉政涉黄涉暴、版权和未成年人保护规则写入审核流程。

### 支付

目标：验证付费章节、结局解锁或创作者 SaaS 订阅。

可选供应商：

```text
PAYMENT_PROVIDER=sandbox 或 wechat 或 alipay 或 stripe
PAYMENT_SANDBOX_READY=true
PAYMENT_SANDBOX_VERIFIED=true
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_SERIAL_NO=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

中国大陆正式收款优先支付宝和微信支付；海外版再考虑 Stripe。没有商户资料前，先用 `npm run payment:sandbox:verify` 完成付费结局沙盒验收，但不要把 sandbox 宣称为真实收款能力。

### 部署

目标：平台有公网 HTTPS 地址。

必须配置：

```text
APP_BASE_URL=https://你的正式域名
```

`127.0.0.1`、`localhost` 和 `http://` 都只能用于本地开发。

## 交接验收顺序

1. 填写 `.env`，不要把真实密钥提交到代码仓库。
2. 运行 `npm run prod:verify`，直到核心项不再 `BLOCKED`。
3. 运行 `npm run db:verify`。
4. 发送一封真实邀请邮件，并确认投递回调能更新状态。
5. 用真实账号登录，创建作品，发布 H5 预览。
6. 用主模型生成一次剧情，并记录成本。
7. 用支付沙箱完成一次下单、回调、解锁。

只有以上流程跑通，才能把环境称为“可商用灰度”。
