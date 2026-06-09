# PlayDrama Studio 技术架构文档

> 版本：v1.0
> 更新日期：2026-06-09

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.6 | UI 框架 |
| React DOM | ^19.2.6 | DOM 渲染 |
| TypeScript | ~6.0.2 | 类型系统 |
| Vite | ^8.0.12 | 构建工具 |
| Tailwind CSS | ^4.3.0 | 样式框架（新增） |
| React Router | ^7.x | 路由管理（新增） |
| Lucide React | ^1.16.0 | 图标库 |

### 后端

| 技术 | 用途 |
|------|------|
| Node.js | API 服务器 |
| 原生 HTTP | 服务器框架 |
| PostgreSQL | 数据库 |
| pg | PostgreSQL 驱动 |

---

## 目录结构

```
playdrama-studio/
├── src/                          # 前端源代码
│   ├── main.tsx                  # React 应用入口
│   ├── App.tsx                   # 主应用组件（待拆分）
│   ├── App.css                   # 主样式文件
│   ├── api.ts                    # API 客户端封装
│   ├── index.css                 # 全局样式（Tailwind 入口）
│   ├── components/               # 组件目录（新增）
│   │   └── ui/                   # UI 组件库
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Layout.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Toast.tsx
│   │       └── index.ts
│   ├── utils/                    # 工具函数（新增）
│   │   ├── logger.ts             # 错误日志工具
│   │   └── tokenStorage.ts       # Token 安全存储
│   └── assets/                   # 静态资源
├── server/                       # 后端 API 服务
│   ├── index.mjs                 # 主服务入口
│   └── data/                     # JSON 数据存储
├── docs/                         # 项目文档
├── deploy/                       # 部署脚本
├── public/                       # 静态公共资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 设计系统

### 颜色系统（Tailwind CSS Variables）

```css
:root {
  --color-background: oklch(98% 0.007 250);
  --color-foreground: oklch(22% 0.024 256);
  --color-primary: oklch(55% 0.2 250);
  --color-primary-foreground: oklch(100% 0 0);
  --color-muted: oklch(60% 0.04 250);
  --color-muted-foreground: oklch(45% 0.05 250);
  --color-border: oklch(85% 0.03 250);
  --color-card: oklch(100% 0 0);
  --color-card-foreground: oklch(22% 0.024 256);
  --color-accent: oklch(95% 0.02 250);
  --color-accent-foreground: oklch(22% 0.024 256);
  --color-destructive: oklch(55% 0.22 15);
  --color-success: oklch(60% 0.15 145);
  --color-warning: oklch(75% 0.15 80);
}
```

### 圆角系统

| Token | 值 | 用途 |
|-------|------|------|
| `--radius-sm` | 4px | 小按钮、标签 |
| `--radius-md` | 8px | 按钮、卡片 |
| `--radius-lg` | 12px | 大卡片、弹窗 |
| `--radius-xl` | 16px | 大弹窗、模态框 |

### 响应式断点

| 断点 | 范围 | Tailwind 类 |
|------|------|-------------|
| sm | ≥640px | `sm:` |
| md | ≥768px | `md:` |
| lg | ≥1024px | `lg:` |
| xl | ≥1280px | `xl:` |
| 2xl | ≥1536px | `2xl:` |

---

## API 架构

### 基础 URL

```
开发环境：http://127.0.0.1:8787
生产环境：由 VITE_PLAYDRAMA_API_BASE 环境变量指定
```

### 认证方式

- 请求头：`Authorization: Bearer <token>`
- Token 存储：`src/utils/tokenStorage.ts`（内存 + localStorage 降级）
- Token 过期：60 分钟

### 核心 API 模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 认证 | `api.ts` | login, logout, verifyEmail, verifySms |
| 项目 | `api.ts` | fetchRemoteProjects, saveRemoteProject |
| 构建 | `api.ts` | publishRemoteBuild, fetchProjectBuilds |
| 分发 | `api.ts` | createDistributionJob, fetchDistributionJobs |
| 视频 | `api.ts` | createVideoGenerationJob, fetchVideoGenerationJobs |
| 支付 | `api.ts` | fetchRuntimeOrders, createRuntimeOrder |
| AI | `api.ts` | generateAiDraft, createAiGenerationJob |

---

## 状态管理

### 当前方案（待优化）

所有状态使用 `useState` 管理，散落在 `App.tsx` 中（50+ 个）。

### 推荐方案

- **全局状态**：Zustand（轻量级、TypeScript 友好）
- **服务器状态**：React Query / SWR（缓存、去重、重试）
- **表单状态**：React Hook Form + Zod

---

## 路由规划

### 当前方案（已引入 HashRouter）

```tsx
<HashRouter>
  <Routes>
    <Route path="/" element={<App />} />
    <Route path="/studio/*" element={<App />} />
  </Routes>
</HashRouter>
```

### 推荐方案（后续实施）

```tsx
<HashRouter>
  <Routes>
    <Route path="/" element={<PublicLandingPage />} />
    <Route path="/studio/*" element={<StudioLayout />}>
      <Route index element={<Navigate to="overview" />} />
      <Route path="overview" element={<OverviewPage />} />
      <Route path="creation" element={<CreationPage />} />
      <Route path="story" element={<StoryPage />} />
      <Route path="characters" element={<CharactersPage />} />
      <Route path="ai" element={<AiPage />} />
      <Route path="publish" element={<PublishPage />} />
    </Route>
  </Routes>
</HashRouter>
```

---

## 构建配置

### Vite 配置

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### 构建命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint
```

---

## 部署配置

### Docker

```dockerfile
# Dockerfile
FROM node:24-slim
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5177
CMD ["npm", "run", "dev"]
```

### 阿里云 ECS

参见 `deploy/aliyun/` 目录：
- `bootstrap-ecs.sh` - 初始化脚本
- `docker-compose.yml` - Docker Compose 配置
- `nginx-playdrama.conf` - Nginx 配置
- `start.sh` - 启动脚本

---

## 安全注意事项

| 项目 | 状态 | 说明 |
|------|------|------|
| 无限递归 | ✅ 已修复 | `server/index.mjs:1634` |
| 请求体限制 | ✅ 已修复 | 10MB 上限 + Content-Length 预检 |
| JWT Token 存储 | ✅ 已优化 | 内存缓存 + 过期检查 |
| XSS 防护 | ⚠️ 待加强 | 需检查 DOM 操作 |
| CSRF 防护 | ⚠️ 待评估 | 需评估是否需要 |
| SQL 注入 | ✅ 已防护 | 参数化查询 |

---

> 本文档由 Qoder AI Assistant 生成于 2026-06-09
