# 真实账号接入计划

## 2026-05-21 Update - Tencent SMS Auth

Project now supports `AUTH_PROVIDER=sms-code` for phone-number login using Tencent Cloud SMS:

```env
AUTH_PROVIDER=sms-code
AUTH_SMS_CODE_READY=true
SMS_PROVIDER=tencent-sms
TENCENT_SMS_DRY_RUN=false
TENCENTCLOUD_SECRET_ID=<secret id>
TENCENTCLOUD_SECRET_KEY=<secret key>
TENCENT_SMS_SDK_APP_ID=<sms app id>
TENCENT_SMS_SIGN_NAME=<approved sign name>
TENCENT_SMS_TEMPLATE_ID=<approved template id>
TENCENT_SMS_TEMPLATE_PARAMS=code,ttlMinutes
```

The backend normalizes phone numbers to E.164, sends `SendSms` with TC3-HMAC-SHA256 signing, stores SMS codes and bearer sessions as HMAC hashes only, and verifies the full `sms-code` login chain with `npm run auth:verify` when `AUTH_SMS_CODE_DEV_REVEAL=true`.

## 当前状态

当前本地开发默认使用 `AUTH_PROVIDER=local-demo`。

## 2026-05-21 Update - Email Code Auth

项目现在新增并启用了 `AUTH_PROVIDER=email-code` 作为阿里云主线的内建生产 Auth 方案：

```env
AUTH_PROVIDER=email-code
AUTH_EMAIL_CODE_READY=true
AUTH_SESSION_SECRET=<strong random secret>
AUTH_PROVIDER_ADAPTER_READY=false
```

这条路线复用阿里云邮件推送发送 6 位登录验证码，并把验证码、会话 token 以 HMAC 哈希形式保存在 PostgreSQL。当前自动验收已通过临时本地 API：`npm run auth:verify` -> `PASS (12/12)`。

上线前最后一步仍然需要真实邮箱收码验收：在浏览器里发送验证码、输入邮箱收到的 6 位验证码、登录后刷新保持会话、退出后 token 被拒绝、邀请链接接受后审计归属正确。全部通过后再设置：

```env
AUTH_PROVIDER_ADAPTER_READY=true
```

Netlify 预览环境已经接入 `AUTH_PROVIDER=netlify-identity`：

```text
https://playdrama-studio-preview.netlify.app
```

已验证：

```text
/api/auth/providers 200
provider=netlify-identity
requestScoped=true
tokenPersistence=netlify-identity
未登录 /api/me 返回 401
/api/readiness auth-provider=true
/api/readiness auth-provider-config=true
/api/readiness auth-secret=true
/api/readiness auth-adapter-verified=false
```

这说明真实账号供应商、配置和托管会话已经接入；但还没有完成真实注册、邮箱确认、登录、退出、邀请接受和审计归属的完整验收，所以 `AUTH_PROVIDER_ADAPTER_READY` 必须继续保持 `false`。

阿里云主线建议先使用 `AUTH_PROVIDER=trusted-identity` 作为生产登录适配层：

```text
AUTH_PROVIDER=trusted-identity
AUTH_TRUSTED_IDENTITY_READY=true
AUTH_TRUSTED_IDENTITY_SECRET=replace-with-strong-shared-secret
AUTH_PROVIDER_ADAPTER_READY=false
```

真实登录服务、网关或函数层负责完成手机号、微信或企业账号登录，并把已验证身份通过 `x-playdrama-identity-*` 请求头转发给 API。API 只在共享密钥校验通过后创建或恢复用户。

它已经支持：

- 按邮箱本地登录
- 本地 bearer token
- 请求级身份隔离
- 新用户自动创建个人工作区
- 审计日志记录登录、退出和业务操作

它还不是正式商用账号系统，因为 token 存在 Node 进程内存里，服务重启后会失效，也没有验证码、OAuth、风控、密码重置、设备管理。

## 推荐路线

### 国内公开版

优先顺序：

1. `trusted-identity` 身份网关，加手机号验证码
2. 微信登录
3. 企业微信或飞书团队登录
4. 邮箱 magic link

原因：国内创作者更容易接受手机号和微信登录，团队协作后续可以接企业组织。

### 海外版

优先顺序：

1. GitHub
2. Google
3. 邮箱 magic link
4. Microsoft

原因：海外开发者、AI 创作者和团队工具用户更常用 OAuth。

## 后端替换点

主要文件：

```text
server/index.mjs
```

优先替换：

```text
requestUserId(req)
loginUser(input)
logoutUser(req)
authProviderStatus()
```

目标：

- `requestUserId(req)` 从真实 session/JWT/OAuth token 里解析用户。
- `loginUser(input)` 交给真实 Auth provider。
- `logoutUser(req)` 清理 provider session。
- 本地 `localSessions` 只保留给开发环境。

## 前端替换点

主要文件：

```text
src/api.ts
src/App.tsx
```

当前前端保存：

```text
playdrama.authToken.v1
```

正式 Auth 接入后：

- 如果 provider 使用 httpOnly cookie，前端不再保存 token。
- 如果 provider 使用 access token，继续在 `api.ts` 统一加请求头。
- 登录 UI 可以替换成手机号、微信、GitHub 或 magic link 按钮。

## 环境变量

```text
AUTH_PROVIDER=local-demo
AUTH_SESSION_SECRET=change-me-before-production
AUTH_PROVIDER_ADAPTER_READY=false
APP_BASE_URL=http://127.0.0.1:5177
```

Netlify Identity 示例：

```text
AUTH_PROVIDER=netlify-identity
NETLIFY_IDENTITY_READY=true
AUTH_PROVIDER_ADAPTER_READY=false
```

Trusted identity 示例：

```text
AUTH_PROVIDER=trusted-identity
AUTH_TRUSTED_IDENTITY_READY=true
AUTH_TRUSTED_IDENTITY_SECRET=
AUTH_PROVIDER_ADAPTER_READY=false
```

Supabase 示例：

```text
AUTH_PROVIDER=supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_PROVIDER_ADAPTER_READY=true
```

Auth.js 示例：

```text
AUTH_PROVIDER=authjs
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_PROVIDER_ADAPTER_READY=true
```

微信登录示例：

```text
AUTH_PROVIDER=wechat
WECHAT_LOGIN_APP_ID=
WECHAT_LOGIN_APP_SECRET=
AUTH_PROVIDER_ADAPTER_READY=true
```

`AUTH_PROVIDER_ADAPTER_READY=true` 只能在真实登录、退出、会话恢复、邀请接受和审计归属全部验收后设置。它是上线门禁的人工确认位，不是开发环境默认值。

## 验收脚本

设置真实认证供应商并启动 API 后，先运行：

```powershell
$env:PLAYDRAMA_API_BASE = "https://YOUR-STAGING-API"
$env:AUTH_TEST_PROVIDER = "trusted-identity"
$env:AUTH_TEST_IDENTITY_SECRET = "same-as-AUTH_TRUSTED_IDENTITY_SECRET"
npm run auth:verify
```

本地 trusted identity 代理、阿里云网关或预发环境会通过这些请求头把身份传给 API：

```text
x-playdrama-identity-provider
x-playdrama-identity-id
x-playdrama-identity-email
x-playdrama-identity-name
x-playdrama-identity-secret
```

脚本会检查：

- `/api/auth/providers` 可读，且不是 `local-demo`。
- 外部供应商模式下，本地 `/api/auth/login` 被拒绝。
- `/api/me` 可以通过供应商身份创建或恢复会话。
- 刷新会话后 user/workspace 稳定。
- `/api/workspaces` 可以按身份读取。
- `auth.provider_signup` 审计归属到测试身份。

脚本通过后仍不能直接把 `AUTH_PROVIDER_ADAPTER_READY=true`。还需要在浏览器里完成真实注册或供应商创建账号、邮箱确认、登录、刷新恢复、退出、团队邀请接受和审计归属验收。

## 验收清单

- 未登录访问项目写接口会被拒绝。
- 登录后 `/api/me` 返回真实用户。
- 两个不同浏览器登录不同用户，不会互相覆盖。
- 新用户第一次登录会创建个人工作区。
- 邀请成员后，被邀请用户能进入对应工作区。
- 审计日志里的 `userId` 是真实登录用户。
- 服务重启后会话仍按 provider 规则可恢复或正确失效。
- 退出登录后 token/cookie 失效。

## 上线前安全要求

- 不把 service role key 暴露给前端。
- 生产环境使用 HTTPS。
- token 或 cookie 必须有过期时间。
- 管理员权限必须来自服务端校验，不相信前端传入角色。
- 邀请链接必须有过期时间和一次性校验。
