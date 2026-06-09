# 备份清单

## 主项目目录

```text
D:\代码\playdrama-studio
```

## 最新备份目录

```text
D:\代码\_backups
```

备份包命名格式：

```text
playdrama-studio-handoff-日期-时间.zip
```

当前最新备份：

```text
D:\代码\_backups\playdrama-studio-handoff-20260526-110835.zip
```

## 本次备份包含

- `src/`
- `server/`
- `public/`
- `docs/`
- `netlify/`
- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `README.md`
- `handoff-index.json`
- `netlify.toml`
- TypeScript / Vite / ESLint 配置文件

## 可以重新生成

- `node_modules/`
- `dist/`

## 恢复方式

如果只剩代码和文档，没有 `node_modules`，执行：

```powershell
cd D:\代码\playdrama-studio
npm install
npm run dev
```

如果需要启动后端 API：

```powershell
npm run api
```

如果需要验证：

```powershell
npm run build
npm run lint
node --check server/index.mjs
npm run deploy:preflight
npm run db:report
npm run email:aliyun-live:verify
npm run prod:verify
npm run readiness:api
npm run launch:gate
npm run launch:report
npm run launch:may21
npm run commercial:smoke
```

注意：`npm run prod:verify` 在本地开发环境通常会显示 `BLOCKED`，这是正常的。它用于提醒正式商用前还缺真实数据库、登录、邮件、AI、内容安全、支付和公网域名配置。
