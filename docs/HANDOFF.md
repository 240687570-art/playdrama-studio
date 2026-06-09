# PlayDrama Studio 交接总览

## 这是什么项目

PlayDrama Studio 是一个 AI 互动短剧游戏创作平台原型。它让创作者编辑剧情节点、设置分支条件、试玩互动流程，并准备后续发布、运营和商业化。

第一阶段目标：

```text
让创作者做出一个可玩的互动短剧 Demo，并能用于内测招募。
```

## 当前项目状态

已经完成：

- 创作台界面
- 剧情节点编辑
- 剧情图谱
- 分支目标设置
- 条件变量设置
- 可玩手机预览
- 本地保存
- JSON 导入导出
- 本地分享预览
- 发布设置
- 本地 API 服务
- 项目、发布快照、埋点、AI 供应商接口骨架
- 前端保存、导入、重置已经开始同步 API
- 发布设置可生成后端发布快照
- 生成发布包后，玩家选择会写入埋点事件
- 工作区权限、成员列表、操作审计骨架
- 内测成员邀请和角色预设
- 工作区新建和切换骨架
- 工作区作品列表、作品切换、新建作品
- 作品复制、归档和恢复归档，不做硬删除
- 项目活动时间线和审计筛选
- 云数据库 schema、环境变量模板和迁移手册
- PostgreSQL / Supabase 存储驱动基础版
- 本地 JSON 数据库导入 PostgreSQL 的一次性脚本
- 本地登录/退出骨架，按邮箱创建或切换用户
- 请求级本地 token 会话，支持不同浏览器身份隔离
- 本地邀请链接和接受邀请 API
- 邀请过期时间和邮件发送日志占位
- 邀请重发和取消操作
- 邀请邮件投递历史
- Demo Gallery 数据模型
- 创作者上线检查清单
- AI 开发运营团队文档
- 商用环境体检脚本和交接说明

还没完成：

- 正式商用账号系统
- 云端数据库
- 真正公开发布链接
- 支付
- AI 自动生成剧情真实模型调用
- 数据统计后台
- 多人协作

## 交接时先看哪些文件

非技术人员先看：

1. `docs/HANDOFF.md`
2. `docs/OPERATIONS_RUNBOOK.md`
3. `docs/NEXT_STEPS.md`
4. `docs/commercial-operations-plan.md`
5. `docs/creator-operations-playbook.md`
6. `docs/production-readiness.md`

开发人员先看：

1. `docs/DEVELOPER_HANDOFF.md`
2. `docs/architecture.md`
3. `docs/ai-team-backlog.md`
4. `src/App.tsx`
5. `src/App.css`
6. `docs/backend-contracts.md`
7. `docs/ai-orchestrator-contract.md`
8. `docs/backend-runbook.md`
9. `docs/cloud-database-migration.md`
10. `docs/database-schema.sql`
11. `docs/auth-provider-plan.md`
12. `docs/email-provider-plan.md`
13. `docs/production-readiness.md`

AI 员工先看：

1. `docs/AI_EMPLOYEE_BRIEF.md`
2. `docs/ai-team-operating-system.md`
3. `docs/ai-team-backlog.md`
4. `docs/implementation-log.md`
5. `docs/production-readiness.md`

模型和合规相关先看：

1. `docs/MODEL_PROVIDER_STRATEGY.md`

云数据库迁移先看：

1. `.env.example`
2. `docs/database-schema.sql`
3. `docs/cloud-database-migration.md`

商用灰度前必须运行：

```powershell
npm run prod:verify
```

只要结果是 `BLOCKED`，就说明仍缺真实外部配置，不能宣称已经正式商用。

## 日常怎么启动

打开命令行，进入项目目录：

```powershell
cd D:\代码\playdrama-studio
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:5177
```

玩家预览模式：

```text
http://127.0.0.1:5177/?preview=1
```

后端 API：

```powershell
npm run api
```

默认地址：

```text
http://127.0.0.1:8787
```

## 日常怎么验证没坏

每次改完代码，运行：

```powershell
npm run build
npm run lint
node --check server/index.mjs
```

两个都通过，说明当前代码基本健康。

## 最重要的业务原则

- 先做能让创作者完成作品的功能。
- 先做 H5 可玩 Demo，再做复杂发布系统。
- 先验证创作者愿不愿意用，再做付费和大规模平台。
- AI 生成只是能力之一，真正目标是让创作者持续发布和变现。
- 国内公开商用版默认接国内大模型，不直接接 OpenAI / GPT。
