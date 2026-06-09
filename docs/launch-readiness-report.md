# PlayDrama Studio 上线商用准备报告

生成时间：2026-05-21T04:15:48.267Z

决策：NO-GO

进度：16/17

## 使用方式

1. 按下面 TODO 项逐个找负责人开通服务和填写环境变量。
2. 真实密钥只写入部署环境或本机 `.env`，不要写进代码仓库。
3. 每完成一项后运行 `npm run prod:verify`。
4. 上线前运行 `npm run readiness:api` 和 `npm run launch:gate`。

## 阻塞项

### TODO 部署 Deploy / 公网 HTTPS 应用地址

- 负责人：开发/运维负责人
- 缺少字段：APP_BASE_URL
- 处理动作：部署后把 APP_BASE_URL 设置为 HTTPS 公网域名。
- 验收方式：公网 HTTPS 域名访问前端和 API，npm run readiness:api 指向预发域名通过。

## 全量清单

### PASS 数据库 Database / PostgreSQL / Supabase

- 负责人：开发/云数据库负责人
- 缺少字段：无
- 处理动作：设置 PLAYDRAMA_STORAGE_DRIVER=postgres，配置 DATABASE_URL 或启用 Netlify Database，并运行迁移和 db:verify。
- 验收方式：执行 docs/database-schema.sql，运行 npm run db:import-json 和 npm run db:verify。

### PASS 登录 Auth / 真实账号供应商

- 负责人：开发/账号体系负责人
- 缺少字段：无
- 处理动作：接入 trusted-identity、Supabase Auth、Auth.js、微信登录或手机号登录。
- 验收方式：用真实账号登录，刷新后会话仍有效，/api/me 返回对应用户。

### PASS 登录 Auth / 账号供应商配置

- 负责人：开发/账号体系负责人
- 缺少字段：无
- 处理动作：根据 AUTH_PROVIDER 配置对应 URL、Client Key、Server Secret、OAuth 凭证或 trusted identity 共享密钥。
- 验收方式：运行 npm run prod:verify，确认账号供应商配置项通过。

### PASS 登录 Auth / 生产会话密钥

- 负责人：开发/运维负责人
- 缺少字段：无
- 处理动作：配置高强度 AUTH_SESSION_SECRET，或使用 Netlify Identity / trusted identity 上游托管会话。
- 验收方式：重启 API 后确认正式 Auth session/JWT 校验正常。

### PASS 登录 Auth / 真实登录适配器验收

- 负责人：开发/账号体系负责人
- 缺少字段：无
- 处理动作：完成真实登录、退出、会话恢复、邀请接受、审计归属验收后设置 AUTH_PROVIDER_ADAPTER_READY=true。
- 验收方式：完成登录、退出、会话恢复、邀请接受、审计归属验收后再设置 AUTH_PROVIDER_ADAPTER_READY=true。

### PASS 邮件 Email / 真实邮件服务

- 负责人：运营/邮件服务负责人
- 缺少字段：无
- 处理动作：国内商用优先 EMAIL_PROVIDER=aliyun-directmail 或 tencent-ses；海外测试可接 webhook。
- 验收方式：使用 EMAIL_PROVIDER=aliyun-directmail 发送真实邀请邮件，收件箱收到邮件。

### PASS 邮件 Email / 阿里云邮件推送凭证和发信地址

- 负责人：运营/阿里云邮件负责人
- 缺少字段：无
- 处理动作：完成阿里云邮件推送发信域名或发信地址验证，配置 AccessKey、发信地址和回调密钥。
- 验收方式：阿里云邮件推送发信地址验证通过，真实 invite delivery 返回 providerMessageId。

### PASS 邮件 Email / 真实发信模式

- 负责人：运营/阿里云邮件负责人
- 缺少字段：无
- 处理动作：真实 staging 前关闭邮件服务 dry-run 模式。
- 验收方式：ALIYUN_DM_DRY_RUN=false 后发送一封 staging 邀请。

### PASS AI 模型 AI / 国内商用模型供应商

- 负责人：AI产品/模型负责人
- 缺少字段：无
- 处理动作：国内公开商用优先选择 deepseek、qwen、doubao 或 zhipu。
- 验收方式：用主模型生成一次剧情、分支和变量建议。

### PASS AI 模型 AI / 模型 API Key

- 负责人：AI产品/模型负责人
- 缺少字段：无
- 处理动作：根据 AI_PROVIDER 配置对应 API Key。
- 验收方式：记录一次模型调用成本和失败重试日志。

### PASS AI 模型 AI / 默认模型名称

- 负责人：AI产品/模型负责人
- 缺少字段：无
- 处理动作：配置当前供应商的默认商用模型名，例如 deepseek-chat、qwen-plus、doubao-pro 或 glm-4。
- 验收方式：确认 /api/ai/providers 显示当前默认模型名，并完成一次真实生成。

### PASS AI 模型 AI / 真实模型适配器验收

- 负责人：AI工程/模型负责人
- 缺少字段：无
- 处理动作：完成真实剧情生成、分支生成、角色设定、质量检查调用后设置 AI_PROVIDER_ADAPTER_READY=true。
- 验收方式：story_outline、expand_branch、character_bible、story_quality_check 四类任务至少各成功一次。

### PASS AI 模型 AI / 模型成本统计

- 负责人：AI工程/财务负责人
- 缺少字段：无
- 处理动作：记录每次模型调用的 provider、model、token、成本估算、workspaceId 和 projectId。
- 验收方式：模型调用日志包含 provider、model、token、成本估算、workspaceId、projectId。

### PASS 支付 Payment / 支付供应商

- 负责人：商业化/支付负责人
- 缺少字段：无
- 处理动作：内测先配置 PAYMENT_PROVIDER=sandbox；正式收款接入支付宝、微信支付或 Stripe。
- 验收方式：完成 PAYMENT_PROVIDER=sandbox 沙盒下单、订单落库和付费结局解锁。

### PASS 支付 Payment / 支付密钥

- 负责人：商业化/支付负责人
- 缺少字段：无
- 处理动作：沙盒支付需完成 PAYMENT_SANDBOX_VERIFIED；真实支付需配置对应商户号、密钥和回调密钥。
- 验收方式：npm run payment:sandbox:verify 通过；真实支付接入后再验签回调和伪造回调拒绝。

### PASS 合规 Safety / 内容安全策略

- 负责人：合规/内容安全负责人
- 缺少字段：无
- 处理动作：启用 CONTENT_SAFETY_PROVIDER=local-rules 并完成本地策略验收，或接入内容审核服务并配置 CONTENT_SAFETY_API_KEY。
- 验收方式：对测试敏感内容返回拦截，对正常剧情返回通过。

### TODO 部署 Deploy / 公网 HTTPS 应用地址

- 负责人：开发/运维负责人
- 缺少字段：APP_BASE_URL
- 处理动作：部署后把 APP_BASE_URL 设置为 HTTPS 公网域名。
- 验收方式：公网 HTTPS 域名访问前端和 API，npm run readiness:api 指向预发域名通过。
