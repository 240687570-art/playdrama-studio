# PlayDrama Studio - 后续优化 TODO

> 创建日期：2026-06-09
> 负责人：待分配

---

## Phase 1: 安全与稳定性（已完成 ✅）

- [x] 修复无限递归 Bug（`server/index.mjs:1634`）
- [x] 限制请求体大小（`server/index.mjs:4045`）
- [x] 修复空 catch 块（`src/App.tsx` 30+ 处）
- [x] JWT Token 安全存储（`src/utils/tokenStorage.ts`）
- [x] 统一错误日志（`src/utils/logger.ts`）

---

## Phase 2: 架构重构（P1 - 高优先级）

### 2.1 文件拆分

- [ ] 将 `src/App.tsx`（14,833 行）拆分为模块化文件
  - [ ] `src/pages/StudioApp.tsx` - 工作室主页面
  - [ ] `src/pages/PublicLandingPage.tsx` - 公开页面
  - [ ] `src/pages/OverviewPage.tsx` - 项目总览
  - [ ] `src/pages/CreationPage.tsx` - 创作模式
  - [ ] `src/pages/StoryPage.tsx` - 剧情编辑
  - [ ] `src/pages/CharactersPage.tsx` - 角色资产
  - [ ] `src/pages/AiPage.tsx` - AI 创作
  - [ ] `src/pages/PublishPage.tsx` - 发布变现
  - [ ] `src/types/index.ts` - 类型定义提取
  - [ ] `src/hooks/useProject.ts` - 项目相关 Hook
  - [ ] `src/hooks/useAuth.ts` - 认证相关 Hook

### 2.2 路由系统

- [ ] 引入 React Router v6 完整路由
  - [ ] `/` - 公开首页
  - [ ] `/studio` - 工作室入口
  - [ ] `/studio/overview` - 项目总览
  - [ ] `/studio/creation` - 创作模式
  - [ ] `/studio/story` - 剧情编辑
  - [ ] `/studio/characters` - 角色资产
  - [ ] `/studio/ai` - AI 创作
  - [ ] `/studio/publish` - 发布变现
  - [ ] 实现路由守卫（Auth Guard）
  - [ ] 实现 404 页面

### 2.3 状态管理

- [ ] 引入 Zustand 管理全局状态
  - [ ] `authStore` - 认证状态
  - [ ] `projectStore` - 项目状态
  - [ ] `uiStore` - UI 状态（loading、toast 等）
- [ ] 使用 React Query / SWR 管理服务器状态
  - [ ] 缓存 API 响应
  - [ ] 自动重试和刷新

### 2.4 API 层优化

- [ ] 引入 Zod 进行运行时类型校验
- [ ] 统一 API 错误处理
- [ ] 添加请求/响应拦截器
- [ ] 实现 API 请求重试机制

---

## Phase 3: UI 升级（P2 - 中优先级）

### 3.1 UI 组件库

- [ ] 引入 shadcn/ui 完整组件库
  - [ ] Dialog / Modal
  - [ ] Dropdown Menu
  - [ ] Tabs
  - [ ] Table / DataTable
  - [ ] Form components
  - [ ] Date Picker
  - [ ] Select
  - [ ] Checkbox / Radio
  - [ ] Slider
  - [ ] Switch
- [ ] 替换现有自定义组件为 shadcn/ui 组件

### 3.2 响应式设计

- [ ] 完善移动端断点适配
  - [ ] 侧边栏折叠为汉堡菜单
  - [ ] 表单单列布局
  - [ ] 按钮全宽
  - [ ] 触摸区域优化（>= 44px）
- [ ] 添加 PWA 支持

### 3.3 可访问性（A11y）

- [ ] 添加 `lang="zh-CN"` 属性
- [ ] 完善 ARIA 属性
- [ ] 实现键盘导航
- [ ] 添加 Skip Link
- [ ] 颜色对比度检查（WCAG 2.1 AA）
- [ ] 焦点可见性（focus-visible）

### 3.4 动画与交互

- [ ] 页面过渡动画
- [ ] 加载动画
- [ ] 骨架屏（Skeleton）
- [ ] 全局 Loading 组件

---

## Phase 4: 性能优化（P3 - 低优先级）

### 4.1 代码优化

- [ ] React.lazy + Suspense 代码分割
- [ ] React.memo + useMemo + useCallback 优化
- [ ] 虚拟列表（长列表场景）
- [ ] 图片懒加载
- [ ] 字体优化（font-display: swap）

### 4.2 构建优化

- [ ] 减小 chunk 大小（当前 577KB）
- [ ] Tree shaking 优化
- [ ] 压缩和缓存策略
- [ ] CDN 部署

### 4.3 网络优化

- [ ] API 请求合并
- [ ] 数据预加载
- [ ] Service Worker 缓存

---

## Phase 5: 功能完善

### 5.1 表单系统

- [ ] 引入 React Hook Form + Zod
- [ ] 统一表单验证逻辑
- [ ] 表单错误提示组件

### 5.2 错误处理

- [ ] 全局 Error Boundary
- [ ] Sentry 错误上报
- [ ] 用户友好的错误提示

### 5.3 国际化（i18n）

- [ ] 引入 i18next
- [ ] 提取所有中文文案
- [ ] 支持多语言切换

---

## 优先级说明

| 优先级 | 说明 | 预计工时 |
|--------|------|---------|
| P1 | 高优先级，影响安全或核心功能 | 2-3 周 |
| P2 | 中优先级，影响用户体验 | 1-2 周 |
| P3 | 低优先级，锦上添花 | 1 周 |

---

## 验收标准

- [ ] `npm run build` 构建成功
- [ ] `npm run lint` 无错误
- [ ] Lighthouse 性能评分 >= 80
- [ ] Lighthouse 可访问性评分 >= 90
- [ ] 核心用户流程端到端测试通过

---

> 本文档由 Qoder AI Assistant 生成于 2026-06-09
