# PostgreSQL / Supabase 验收脚本

## 目标

拿到真实 `DATABASE_URL` 后，用一条命令确认云数据库是否能接手当前项目数据。

## 前置步骤

1. 新建 PostgreSQL / Supabase 数据库。
2. 执行 `docs/database-schema.sql`。
3. 设置 `DATABASE_URL`。
4. 导入本地 JSON 数据。
5. 运行验收。

## 命令

```powershell
cd D:\代码\playdrama-studio
npm run db:report
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run db:import-json
npm run db:verify
```

`npm run db:report` 会生成 `docs/database-migration-report.md` 和 `docs/database-migration-report.json`，用于确认本地 JSON 数据规模、表映射、环境缺项和执行顺序。

## 验收内容

`npm run db:verify` 会检查：

- 数据库能否连接。
- 8 张核心表是否存在。
- 6 个关键索引是否存在。
- 导入后是否有用户数据。
- 导入后是否有工作区数据。

## 通过标准

输出里应该看到：

```text
Result: PASS
```

如果失败，先看 `FAIL` 后面的表名、索引名或错误信息。

## 切换 API 到 PostgreSQL

验收通过后再启动 API：

```powershell
$env:PLAYDRAMA_STORAGE_DRIVER = "postgres"
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"
npm run api
```

再检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8788/api/health
```

期望看到：

```json
{
  "storage": {
    "driver": "postgres",
    "databaseUrlConfigured": true
  }
}
```

## 页面状态

前端侧边栏会显示数据库状态：

```text
数据库 · json · 本地/待迁移
```

切到 PostgreSQL 并配置 `DATABASE_URL` 后，应显示：

```text
数据库 · postgres · 云端已配置
```

如果仍然显示缺失项，按页面提示处理：

- 存储驱动
- 云数据库地址
- 数据库表结构
- 本地数据导入
- 数据库验收
