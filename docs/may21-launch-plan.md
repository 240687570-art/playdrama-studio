# PlayDrama Studio 5月21日商用上线作战清单

生成时间：2026-05-21T04:15:48.002Z
目标日期：2026-05-21
当前决策：NO-GO
当前进度：16/17

## 当前已完成

- 数据库 Database / PostgreSQL / Supabase：Aliyun RDS PostgreSQL is connected, schema is applied, JSON data is imported, and db:verify passed.
- 登录 Auth / 真实账号供应商：AUTH_PROVIDER=trusted-identity is configured.
- 登录 Auth / 账号供应商配置：AUTH_TRUSTED_IDENTITY_READY=true and AUTH_TRUSTED_IDENTITY_SECRET are configured.
- 登录 Auth / 生产会话密钥：Trusted identity gateway manages the production session.
- 登录 Auth / 真实登录适配器验收：已通过商用门禁。
- 邮件 Email / 真实邮件服务：已通过商用门禁。
- 邮件 Email / 阿里云邮件推送凭证和发信地址：已通过商用门禁。
- 邮件 Email / 真实发信模式：已通过商用门禁。
- AI 模型 AI / 国内商用模型供应商：已通过商用门禁。
- AI 模型 AI / 模型 API Key：已通过商用门禁。
- AI 模型 AI / 默认模型名称：已通过商用门禁。
- AI 模型 AI / 真实模型适配器验收：已通过商用门禁。
- AI 模型 AI / 模型成本统计：已通过商用门禁。
- 支付 Payment / 支付供应商：已通过商用门禁。
- 支付 Payment / 支付密钥：已通过商用门禁。
- 合规 Safety / 内容安全策略：已通过商用门禁。

## 明天需要你配合完成

### 部署 Deploy / 公网 HTTPS 应用地址

- 缺少字段：APP_BASE_URL
- 明天动作：准备正式或预发 HTTPS 域名，配置 APP_BASE_URL，并确认前端和 API 的公网访问地址。

## 我可以继续推进的代码/验收项


## 明天验收命令

```powershell
cd D:\代码\playdrama-studio
$env:APP_BASE_URL='https://playdrama-studio-preview.netlify.app'
$env:PLAYDRAMA_API_BASE='https://playdrama-studio-preview.netlify.app'
npm run commercial:smoke
npm run launch:gate
```

## 上线口径

- `commercial:smoke` 和 `launch:gate` 都必须最终输出 GO。
- 真实密钥只填 Netlify 环境变量或本机 `.env`，不要写入代码。
- 没有完成真实发信、真实模型调用、内容安全、支付沙箱前，不进入公开商用。
