# 邮件服务接入计划

## 当前状态

当前默认配置：

```text
EMAIL_PROVIDER=log
```

这会把邀请邮件写入后端日志和 `inviteEmailDeliveries` 记录，不会真正发邮件。

## 通用 webhook 适配器

可以先用通用 HTTP 桥接接任何邮件服务：

```text
EMAIL_PROVIDER=webhook
EMAIL_WEBHOOK_URL=https://your-email-bridge.example.com/send
EMAIL_API_KEY=replace-with-provider-or-bridge-key
```

后端会向 `EMAIL_WEBHOOK_URL` 发送：

```json
{
  "id": "mail_xxx",
  "workspaceId": "wks_xxx",
  "memberId": "mem_xxx",
  "provider": "webhook",
  "to": "creator@example.com",
  "subject": "加入工作区",
  "inviteUrl": "http://127.0.0.1:5177/?invite=...",
  "role": "editor",
  "expiresAt": "2026-05-24T00:00:00.000Z",
  "status": "queued"
}
```

建议 webhook 返回：

```json
{
  "id": "provider-message-id",
  "status": "queued"
}
```

如果返回非 2xx 或请求失败，系统会记录为 `failed`。

## 本地测试桥

在没有正式邮件服务账号前，可以先用项目内置测试桥跑通链路：

```powershell
npm run email:webhook-dev
```

默认监听：

```text
http://127.0.0.1:8790/send
```

然后用 webhook 模式启动 API：

```powershell
$env:EMAIL_PROVIDER='webhook'
$env:EMAIL_WEBHOOK_URL='http://127.0.0.1:8790/send'
$env:EMAIL_DEV_WEBHOOK_BASE='http://127.0.0.1:8790'
npm run api
```

端到端验收：

```powershell
$env:PLAYDRAMA_API_BASE='http://127.0.0.1:8787'
$env:EMAIL_DEV_WEBHOOK_BASE='http://127.0.0.1:8790'
npm run email:webhook:verify
```

这个脚本会检查 API 邮件配置、创建邀请、确认 dev webhook 收到 payload、模拟服务商回调，并确认投递历史从 `queued` 更新为 `sent`。

测试桥提供：

```text
GET  /health
GET  /deliveries
POST /send
```

如果设置了 `EMAIL_API_KEY`，测试桥会要求请求头：

```text
Authorization: Bearer <EMAIL_API_KEY>
```

可以用下面的变量模拟服务商返回失败或退信：

```text
EMAIL_DEV_FORCE_STATUS=failed
EMAIL_DEV_FORCE_STATUS=bounced
```

## 状态回写

服务商 webhook 或人工运营可以调用：

```text
PATCH /api/workspaces/{workspaceId}/invite-deliveries/{deliveryId}
```

支持状态：

```text
logged
queued
sent
failed
bounced
```

示例：

```json
{
  "status": "sent",
  "providerMessageId": "provider-msg-001"
}
```

正式服务商回调建议走专用入口：

```text
POST /api/email/callbacks/{provider}
```

请求头二选一：

```text
Authorization: Bearer <EMAIL_CALLBACK_SECRET>
x-email-callback-secret: <EMAIL_CALLBACK_SECRET>
```

默认回调校验模式：

```text
EMAIL_CALLBACK_SIGNATURE_MODE=bearer
```

如果服务商支持 HMAC，可以切换到：

```text
EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256
```

HMAC 模式下，系统会用 `EMAIL_CALLBACK_SECRET` 对原始请求体计算：

```text
hex(hmac_sha256(raw_body, EMAIL_CALLBACK_SECRET))
```

服务商需要在请求头传入下列任意一个字段：

```text
x-playdrama-signature: sha256=<hex>
x-email-signature: sha256=<hex>
x-signature: sha256=<hex>
```

也支持只传 `<hex>`，不带 `sha256=` 前缀。

请求体：

```json
{
  "providerMessageId": "provider-message-id",
  "status": "delivered",
  "errorMessage": ""
}
```

系统会把常见服务商状态映射成内部状态：

```text
accepted -> queued
delivered / delivery / sent -> sent
failed / failure / rejected -> failed
bounce / bounced -> bounced
```

如果服务商不能返回 `providerMessageId`，也可以传：

```json
{
  "deliveryId": "mail_xxx",
  "workspaceId": "wks_xxx",
  "status": "bounced"
}
```

## 接真实服务建议

国内优先：

- 阿里云邮件推送：当前项目主线服务商，适合和阿里云数据库、域名、短信、通义千问资源统一管理。
- 腾讯云 SES：国内商用备选，适合已有腾讯云渠道或客户资源时切换。
- 企业微信/飞书机器人通知

海外优先：

- Resend：海外测试和开发体验优先。
- SendGrid：海外规模化和营销邮件扩展。
- Postmark：事务邮件稳定性优先。

系统接口 `GET /api/email/provider` 会返回 `recommendations`，前端团队面板会展示当前推荐顺序。默认推荐顺序：

```text
1. 阿里云邮件推送
2. 腾讯云 SES
3. Resend
4. SendGrid
```

当前先按阿里云邮件推送推进，不要同时接多家。先完成阿里云端到端投递、回调、退信验收，再把腾讯云 SES 保留为第二服务商。

## 腾讯云 SES 适配器

当前后端已经支持：

```text
EMAIL_PROVIDER=tencent-ses
```

必填变量：

```text
TENCENTCLOUD_SECRET_ID=
TENCENTCLOUD_SECRET_KEY=
TENCENT_SES_FROM_EMAIL=
```

建议变量：

```text
TENCENT_SES_REGION=ap-guangzhou
TENCENT_SES_TEMPLATE_ID=
TENCENT_SES_DRY_RUN=false
EMAIL_CALLBACK_SECRET=
EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256
```

腾讯云 API 配置：

```text
endpoint: ses.tencentcloudapi.com
version: 2020-10-02
action: SendEmail
signature: TC3-HMAC-SHA256
```

如果配置了 `TENCENT_SES_TEMPLATE_ID`，系统会使用模板邮件，并把下面字段放进 `TemplateData`：

```json
{
  "workspaceName": "Creator Studio",
  "role": "editor",
  "inviteUrl": "http://127.0.0.1:5177/?invite=...",
  "expiresAt": "2026-05-24T00:00:00.000Z"
}
```

如果没有模板 ID，系统会尝试发送 `Simple.Text`，这更适合开发验证；正式商用建议走腾讯云模板审核流程。

### 腾讯云干跑演练

没有真实腾讯云凭证时，可以先打开干跑：

```text
EMAIL_PROVIDER=tencent-ses
TENCENT_SES_DRY_RUN=true
```

干跑模式会：

- 生成 `dryrun_` 开头的 `providerMessageId`。
- 把邀请邮件记录为 `queued`。
- 不向腾讯云发送任何请求。
- 在投递记录里写入 `Tencent SES dry run: no external email was sent`。

干跑只用于流程演练，不代表真实投递成功。进入 staging 实发前必须设置：

```text
TENCENT_SES_DRY_RUN=false
```

### 腾讯云实发验收

真实腾讯云凭证、发件地址、模板和回调密钥配置完成后，设置一个明确的内部测试收件箱：

```powershell
$env:TENCENT_SES_LIVE_TEST_EMAIL='internal-test@example.com'
npm run email:tencent-live:verify
```

验收脚本会先检查：

- `EMAIL_PROVIDER=tencent-ses`
- `TENCENT_SES_DRY_RUN=false`
- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- `TENCENT_SES_FROM_EMAIL`
- `TENCENT_SES_TEMPLATE_ID`
- `EMAIL_CALLBACK_SECRET`
- `EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256`
- `TENCENT_SES_LIVE_TEST_EMAIL`

只有这些都通过，脚本才会创建邀请并调用腾讯云 SES。通过标准是投递记录为 `queued` 或 `sent`、`providerMessageId` 不是 `dryrun_` 开头，并且没有 provider error。

### 腾讯云上线体检

`GET /api/email/provider` 的 `tencentSes.readiness` 会返回上线前检查项。必须全部通过后再做真实投递：

```text
腾讯云 SecretId
腾讯云 SecretKey
发件人地址
邀请邮件模板
回调签名密钥
HMAC 回调模式
```

前端团队面板会显示最多 3 个当前缺失项。运营只需要按提示补齐，不需要理解腾讯云签名细节。

## 阿里云邮件推送适配器

当前后端已经支持：

```text
EMAIL_PROVIDER=aliyun-directmail
```

必填变量：

```text
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_DM_ACCOUNT_NAME=
```

建议变量：

```text
ALIYUN_DM_ENDPOINT=https://dm.aliyuncs.com
ALIYUN_DM_REGION=cn-hangzhou
ALIYUN_DM_FROM_ALIAS=PlayDrama Studio
ALIYUN_DM_DRY_RUN=false
EMAIL_CALLBACK_SECRET=
EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256
```

阿里云 API 配置：

```text
product: DirectMail / 邮件推送
version: 2015-11-23
action: SingleSendMail
signature: HMAC-SHA1
```

系统会发送 `HtmlBody` 邀请邮件，包含工作区名称、角色、邀请链接和过期时间。

### 阿里云干跑演练

没有真实阿里云凭证时，可以先打开干跑：

```text
EMAIL_PROVIDER=aliyun-directmail
ALIYUN_DM_DRY_RUN=true
```

干跑模式会：

- 生成 `dryrun_aliyun_` 开头的 `providerMessageId`。
- 把邀请邮件记录为 `queued`。
- 不向阿里云发送任何请求。
- 在投递记录里写入 `Aliyun DirectMail dry run: no external email was sent`。

运行：

```powershell
npm run email:aliyun-dry-run:verify
```

### 阿里云实发验收

真实阿里云凭证、发信地址和回调密钥配置完成后，设置一个明确的内部测试收件箱：

```powershell
$env:ALIYUN_DM_LIVE_TEST_EMAIL='internal-test@example.com'
npm run email:aliyun-live:verify
```

验收脚本会先检查：

- `EMAIL_PROVIDER=aliyun-directmail`
- `ALIYUN_DM_DRY_RUN=false`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `ALIYUN_DM_ACCOUNT_NAME`
- `EMAIL_CALLBACK_SECRET`
- `EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256`
- `ALIYUN_DM_LIVE_TEST_EMAIL`

只有这些都通过，脚本才会创建邀请并调用阿里云邮件推送。通过标准是投递记录为 `queued` 或 `sent`、`providerMessageId` 不是 `dryrun_` 开头，并且没有 provider error。

### 阿里云上线体检

`GET /api/email/provider` 的 `aliyunDirectMail.readiness` 会返回上线前检查项。必须全部通过后再做真实投递：

```text
阿里云 AccessKey ID
阿里云 AccessKey Secret
邮件推送发信地址
回调签名密钥
HMAC 回调模式
```

## 上线验收

- 邀请成员后能生成投递记录。
- 邮件服务返回失败时，投递记录为 `failed`。
- 服务商成功回调后，投递记录能改为 `sent`。
- 退信或拒收能改为 `bounced`。
- 回调请求必须配置 `EMAIL_CALLBACK_SECRET`。
- 前端团队面板能看到推荐服务商列表。
- 运营能在团队面板看到最近投递状态。
- 本地测试桥 `GET /deliveries` 能看到最近邀请 payload。
