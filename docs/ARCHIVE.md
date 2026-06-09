# PlayDrama Studio - 备份与交接文档

> 备份日期：2026-06-09
> 备份人：Qoder AI Assistant
> Git Commit：`eb73fb6`

---

## 项目概况

| 项目 | 说明 |
|------|------|
| **项目名称** | PlayDrama Studio |
| **项目定位** | AI 互动短剧创作 SaaS 平台 |
| **技术栈** | React 19 + TypeScript + Vite + Node.js + PostgreSQL |
| **Git 仓库** | `d:/代码/playdrama-studio`（已初始化） |

---

## 本次优化记录（2026-06-09）

### 1. 安全修复（P0 级）

| 问题 | 修复文件 | 说明 |
|------|---------|------|
| 无限递归导致服务器崩溃 | `server/index.mjs:1634` | 删除 `supersedePendingSmsCodes` 中的递归调用 |
| 请求体无大小限制（DoS） | `server/index.mjs:4045` | 增加 10MB 上限 + Content-Length 预检 |
| JWT Token 存储安全 | `src/utils/tokenStorage.ts`（新增） | 内存缓存 + 过期检查 + localStorage 降级 |

### 2. 代码质量修复

| 问题 | 修复方式 |
|------|---------|
| 30+ 处空 catch 块 | 统一添加 `logError('api', error)` 日志 |
| 后端重复 localStorage 工具函数 | 提取到 `src/utils/tokenStorage.ts` |

### 3. 设计系统建立

新增 `src/components/ui/` 组件库：

| 组件 | 路径 | 功能 |
|------|------|------|
| Button | `src/components/ui/Button.tsx` | 4 种变体 + 3 种尺寸 + loading 状态 |
| Card | `src/components/ui/Card.tsx` | Card + Header + Title + Description + Content |
| Skeleton | `src/components/ui/Skeleton.tsx` | 骨架屏 + LoadingSpinner + ErrorFallback |
| Toast | `src/components/ui/Toast.tsx` | 全局 Toast 通知系统 |
| Layout | `src/components/ui/Layout.tsx` | Container + PageLayout + Grid + Flex |
| EmptyState | `src/components/ui/EmptyState.tsx` | 空状态 + LoadingOverlay |

### 4. 架构优化

| 优化项 | 文件 | 说明 |
|--------|------|------|
| Tailwind CSS v4 | `src/index.css` | 使用 `@theme` 自定义设计令牌 |
| React Router | `src/main.tsx` | HashRouter 已集成 |
| Vite 配置 | `vite.config.ts` | 添加 `@tailwindcss/vite` 插件 |
| 目录结构 | - | 创建 `src/types/`, `src/pages/`, `src/components/`, `src/hooks/`, `src/utils/` |

---

## 关键文件清单

### 核心入口

| 文件 | 说明 |
|------|------|
| `src/main.tsx` | React 应用入口（已添加 HashRouter） |
| `src/App.tsx` | 主应用组件（14,833 行，待拆分） |
| `src/App.css` | 主样式文件（17,787 行） |
| `src/api.ts` | API 客户端封装 |
| `server/index.mjs` | 后端 API 服务（294KB） |

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/utils/logger.ts` | 统一错误日志工具 |
| `src/utils/tokenStorage.ts` | 安全的 Token 存储方案 |
| `src/components/ui/index.ts` | UI 组件统一导出 |
| `src/components/ui/*.tsx` | 6 个 UI 组件 |

### 配置文件

| 文件 | 说明 |
|------|------|
| `vite.config.ts` | Vite 配置（含 Tailwind 插件） |
| `package.json` | 依赖清单 |
| `tsconfig.json` | TypeScript 配置 |

---

## 环境变量

复制 `.env.example` 为 `.env` 并填写以下配置：

```bash
# 必需
VITE_PLAYDRAMA_API_BASE=http://127.0.0.1:8787
PORT=8787
NODE_ENV=development

# 可选（用于生产环境）
EMAIL_PROVIDER=
EMAIL_WEBHOOK_URL=
DATABASE_URL=
```

---

## 启动命令

```bash
# 安装依赖
npm install

# 开发模式（前端）
npm run dev

# 开发模式（后端 API）
npm run api

# 生产构建
npm run build

# 代码检查
npm run lint
```

---

## 已知问题与风险

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| App.tsx 单文件过大 | **P1** | 14,833 行，构建 chunk > 500KB，需拆分 |
| 无路由库 | **P1** | 当前使用 URL Query + 条件渲染，需引入 React Router |
| 无状态管理 | **P2** | 50+ 个 useState 散落，需引入 Zustand |
| 无表单验证库 | **P2** | 依赖 HTML5 原生验证，需引入 Zod + RHF |
| 移动端适配不足 | **P2** | 响应式代码仅占 CSS 5% |
| 可访问性不足 | **P3** | 缺少键盘导航、颜色对比度不达标 |

---

## 后续优化建议（优先级排序）

### 第一阶段：架构重构（P1）
- [ ] 将 `App.tsx` 拆分为独立页面组件（`src/pages/`）
- [ ] 引入 React Router 路由系统
- [ ] 引入 Zustand 状态管理
- [ ] 统一 API 层类型校验（Zod）

### 第二阶段：UI 升级（P2）
- [ ] 引入 shadcn/ui 完整组件库
- [ ] 完善响应式设计（移动端适配）
- [ ] 添加骨架屏和全局 Loading
- [ ] 完善可访问性（A11y）

### 第三阶段：性能优化（P3）
- [ ] 代码分割（React.lazy + Suspense）
- [ ] 虚拟列表（长列表场景）
- [ ] 图片懒加载
- [ ] 构建优化（减小 chunk 大小）

---

## 数据库备份

PostgreSQL 数据库 Schema：`docs/database-schema.sql`

本地 JSON 数据库：`server/data/playdrama-db.json`

---

## 联系方式

- **Git 仓库**：`d:/代码/playdrama-studio`
- **前端地址**：`http://127.0.0.1:5177`
- **后端地址**：`http://127.0.0.1:8787`

---

> 本文档由 Qoder AI Assistant 生成于 2026-06-09
