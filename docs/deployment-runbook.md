# 部署上线手册

## 当前结论

当前项目已经完成 Netlify 技术预览部署，但还不能直接商用上线。

预览地址：

```text
https://playdrama-studio-preview.netlify.app
```

线上 API 健康检查：

```text
https://playdrama-studio-preview.netlify.app/api/health
```

最近一次已验证结果：

```text
首页 200
/api/health 200
deploy:preflight 7/8
commercialReadiness: blocked 6/17
storage: postgres
database: Netlify Database production branch
auth: Netlify Identity wired, adapter signoff pending
```

原因：

- 前端需要公网 HTTPS 地址。
- API 技术预览已通过 Netlify Functions 运行，数据库已切到 Netlify Database / Postgres。
- `APP_BASE_URL` 和 `VITE_PLAYDRAMA_API_BASE` 不能是 localhost。
- `/api/readiness` 和 `npm run launch:gate` 必须通过。
- 数据库和账号供应商已接入；真实账号验收、AI、邮件、内容安全、支付仍有外部配置缺项。

## 推荐部署架构

### 方案 A：前端 Netlify，API 独立 Node 服务

适合快速上线静态前端。

- 前端：Netlify，使用 `netlify.toml`。
- API：Render、Railway、Fly.io、腾讯云 CVM、轻量服务器或容器服务。
- 数据库：PostgreSQL / Supabase / 云数据库。

前端环境变量：

```text
VITE_PLAYDRAMA_API_BASE=https://api.your-domain.com
```

API 环境变量：

```text
APP_BASE_URL=https://your-frontend-domain.com
PORT=8787
HOST=0.0.0.0
```

### 方案 B：同一台服务器托管前端和 API

适合国内部署和备案后统一管理。

- Nginx 托管 `dist/`。
- Node 运行 `npm run api`。
- Nginx 反向代理 `/api/*` 到 Node API。
- HTTPS 由 Nginx 或云负载均衡配置。

## 部署前预检

```powershell
cd D:\代码\playdrama-studio
npm run build
npm run deploy:preflight
```

如果要检查预发 API：

```powershell
$env:APP_BASE_URL='https://your-frontend-domain.com'
$env:VITE_PLAYDRAMA_API_BASE='https://api.your-domain.com'
$env:PLAYDRAMA_API_BASE='https://api.your-domain.com'
npm run deploy:preflight
```

通过标准：

```text
Decision: GO
```

当前本地环境会显示：

```text
Decision: NO-GO
```

这是正常的，因为真实域名、线上 API 和商用依赖还没配置。

## Netlify 配置

仓库根目录已有：

```text
netlify.toml
```

它会执行：

```text
npm run build
```

并发布：

```text
dist
```

同时仓库已有：

```text
netlify/functions/api.mjs
```

它会把 Netlify 的 `/api/*` 请求转接到现有 Node API，所以 Netlify 可以作为技术预览部署。

当前 Netlify 站点已经配置：

```text
PLAYDRAMA_STORAGE_DRIVER=postgres
NETLIFY_DATABASE_READY=true
```

Netlify 已应用数据库迁移：

```text
20260519000100_create-playdrama-schema
20260519000200_seed-playdrama-demo
```

如果改用独立 PostgreSQL / Supabase，则可以继续使用：

```text
DATABASE_URL=postgresql://...
```

如果 API 独立部署，则前端设置：

```text
VITE_PLAYDRAMA_API_BASE=https://api.your-domain.com
```

如果前端和 API 都走 Netlify 同源 `/api/*`，可以不设置 `VITE_PLAYDRAMA_API_BASE`。

## 上线顺序

1. 部署 API 到 Node 运行环境。
2. 配置 API 真实环境变量。
3. 对 API 运行 `npm run readiness:api`。
4. 配置前端 `VITE_PLAYDRAMA_API_BASE`。
5. 构建前端 `npm run build`。
6. 部署前端。
7. 运行 `npm run deploy:preflight`。
8. 最后运行 `npm run launch:gate`。

没有 `GO` 不进入公开商用。
