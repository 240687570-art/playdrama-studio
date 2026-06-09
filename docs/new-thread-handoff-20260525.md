# PlayDrama 新对话交接摘要 - 2026-05-25

## 当前线上状态

- 线上地址：`https://playdrama.tokenaicloud.com/studio`
- 服务器：阿里云 ECS `59.110.171.143`
- 数据库：阿里云 RDS PostgreSQL，线上健康检查为 `postgres`
- 登录：腾讯云短信验证码，线上健康检查为 `sms-code`
- 支付：线上当前启用 `wechat`；支付宝配置仍保留，但因商户合作协议到期暂不放给客户入口
- 商用门禁：`17/17`，状态 `pass`
- 最近部署包：`playdrama-studio-aliyun-20260608-115859.zip`
- 最近部署包 SHA256：`EB1BBCBE2755E6D56C5E549236F0AEDEE12C400F75888C887111EB95A996CDB4`
- 当前前端资源：`assets/index-DXT8_8SD.js`、`assets/index-DDEqITAm.css`

## 2026-06-08 商用硬化：普通短剧工作台和内测申请区

- 背景：用户截图指出公开首页内测申请区像原生白底表单、普通短剧生产结果像长文档堆叠，明确质疑“这能商用么”。本轮结论是：截图状态不能算商用级，必须把第一眼信任感和普通短剧业务工作台继续硬化。
- 首页申请区：`src/App.css` 追加 `Commercial hardening after user screenshot review, 2026-06-08`，将 `public-apply` 和 `public-lead-form` 改为暗色品牌申请区，输入框、按钮、边框、聚焦态统一成可演示的内测合作表单，不再是白底原生表单观感。
- 普通短剧页：`src/App.css` 追加 `Ordinary short-drama commercial desk, 2026-06-08`，覆盖 `ordinary-series-studio`、`ordinary-series-hero`、`ordinary-stage-rail`、`ordinary-storyplay-layout`、`series-generator-grid` 和 `series-engine-board`。普通短剧第一屏现在是暗色生产工作台：剧本预评估、4 个能力卡、7 步生产链路、故事方案、AI 剧本评估、剧本/镜头/交付清单和生成后交付能力都统一在同一套商业台面里。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；`npm.cmd run lint` 120 秒超时且未返回具体错误，未计为通过。浏览器验证本地 1440px 和 390px：普通短剧页 `overflowX=0`，手机工作台宽度收在视口内，生成后交付台 `series-script-list`/`series-shot-list` 使用内部滚动避免长文档感。
- 线上部署：部署包 `playdrama-studio-aliyun-20260608-115859.zip`，SHA256 `EB1BBCBE2755E6D56C5E549236F0AEDEE12C400F75888C887111EB95A996CDB4`；线上构建资源为 `assets/index-DXT8_8SD.js`、`assets/index-DDEqITAm.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；部署预检 `8/8`，商用门禁 `17/17`，商业烟测 `13/13`，微信支付 provider smoke `8/8 PASS`。正式域名 `https://playdrama.tokenaicloud.com/studio?page=ai&ui=ordinary-commercial-v2-live-desktop` 桌面无横向溢出，390px 手机无横向溢出；普通短剧页线上存在 6 条剧本行、6 条镜头行、4 个生成后交付能力项。首页 `https://playdrama.tokenaicloud.com/?ui=ordinary-commercial-v2-live-home` 申请区仍为暗色表单。
- 清理结果：本地 `output/release` 和服务器 `/root/playdrama-upload` 均仅保留 `playdrama-studio-aliyun-20260608-115859.zip`；本轮临时验收截图、Playwright 临时日志/快照已删除，本地 `output` 仅保留 `marketing`、`pitch`、`release`、`wechat`。

## 2026-06-08 公开首页影视化品牌改造

- 背景：用户让对比 `https://storyplay.cn/` 首页，确认对方第一眼更有短剧平台气质。对方强在黑色影视感、短剧海报阵列、清晰业务入口和信任背书，但实测桌面和手机均有横向溢出。PlayDrama 本轮吸收其品牌表达优点，同时保留响应式商用质量。
- 首页改造：`src/App.tsx` 的 `PublicLanding` 新增 `publicHeroPosters` 和 `publicHomeFeatures`；首屏从说明型 hero 改为 `PlayDrama + 短剧海报墙 + 普通短剧创作平台预览框`。首屏业务入口包括 `新建剧本`、`网文改编`、`剧本评估`、`短剧拉片`、`发布收款`，主按钮仍直达 `制作互动短剧` 和 `生成常规短剧`。
- UI 改造：`src/App.css` 新增 `Public landing cinematic pass, 2026-06-08`，公开首页使用黑色影视首屏、倾斜短剧海报墙、深色产品预览卡和暗色统计条；样片区标题、底部内测申请区对比度已修复。手机端保留 3 张海报卡，避免像 StoryPlay 那样产生横向溢出。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；`npm.cmd run lint` 120 秒超时且未返回具体错误，未计为通过。Playwright 本地验证 `/` 桌面和 390px 手机 `overflowX=0`，桌面 5 张海报卡，手机 3 张海报卡，5 个业务入口均存在。
- 线上部署：部署包 `playdrama-studio-aliyun-20260608-092214.zip`，SHA256 `692110E06CCC2C4179E2B66E888E1B9CE0D73867A2BAE6B53F53E1E322045822`；线上构建资源为 `assets/index-fTjIk9KX.js`、`assets/index-DIdtCR5t.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；部署预检 `8/8`，商用门禁 `17/17`，商业烟测 `13/13`，微信支付 provider smoke `8/8 PASS`。正式首页 `https://playdrama.tokenaicloud.com/?ui=cinematic-home-20260608-live` 已加载新资源，桌面和 390px 手机无横向溢出。
- 清理结果：本地 `output/release` 和服务器 `/root/playdrama-upload` 清理到仅保留 `playdrama-studio-aliyun-20260608-092214.zip`；本轮临时首页验收截图已删除，本地 `output` 仍仅保留 `marketing`、`pitch`、`release`、`wechat`。

## 2026-06-08 普通短剧页 StoryPlay 化重排 v4

- 背景：用户指出普通短剧页不应该显示 `模型路由`、`模型成本`、`内容安全` 这类后台配置面板，要求参照 StoryPlay 的创作页模式，把普通短剧业务做成可给客户看的生产工作台。
- 功能和结构：`src/App.tsx` 将 `AI 导演` 主入口文案改为 `普通短剧`，普通短剧页隐藏 `ai-director-panel`、`ai-cost-panel`、`compliance-panel`、`safety-panel` 等后台面板；新增 `ordinaryCreationStages`，形成 `01 灵感策划 -> 02 故事梗概 -> 03 人物小传 -> 04 分集大纲 -> 05 剧本正文 -> 06 视频脚本 -> 07 导出交付` 的阶段导航。
- UI 调整：`src/App.css` 新增 `ordinary-stage-rail`，普通短剧页首屏改为浅色创作工作台：顶部是生产目标和剧本预评估，中间是 4 个能力卡、7 个生产阶段、3 个故事设定方案和 4 项 AI 剧本评估；客户可直接理解从 brief 到剧本、视频脚本和交付包的路径。页面不再出现竞品名称或内部对标文案。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS。本地 Playwright 验证 `http://127.0.0.1:5177/studio?page=ai&ui=ordinary-storyplay-v4`：桌面和 390px 手机 `overflowX=0`，后台面板 `0`，竞品文案 `0`，7 个阶段卡全部存在。控制台错误仅为本地 8787 API 未启动导致的连接拒绝。
- 线上部署：部署包 `playdrama-studio-aliyun-20260608-085520.zip`，SHA256 `A0C15F350D119FEC66FA057832C05AD51D1A291F20283DE2D3802447BA8DDE7B`；线上构建资源为 `assets/index-LxKFE7xu.js`、`assets/index-CfticCW9.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；部署预检 `8/8`，商用门禁 `17/17`，商业烟测 `13/13`，微信支付 provider smoke `8/8 PASS`。正式域名 `https://playdrama.tokenaicloud.com/studio?page=ai&ui=ordinary-storyplay-v4-live` 已加载新资源，桌面和 390px 手机无横向溢出，后台模型文案和后台面板均为 0。
- 清理结果：本地 `output/release` 和服务器 `/root/playdrama-upload` 清理到仅保留 `playdrama-studio-aliyun-20260608-085520.zip`；本轮临时验收截图、旧 10 秒预览视频和 `output/review` 临时素材已删除，本地 `output` 仅保留 `marketing`、`pitch`、`release`、`wechat`。

## 2026-06-08 普通短剧 StoryPlay 模式上线

- 背景：用户明确要求“UI 页面达到 StoryPlay 那种页面模式，功能弄进 PlayDrama 平台，作为普通短剧水平”。本轮将 StoryPlay 式的普通短剧剧本创作模式前置到 `AI 导演 -> 普通短剧生成`，不再只是一个生成表单。
- 功能增强：`src/App.tsx` 新增 `ordinaryStoryBlueprints`、`ordinaryStudioCapabilityCards`、`ordinaryScriptEvaluationRows`。普通短剧页现在包含 3 组故事设定方案、4 个能力卡、4 项 AI 剧本评估指标。点击 `套用方案` 会真实回填题材钩子、类型、变现和边界条件，并更新生成状态。
- 页面模式：新增 `ordinary-series-studio` 工作台，结构为 `StoryPlay 对标说明 -> 普通短剧能力 -> 故事设定多方案 -> AI 剧本评估 -> 原有剧本/视频脚本/交付包生产链路`。定位为“先把常规短剧做到可写、可评、可导出、可审片”，再升级互动短剧。
- UI 升级：`src/App.css` 新增 `Ordinary short-drama platform mode, 2026-06-08`。普通短剧区域使用深色决策栏、浅色多方案列表、进度条式剧本评估和移动端单列布局；390px 手机端无横向溢出。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；`npx.cmd eslint src/App.tsx` 120 秒超时，未计为通过。Playwright 本地验证桌面和 390px：`overflowX=0`；普通短剧模块存在，`故事设定多方案=3`，`AI 剧本评估=4`；点击 `商业升级版` 后回填 brief、类型和状态。
- 线上部署：部署包 `playdrama-studio-aliyun-20260608-081623.zip`，SHA256 `2A7603E4E79B22A3E20B65DBBCB9F63973A3A5786B8BDC4BBBB477FF4C77AA7B`；线上构建资源为 `assets/index-D3znUg5S.js`、`assets/index-CeUikhrI.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；商用门禁 `17/17`，微信支付 provider smoke `8/8 PASS`。正式域名 `https://playdrama.tokenaicloud.com/studio?page=ai&ui=ordinary-storyplay-mode` 已加载新资源，桌面和 390px 手机复查均无横向溢出。
- 清理结果：本地 `output/release` 仅保留 `playdrama-studio-aliyun-20260608-081623.zip`；服务器 `/root/playdrama-upload` 也仅保留该 zip。本轮临时验收截图已删除，保留宣传图、PPT 和交接文档。

## 2026-06-08 StoryPlay 对标创作页 UI 和功能升级

- 背景：用户再次要求 `https://storyplay.cn/creation` 的页面 UI 和功能要做到“跟他一样或超过他”。Chrome 扩展本轮不可用，Playwright 无登录态访问 `/creation` 返回 `403`；公开首页可确认 StoryPlay 的核心表达是“AI 剧本评估、故事设定多方案、让短剧剧本创作效率提升”。本轮按已掌握的对标信息，把 PlayDrama 创作页升级为“双业务入口 + 剧本生产总台 + 互动商业闭环”的产品工作台。
- 功能增强：`src/App.tsx` 新增 `creationBusinessModes`，在 `创作模式` 顶部明确两条业务线：`互动短剧制作` 为主业务，承接分支、付费隐藏线、微信收款和数据回流；`常规短剧生成` 为第二业务，承接 brief、梗概、人物、分集、正文、镜头脚本和生产包导出。
- 对标增强：新增 `scriptProductionBenchmarks`，在剧本生产总台内直接展示 `StoryPlay 基线`、`PlayDrama 超越点`、`客户交付` 三段对比。StoryPlay 基线覆盖灵感、人物、分集、正文、剧本评估；PlayDrama 超越点强调互动分支、付费隐藏线、收益预估；客户交付强调发布包、收款验收和数据回流。
- UI 升级：`src/App.css` 将上一版偏“粗描边矩阵”的剧本生产区改为浅色高密度制作台：细边框、状态胶囊、明确的主操作按钮、可读的右侧动作区和移动端单列布局。`390px` 手机下双业务入口、对标卡、能力矩阵均无横向溢出。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；`npx.cmd eslint src/App.tsx` 本轮 120 秒超时，未计为通过。Playwright 本地复查 1440px 和 390px：`overflowX=0`，双业务入口存在，剧本对标条存在，能力矩阵在手机端自然换行。
- 线上部署：部署包 `playdrama-studio-aliyun-20260608-075931.zip`，SHA256 `F6650B3293C10490EB6ACFB3A5D0B7BEBB9534E3250E37FB2B8B29BEBC8CF526`；线上构建资源为 `assets/index-DAbuEpK7.js`、`assets/index-CaTNpxjn.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；商用门禁 `17/17`，微信支付 provider smoke `8/8 PASS`。正式域名 `https://playdrama.tokenaicloud.com/studio?page=creation&ui=storyplay-benchmark` 已加载新资源，桌面和 390px 手机复查均无横向溢出。
- 清理结果：本地 `output/release` 仅保留 `playdrama-studio-aliyun-20260608-075931.zip`；服务器 `/root/playdrama-upload` 也仅保留该 zip。本轮临时验收截图和旧 Playwright 日志已删除，保留宣传图、PPT 和交接文档。

## 2026-06-07 剧本生产总台和专业 UI 升级

- 背景：用户要求剧本生产也要超过 StoryPlay，UI 也要达到对方水平。本轮继续使用 `impeccable` 产品 UI 规则，在 `创作模式` 内补“剧本生产总台”，把对方强项从流程展示升级为可验收的生产能力矩阵。
- 剧本生产能力：新增 `scriptProductionToolRows`，覆盖 `灵感策划`、`拉片拆解/小说拆书`、`人物小传`、`分集大纲`、`剧本正文/单集润色`、`剧本评估/剧名生成` 六项对标能力；每项显示 StoryPlay 基线和 PlayDrama 增强能力，并可点击切换到对应创作阶段。
- 超越点：新增 `scriptProductionMetrics` 和 `scriptProductionActions`，展示剧本成熟度、正文产能、商业卡点；动作区直接接 `生成完整剧本生产包`、`生成付费隐藏线`、`复制生产 Prompt 包`、`导出客户生产包`，把剧本生产连接到视频脚本、互动变现和客户交付。
- UI 升级：`src/App.css` 中 `创作模式` 顶部改为更专业的深色创作工作区；新增 `script-production-suite`，用深色高密度生产矩阵承载剧本能力，浅色稿件区继续承载当前阶段正文，整体更接近专业写作软件和短剧生产工具，而不是普通管理后台。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；`npx.cmd eslint src/App.tsx` 本轮 120 秒超时，未计为通过。内置浏览器验证 1440px 桌面和 390px 手机均 `overflowX=0`、`bodyOverflowX=0`；390px 下六项能力矩阵自然换行，点击 `剧本正文` 可切换到正文阶段。
- 线上部署：部署包 `playdrama-studio-aliyun-20260607-164911.zip`，SHA256 `8375DFBD6D4A05B883C3E27C16E9B86A13562C1CC6F2425965355F34AFCAF5A3`；线上构建资源为 `assets/index-BfxX5zhg.js`、`assets/index-CkIiIqJU.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS；商用门禁 `17/17`，微信支付 provider smoke `8/8 PASS`。
- 清理结果：本地 `output/release` 和服务器 `/root/playdrama-upload` 均仅保留 `playdrama-studio-aliyun-20260607-164911.zip`。

## 2026-06-07 StoryPlay 对标创作模式上线

- 背景：用户给出 `https://storyplay.cn/creation` 作为热门短剧剧本平台对标，并明确 PlayDrama 要两条业务入口：互动短剧为主，生成常规短剧为辅。本轮用 Chrome 登录态观察 StoryPlay 创作页和飞书教程，确认其强项是阶段化剧本生产：灵感策划、故事梗概、人物小传、分集大纲、剧本正文，以及右侧 AI 一键生成动作。
- 前端新增主入口：`src/App.tsx` 的 `StudioPage` 新增 `creation`，左侧主导航新增 `创作模式`，首页 `3 分钟客户试用入口` 新增 `从灵感写到正文` 路由卡，`产品化待办` 新增 `创作流水线` 任务，避免普通短剧生产继续藏在 `AI 导演` 页里。
- 创作流水线：新增 7 阶段工作台：`灵感策划 -> 故事梗概 -> 人物小传 -> 分集大纲 -> 剧本正文 -> 互动分支 -> 发布变现`。页面读取真实项目数据展示节点数、角色数、分支数、付费触达、发布包和支付状态；每个阶段都有 AI 动作、交付物、当前稿件和验收证据。
- PlayDrama 超越点：前五步对标 StoryPlay 的剧本生产，后两步接入 PlayDrama 的核心商业能力：互动分支、付费隐藏线、节点收益预估、发布包、微信 0.01 元验收、订单和数据回流。定位从“剧本工具”升级为“短剧创作到收款的商业制作台”。
- UI 和响应式：`src/App.css` 末尾新增 `Creation mode: benchmarked short-drama writing pipeline`，桌面为专业工作台布局，390px 手机端阶段卡改为两列而不是横向滑动；本地浏览器验证 `documentOverflowX=0`、`bodyOverflowX=0`、阶段卡 `stageRailOverflowX=0`，点击 `人物小传` 可切换当前稿件。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；内置浏览器验证 `http://127.0.0.1:5177/studio?page=creation` 的 1440px 桌面和 390px 手机均无页面级横向溢出，阶段切换正常。
- 线上部署：部署包 `playdrama-studio-aliyun-20260607-163038.zip`，SHA256 `092FA06E1B97FC741BD16878D22B5A71361478D47DEEF0C2A34D1AB7098F7194`；线上构建资源为 `assets/index-CfdKpjc-.js`、`assets/index-wDX8sOpB.css`。
- 线上验证：`bash deploy/aliyun/ops.sh health`、`server/verify-deploy-preflight.mjs`、`server/verify-launch-gate.mjs`、`server/verify-commercial-smoke.mjs`、`server/verify-payment-provider.mjs` 全部 PASS。正式域名 HTML 已加载新 JS/CSS，商用门禁 `17/17`，微信支付 provider smoke `8/8 PASS`。
- 运维备注：服务器当前使用 systemd 服务 `playdrama`，不是 pm2；重启使用 `bash deploy/aliyun/ops.sh restart` 或 `systemctl restart playdrama`。本轮第一次尝试 pm2 重启失败后，已改用现有 systemd 流程重启并通过健康检查。
- 清理结果：本轮 StoryPlay 对标临时截图已删除；最新发布包以顶部 `当前线上状态` 为准。

## 2026-06-07 全局 UI 商用化重构

- 背景：用户明确指出问题是“全局，不是单 AI 导演页”。本轮使用 `impeccable` 产品 UI 规则重新收敛全平台工作台，而不是继续给单页打补丁。
- 全局设计系统：在 `src/App.css` 末尾新增 `Global premium product system, 2026-06-07`，统一侧栏、顶部栏、搜索、按钮、表单、面板、状态卡、命令区和移动断点；视觉从偏 demo 的彩色堆叠收敛为深色侧栏 + 浅色任务面板 + 克制状态语义。
- 覆盖范围：已覆盖 `项目总览`、`剧情编辑`、`角色资产`、`AI 导演`、`发布变现` 五个主入口；发布页和剧情页的 `secondary-command-center` 不再出现状态卡过窄、按钮竖排、文案挤压的问题。
- 移动端修复：新增 `Global responsive containment, 2026-06-07`，820px 以下强制主容器、顶部栏、客户试用入口和命令区收进当前视口；390px 手机与 690px 平板均无横向裁切，顶部操作区按搜索、同步状态、按钮组自然换行。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；本地浏览器覆盖 1440px 五个主入口、690px 首页/发布、390px 首页/发布，`rightLeak=[]`，`smallTargets=[]`。
- 线上验证：部署包 `playdrama-studio-aliyun-20260607-154501.zip`，SHA256 `AFDBEE409E1FAB839268A4DBBC867887CDC4A6AFA2B708F1C79CB0078A8ACC7F`；线上 `ops.sh health`、`deploy:preflight`、`launch:gate`、`commercial:smoke`、`payment:provider` 全部 PASS。正式域名加载资源 `assets/index-DEXsrEmr.js`、`assets/index-Dv_VC06O.css`，1440px 与 390px 复测均无横向溢出和过小控件。

## 2026-06-07 AI 导演页 impeccable UI 商用化打磨

- 背景：用户反馈页面 UI 太次，要求启动 UI 插件认真优化；本轮使用 `impeccable` 的产品 UI 规则执行，插件上下文缺少 PRODUCT/DESIGN 文档，命令行 audit 本身未产出有效报告，因此采用 `impeccable product register` 规则 + Playwright 桌面/窄屏实测落地。
- 信息架构：`AI 导演` 顶部命令区从“普通短剧生成台”改为 `双业务生产入口`，明确 `互动短剧为主，常规短剧生产为辅`；状态卡改为 `互动短剧`、`常规短剧`、`视频生成` 三条业务状态，动作区改为 `生成生产包`、`升级互动短剧`、`提交视频队列` 三个主动作。
- 视觉修复：收敛 AI 页过重的状态色和卡片堆叠，改为克制的商用工作台视觉；修复 1440px 下命令区状态卡过窄换行、按钮竖向堆叠、顶部项目标题挤压等问题。
- 生产路径修复：`生成短剧生产包` 的按钮组从长面板底部前移到表单和指标之后，用户不需要滚到很深才知道下一步；同时保留导出普通短剧包、升级互动短剧、提交视频队列和发布设置入口。
- 响应式修复：561-820px 窄桌面/平板下，预发布状态条改为两列，AI 命令区状态卡和动作按钮保持三列，短剧生成表单改为两列；390px 手机下顶部操作区改为搜索整行、同步状态整行、按钮两列，不再横向裁切。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS，`npx.cmd eslint src/App.tsx` PASS；Playwright 本地验证 1440px、690px、390px 均无页面级横向溢出，`smallTargets=[]`，console error 0。
- 线上验证：部署包 `playdrama-studio-aliyun-20260607-113633.zip`，SHA256 `665DA6892DB0DF8BA0CA98981C5B5303919E621BE345931AC997EADEE555E098`；线上 `ops.sh health`、`deploy:preflight`、`launch:gate`、`commercial:smoke`、`payment:provider` 全部 PASS。线上浏览器复查 `https://playdrama.tokenaicloud.com/studio?generate=1&ui=impeccable-live-20260607-113633`，1440px 和 390px 均加载新 UI，`smallTargets=[]`，console error 0。

## 2026-06-07 热门插件对标能力落地

- 背景：用户要求按 GitHub 热门写代码插件、UI 插件和自动工作插件的建议执行；本轮没有盲目接入外部运行时，而是先把 Codex/Cline/OpenHands、shadcn/Radix/Storybook、n8n/Dify/Trigger.dev/browser-use 的成熟范式产品化到 AI 导演页。
- 前端增强：`AI 导演 -> 创作生成工作台` 新增 `插件生态对标` 面板，展示 `写代码插件`、`UI 插件体系`、`自动工作流` 三类能力；新增 `自动工作流落地路径`，把需求队列、生产包生成、UI 组件验收、上线门禁、浏览器回归串成 5 步商用执行流。
- 运营动作：新增 `复制执行清单`，可复制 AI 团队与自动工作流执行清单，内容包含对标插件、当前平台落地状态和执行顺序；新增 `查看上线门禁` 快捷动作跳到发布变现页。
- 验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS，`npx.cmd eslint src/App.tsx` PASS；线上 `ops.sh health`、`deploy:preflight`、`launch:gate`、`commercial:smoke`、`payment:provider` 全部 PASS。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?generate=1&ui=toolchain-live-20260607` 已加载新资源 `assets/index-04TsBZeM.js`、`assets/index-DrQpiH0E.css`；1440px、690px、390px 均可见新面板，页面无横向溢出，`smallTargets=[]`，新增面板内部文本溢出 0，console error 0。

## 2026-06-07 窄桌面响应式修复

- 问题定位：用户在 Chrome 窄窗口看到工作台像手机端页面，右侧出现大片空白；线上 690px 复测发现需要对 561-820px 的窄桌面/平板档做最终保护，避免历史移动端覆盖层把外壳、侧栏或工作区锁回手机宽。
- 前端修复：在 `src/App.css` 末尾新增 `Narrow desktop and tablet guard, 2026-06-07`，强制 `html/body/#root/.app-shell/.sidebar/.workspace` 在 820px 以下使用完整可视宽度；561-820px 档导航恢复 5 列紧凑工作台，顶部操作区改为可换行命令条，不再像纯手机堆叠。
- 本地验证：`npm.cmd run build` PASS，`node --check server/index.mjs` PASS；Playwright 本地验证 690px、390px、1440px 均无页面级横向溢出，`smallTargets=[]`。
- 线上验证：部署后 `ops.sh health`、`deploy:preflight`、`launch:gate`、`commercial:smoke`、`payment:provider` 全部 PASS；线上 690px 加载新资源 `assets/index-Qc3MFhO-.js`、`assets/index-B1IbKODw.css`，`.app-shell/.sidebar/.workspace` 均为 675px 满宽，390px 手机档仍为 375px 满宽，1440px 桌面保持左侧 268px + 主区 1157px。

## 最近完成

- 全平台 UI 已从单页修补升级为统一工作台底座：五个主入口共用侧栏、顶部栏、按钮、表单、面板、命令区和移动断点规则，390px/690px/1440px 均已复测无横向溢出。
- 用 impeccable 做了工作台 UI 升级：深色专业侧栏、顶部栏、状态条、主工作台、指标卡片和面板层级。
- 修复公网新访客首屏误导文案：不再显示本地演示/json/等待 API。
- 支付状态文案改为“支付宝 / 微信”。
- 桌面与手机端检查通过：无横向溢出，无控制台错误。
- 部署后线上验证通过：公网 `/api/health` 正常，systemd 服务 `playdrama` active。
- 已接入通义千问 / DashScope 短剧生成辅助链路，MiniMax 密钥未通过验证，当前不作为生产依赖。
- 已新增短剧生产入口，互动短剧为主、生产短剧为辅。
- “发布变现”已产品化为上线指挥台：商业门禁、发布包、渠道分发、收入概览、付费结局、订单明细。
- 本地沙盒已验证付费解锁闭环：生成发布包后创建 1 笔沙盒已支付订单，2 个付费结局节点可回读解锁，收入统计为 CNY 9.90。
- 线上已验证新页面资源和响应式布局，但未点击生产“验证付费解锁”，避免产生真实支付订单。
- 首页已明确双业务线：`制作互动短剧` 是主业务，`生成普通短剧` 是第二业务和生产入口，共用剧情、角色、分镜和发布底座。
- “剧情编辑”已新增编剧验收台：主线闭环、问题队列、付费路径、断点风险、主线验收列表、付费卡点入口。
- 线上已验证双业务线入口和剧情编辑验收台，桌面与 390px 移动端无横向溢出，控制台 0 错误。
- “普通短剧生成”已升级为短剧生产引擎：AI 导演页展示 Brief、分集剧本、导演分镜、视频队列、交付清单、普通短剧 Markdown 导出、视频队列提交和“升级互动短剧”入口。
- 生成短剧生产包后会停留在 AI 导演页，先展示普通短剧生产结果；用户再显式点击“升级互动短剧”进入剧情编辑。
- 发布包已排除本地 `server/data/playdrama-db.json`，避免把本地 JSON 快照夹带到阿里云发布包。
- 线上已验证 AI 导演页短剧生产引擎：桌面与 390px 移动端均可见，流程 5 步，文本溢出 0，公网资源包含新 JS/CSS。
- “剧情编辑”已补商用级细控件：节点可显式标记免费/付费结局，分支可一键套用变量条件模板、优化选择文案、预览路径、编辑目标，并可直接把目标结局切为免费或付费。
- 前端播放器和后端订单解锁已改为按节点 `paywall` 语义判断付费结局；无显式标记时按“免费/普通/基础”和“付费/隐藏/解锁/VIP”等文案推断，最后兜底为首个结局免费、后续结局付费。
- 线上已用 `sample=hospital` 验证：H06 为免费结局，H07 为付费隐藏结局；桌面和 390px 移动端新控件可见，文本溢出 0，控制台 0 错误。
- “发布变现”继续补到商用运营细节：价格档位、试看权益、付费卡点触达、千次会话收入预估、订单状态筛选、支付回调解释和移动端顶部栏适配。
- 本地已验证发布变现页：价格档位可把价格切到 CNY 6.6，订单筛选可切到“待支付”，390px 移动端无横向溢出，控制台 0 错误。

## 2026-06-05 二级页面任务指挥层上线

- 主线目标：把二级页面从“功能堆叠”收敛成“主任务 / 风险验收 / 运营动作”的商用工作台首屏，让客户一进剧情编辑、AI 导演、发布变现就知道当前能交付什么、风险在哪里、下一步按什么。
- 前端新增 `secondary-command-center`：剧情编辑、AI 导演、发布变现三页顶部统一展示主任务、验收指标和下一步动作。
- 剧情编辑页：新增 `互动短剧制作台`，展示当前焦点节点、主线闭环、付费隐藏线、问题定位和三个直达动作；付费路径显示从容易误解的 `5/1` 改成 “2 条 / 1 个付费结局” 这类清晰文案。
- AI 导演页：新增 `常规短剧生成台`，展示 brief、模型成本、视频队列和交付质量，动作直达生成生产包、提交视频生成和导出交付包。
- 发布变现页：新增 `发布变现运营台`，展示上线门禁、发布包、微信支付、支付宝协议到期说明、pending 不解锁、失败重试和付费路径，动作直达生成发布包、验证收款和刷新守护。
- 本地验证：`npm.cmd run build` PASS，`npm.cmd run lint` PASS；本地桌面与 390px 移动端检查无横向溢出，控制台 0 error。
- 线上部署包：`playdrama-studio-aliyun-20260605-142635.zip`，SHA256 `01A38EC2672063874A1473ED33071AFED9877F4999082986847543D86363A603`。
- 线上验证：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`，`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?generate=1` 的 AI 导演、剧情编辑、发布变现三页新版指挥层可见；桌面和 390px 移动端无横向溢出，console 0 error，公网资源为 `assets/index-Ch8-xsWN.js` 和 `assets/index-C5Wy2fIh.css`。

## 2026-06-05 成片审片交付台 v3

- 主线目标：把 `常规短剧生成` 从“能合成 MP4”继续推进到“客户能审片、能批注、能形成下一版交付”的商用交付台。
- 前端 AI 导演页新增 `成片交付配置`：合成 MP4 前可选择 `客户审片版`、`平台交付版`、`CDN 归档版`，并可切换 `SRT 侧挂` / `字幕烧录`、`静音` / `混音` / `口播` 音轨策略。
- 前端成片任务详情新增：版本对比、审片结论、归档状态、客户审片批注输入、最近批注列表；批注保存后会清空输入框并回写到交付清单。
- 后端新增 `PATCH /api/video/renders/:renderId/review`：保存审片结论和批注，不新增数据库字段，继续写入 `final_video_renders.request/response jsonb`。
- 后端成片 manifest 升级：写入交付模式、字幕策略、归档策略、审片结论、CDN/归档地址占位、审片批注；交付文件不再只是技术清单，而是客户审片可读文档。
- FFmpeg 合成增强：`subtitlePolicy=burned-in-srt-v1` 时会尽力烧录字幕，同时保留 SRT；如果烧录失败，不阻断 MP4 交付，会在 response/manifest 里记录 `subtitleBurnInError`。
- 本地验证：`node --check server/index.mjs` PASS，`npm.cmd run build` PASS，`npx.cmd eslint .` PASS；本地 FFmpeg smoke 产出 `final.mp4`、`captions.srt`、`manifest.md/json`，manifest 中包含 `burned-in-srt-v1`、`cdn-archive-v1`、`reviewNotes` 和 `needs-changes`。
- 本地浏览器验证：AI 导演页生成生产包后可见交付配置；创建成片后可见 MP4 下载、字幕下载、合成清单、版本对比、归档状态、审片批注；保存批注后从 1 条变 2 条，390px 移动端无横向溢出。
- 线上部署包：`playdrama-studio-aliyun-20260605-203550.zip`，SHA256 `B3E003A5E1C9E6E6BAEC31FCE78EB09ED0169BFFF07405232B7276A0BCE3A088`。
- 线上验证：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`，`cleanup-smoke` 已执行，`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?generate=1` 已加载 `assets/index-CN4C_e3J.js` 和 `assets/index-B-44YZoc.css`；生产 JS 已包含 `客户审片批注`、`burned-in-srt-v1` 和 `/review`；桌面与 390px 移动端无横向溢出，console 0 error。
- 清理说明：本地 FFmpeg smoke 的 `tmp-render-test`、`server/data/final-video-renders` 已删除；发布包检查只包含 `server/data/README.md`，没有本地 JSON 和测试视频。

## 2026-06-05 AI 团队正式商用上线检查

- 检查模式：按产品、工程、QA、运维、安全、增长六个视角做上线门禁；结论为 `GO`，适合今天继续内测/客户试用，但真实客户付款前仍建议人工再跑一次 0.01 元微信扫码验收。
- 产品视角：双业务入口已清楚，主业务为 `互动短剧制作`，第二业务为 `常规短剧生成`；AI 导演页已具备生成、视频队列、MP4 合成、字幕、审片批注和交付清单。
- 工程视角：当前线上资源为 `assets/index-DtnA8GOx.js`、`assets/index-CwK-LYz4.css`；最新本地上线包为 `playdrama-studio-aliyun-20260605-223121.zip`，SHA256 `EDACA2111EF931B41836C8A00D9F3FD1F7C928AC625F0F634ADCAC032950FD96`。
- QA 视角：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`；线上 `cleanup-smoke` 已执行，健康检查仍通过。
- 运维视角：线上 `playdrama` 和 `nginx` 均为 active；公网 `https://playdrama.tokenaicloud.com/api/health` 正常；服务器 `/root/playdrama-upload` 仅保留最新上线包。
- 备份视角：已创建并验证 PostgreSQL 备份 `/root/playdrama-backups/playdrama-postgres-20260605-205337.dump`；备份目录权限 `700 root:root`，dump 权限 `600 root:root`，`deploy/cloud-server.env` 权限 `600 root:root`。
- 安全视角：生产 nginx 已新增基础安全头：`Strict-Transport-Security`、`X-Frame-Options: DENY`、`Referrer-Policy`、`Permissions-Policy`、轻量 `Content-Security-Policy`；`/api/me` 未登录返回 `401`；包内敏感数据扫描干净，仅包含允许的 `.env.example`。
- 合规/增长视角：`/privacy`、`/terms`、`/content-policy`、`/complaint` 均返回独立 HTML；演示路径建议继续围绕“生成常规短剧 -> 合成审片版 -> 升级互动短剧 -> 发布微信收款”讲 3 分钟闭环。
- 注意事项：生产 header 中 `x-content-type-options` 当前由后端和 nginx 双重返回 `nosniff,nosniff`，不影响功能；后续可做一次小清理。Playwright MCP 对生产域名出现过工具级 timeout，但 curl、API、支付、smoke 和资源文件检查均正常。

## 2026-06-05 AI 导演操作条商用修复

- 修复原因：线上 AI 导演页短剧生产操作区按钮拥挤，主按钮、导出、升级、视频队列、发布设置和状态文案挤在同一行，视觉上不够商用。
- 前端调整：`series-generator-actions` 改为按钮组 + 状态胶囊两段式布局；按钮固定最小宽度、文字不压缩，禁用态统一为产品灰态；状态文案缩短为 `生产包已返回 · 写入工作台`。
- 响应式验证：本地桌面测量 5 个按钮均为 34px 高，文字 `nowrap`，状态独立右侧胶囊；390px 移动端按钮自动纵向排列，页面无横向溢出。
- 本地验证：`npm.cmd run build` PASS，`npx.cmd eslint .` PASS，`node --check server/index.mjs` PASS。
- 线上部署包：`playdrama-studio-aliyun-20260605-215420.zip`，SHA256 `C29ABBFF3D0B0A3F51FECF771FC1DA33218A75318599DA5E8241E6C43E512AF6`。
- 线上验证：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`，`cleanup-smoke` 已执行，`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK。
- 当前线上资源：`assets/index-dHuZN-G7.js`、`assets/index-BIPUuX5i.css`。

## 2026-06-05 UI 插件全面审计第一轮

- 审计方式：按 `impeccable audit` 的产品 UI 检查维度执行，命令行插件本机超时，已改用浏览器 DOM 实测 + CSS 扫描；覆盖 `剧情编辑`、`AI 导演`、`发布变现` 三个核心页的桌面和 390px 移动端。
- 主要发现：移动端大量按钮/输入只有 34-40px，高频操作不满足 44px 触控基准；顶部工具栏文字标签被隐藏成 1px，移动端观感像临时后台；AI 导演短剧生产操作区移动端全宽堆叠过高。
- 已修复：统一移动端按钮、输入、选择器、图标按钮为 44px 触控高度；顶部工具栏移动端显示文字标签，并改成 46px 高横向命令栏；AI 导演生产操作区移动端改为主按钮全宽、次级动作两列，操作区高度从约 318px 降到约 214px。
- 本地验证：`npm.cmd run build` PASS，`npx.cmd eslint .` PASS；浏览器实测移动端 `smallTargets=0`，页面自身 `bodyScrollWidth=375`、视口 `390`，无页面级横向滚动。
- 线上部署包：`playdrama-studio-aliyun-20260605-223121.zip`，SHA256 `EDACA2111EF931B41836C8A00D9F3FD1F7C928AC625F0F634ADCAC032950FD96`。
- 线上验证：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`，`cleanup-smoke` 已执行，`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK。
- 当前线上资源：`assets/index-DtnA8GOx.js`、`assets/index-CwK-LYz4.css`。

## 2026-06-05 UI 插件商用视觉第二轮

- 主线目标：继续回应“平台不够大气”的问题，把二级页顶部从功能堆叠改成更克制的产品工作台，并清理发布页底部被挤成窄条的视觉缺陷。
- 前端调整：在 `src/App.css` 追加 `Commercial UI system pass, 2026-06-05` 覆盖层，统一工作台背景、面板阴影、命令区边框、发布/AI 面板底色和交互控件尺寸；剧情编辑不再使用单独深色命令区，三大核心页形成同一套商业产品语言。
- 布局修复：`发布变现` 底部普通面板恢复为 `span 6` 双列，不再被 `single-column` 网格压成约 78px 的窄列；桌面 1440px 下 `剧情编辑`、`AI 导演`、`发布变现` 三页均无横向溢出。
- 控件修复：桌面三页可点按钮小于 40px 的数量已降为 0；390px 移动端按钮小于 40px 的数量为 0，页面自身 `bodyScrollWidth=375`、视口 `390`，无页面级横向滚动；顶部导入/导出是工具栏内部横向滚动轨道，非页面溢出。
- 本地验证：`npx.cmd eslint .` PASS，`npm.cmd run build` PASS；本地构建资源为 `assets/index-DOUUz3t0.js`、`assets/index-cIB3p98-.css`。
- 线上部署包：`playdrama-studio-aliyun-20260605-231155.zip`，SHA256 `31D3676F5A52D88CDBFED2946EB7232DD43D7B33F7FCFD459C64CE52AC1536C1`。
- 线上验证：`verify-postgres` `49/49 PASS`，支付 provider smoke `8/8 PASS`，commercial smoke `13/13 PASS`，online smoke `15/15 PASS`，`cleanup-smoke` 已执行，`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK。
- 当前线上资源：`assets/index-DAFSZU8S.js`、`assets/index-cIB3p98-.css`；本地和服务器 `/root/playdrama-upload` 均已清理旧发布包，仅保留最新上线包。

## 重要文件

- 主前端：`src/App.tsx`
- 主样式：`src/App.css`
- API 客户端：`src/api.ts`
- 后端服务：`server/index.mjs`
- 数据库 schema：`docs/database-schema.sql`
- 今日商用推进清单：`docs/today-commercial-runbook-20260525.md`
- 宣传海报：`output/marketing/playdrama-preheat-poster.png`
- 路演 PPT：`output/pitch/playdrama-video-roadshow-15p.pptx`

## 常用验证

```powershell
npm.cmd run build
npm.cmd run lint
Invoke-RestMethod -Uri 'https://playdrama.tokenaicloud.com/api/health'
```

## 阿里云发布流程

```powershell
powershell -ExecutionPolicy Bypass -File deploy\create-aliyun-release.ps1
scp -i C:\Users\Administrator\.ssh\lingbase_codex_deploy_rsa -o StrictHostKeyChecking=accept-new output\release\<release>.zip root@59.110.171.143:/root/playdrama-upload/<release>.zip
```

服务器端沿用现有脚本流程：解压、复制 `deploy/cloud-server.env`、`npm ci`、`npm run build`、`npm prune --omit=dev`、跑 schema/verify、rsync 到 `/root/playdrama-studio-aliyun`、重启 `playdrama`、reload nginx。

## 下步优先级

1. 继续深度产品化“剧情编辑”：补可视化条件构建器、分支 AB 命名评分、节点级收益预测、路径差异对比和一键生成付费隐藏线。
2. 继续把“普通短剧生成”做成独立第二业务：补生成后结果细修、批量镜头生成、素材包下载、视频结果回填和普通短剧发布页。
3. 继续增强“发布变现”：补渠道素材导出、内测转化漏斗、支付失败重试文案和真实内测路径。
4. 做真实内测路径：手机号登录、保存、预览、付费入口、反馈。
5. 等用户补抖音开放平台和微信小程序 AppID/密钥/业务域名，接分发链路。
6. `playdrama.cn` 备案与 HTTPS 完成后切正式域名。

## 可清理但不影响线上

- `output/release` 旧发布包，建议只保留最近上线 zip；当前应只保留 `playdrama-studio-aliyun-20260606-120328.zip`。
- 根目录旧截图和旧 Vite/API 日志。
- `.playwright-mcp` 旧浏览器日志。

不要清理：

- `.secrets`
- `.env.local`
- `.env.tencent-sms.local`
- `.env.wechat-pay.local`
- `deploy/cloud-server.env`
- `docs`
- `src`
- `server`
- `public`

## 2026-05-29 真实短剧生成测试
- 线上 `AI_REQUEST_TIMEOUT_MS` 已从 45 秒提高到 120 秒；完整 `generate-project` 生产包实测耗时约 49.7 秒，45 秒会触发 `This operation was aborted`。
- 已在线上用临时 smoke 工作区真实调用 `/api/ai/generate-project`，供应商 `qwen / qwen-plus`，结果 PASS。
- 生成结果：8 个剧情节点、2 个结局、4 个变量、4 个角色、12 个选择、5 个条件选择，包含付费/隐藏结局信号。
- AI usage 已记录：`generate-project`，3834 tokens，估算成本 `USD 0.000825`。
- 生成项目已保存到 smoke 工作区：`prj_generation_1780056383522`。

## 2026-05-29 短剧生产包后台任务队列
- 新增 `/api/ai/jobs` 后台任务接口：创建任务返回 `202`，前端轮询任务状态，成功后复用原 `ai_usage_events` 成本记账。
- 新增 `/api/ai/jobs/:jobId` 查询和 `/api/ai/jobs/:jobId/retry` 重试接口；错误会转成可读状态，如模型超时、鉴权失败、额度不足、模型输出格式异常。
- “生成短剧生产包”已从长同步请求改成后台任务：AI 导演页显示任务阶段、进度条、更新时间、失败重试和完成后的生产包结果。
- 本地 stub smoke 已通过：任务从 queued/running 到 succeeded，生成 7 个节点，usage event 写入成功。

## 2026-05-29 AI 生成任务持久化
- 新增 `ai_generation_jobs` PostgreSQL 表：保存任务归属、输入、阶段、进度、可读错误、结果摘要、完整结果 JSON、重试来源和 usage event id。
- `/api/ai/jobs` 创建任务会先落库再返回 `202`；`/api/ai/jobs/:jobId` 读取持久化状态；`/api/ai/jobs/:jobId/retry` 创建带 `retryOf` 的重试任务。
- Node 服务启动后会运行内置 worker：自动恢复 `queued` 任务，以及服务重启前遗留的 `running` 任务。
- 已同步更新 `docs/database-schema.sql`、`server/verify-postgres.mjs` 和 `server/import-json-to-postgres.mjs`。

## 2026-05-29 上线前 P0 验收与合规页
- 线上全链路 smoke 通过：登录态、项目创建、Qwen 调用、AI usage、内容安全、发布、播放、埋点、分析读取、退出，共 `15/15 PASS`。
- 支付 provider smoke 通过：线上支付宝 provider 下单返回收银台链接，订单保持 pending，未支付不解锁，共 `8/8 PASS`。
- 支付回调 verifier 通过：无效签名拒绝、错额拒绝、有效回调置 paid、付费结局解锁，共 `10/10 PASS`。
- 新增正式合规静态页：`/privacy`、`/terms`、`/content-policy`、`/complaint`，线上均返回独立 HTML，不再只是 SPA fallback。
- 已清理 online smoke 用户、工作区、项目、usage、payment-provider 测试订单和相关临时数据。

## 2026-05-29 真实小额支付验收
- 微信支付真实 0.01 CNY 验收通过：订单 `ord_da034252-b782-45c9-be90-07c2f00d2eed` 已由微信回调置为 `paid`，`paidAt=2026-05-29T13:32:49.555Z`，付费结局 `S03` 已解锁。
- 支付宝真实支付页显示“商户合作协议已到期”，订单 `ord_099fe488-cfc1-4bf2-a22e-4ee33acc85d2` 已标记为 `failed`。
- 线上 `deploy/cloud-server.env` 已临时切为 `PAYMENT_PROVIDER=wechat`，避免用户进入过期支付宝通道；备份文件在服务器 `deploy/cloud-server.env.bak-payment-provider-20260529-213510`。
- 切换后复验：`/api/payment/provider` activeProvider 为 `wechat`，商业 smoke `13/13 PASS`，支付 provider smoke `8/8 PASS`。
- 支付宝恢复前需要在支付宝开放平台/商家中心续签或重新开通商户合作协议，再切回 `PAYMENT_PROVIDER=alipay,wechat` 并重跑真实小额验收。

## 2026-05-30 商用闭环复验与输出清理
- 当时线上包：`playdrama-studio-aliyun-20260530-095655.zip`，SHA256 `033708E858BE3C94655D8695FC430B53532AD12E25B4823F7B39DCF0F67CC338`，线上健康检查为 `storage=postgres`、`productionReady=true`、`auth=sms-code`、`payment=wechat`。
- 修复真实支付边界：非 sandbox provider 下，0 元/0 分发布包不再请求微信支付，后端直接返回 `400 paid_checkout_requires_positive_price`；支付 provider 验证脚本改为只选择真实付费发布包，避免免费 build 造成 provider 502。
- 部署后验证：`verify-postgres` 为 `46/46 PASS`；线上全链路 smoke 为 `15/15 PASS`；支付 provider smoke 为 `8/8 PASS`；商用 smoke 为 `13/13 PASS`，readiness 为 `17/17 pass`，Decision `GO`。
- 已清理线上 smoke 临时数据：smoke 用户、工作区、项目、发布 build、AI usage、内容安全记录、埋点和审计临时记录均已删除；支付 provider 脚本自身会删除本次验证订单。
- 当时已清理本地和服务器旧输出：本地 `output` 保留宣传图、路演 PPT 和 `playdrama-studio-aliyun-20260530-095655.zip`；后续最新包见下方客户试用主线产品化记录。
- 今日未新增真实用户付款；真实微信 0.01 CNY 小额支付验收仍以 2026-05-29 的成功回调为准。下一次上线前建议由人工扫码再跑一次微信真实小额支付，并在支付宝协议续签后恢复支付宝真实验收。

## 2026-05-30 客户试用主线产品化
- 主线目标：把平台从“看起来能用”推进到“真的能卖、敢给客户试用”。本轮优先补剧情编辑、发布变现和普通短剧生成后的交付体验。
- 剧情编辑新增商业制作能力：`生成付费线` 可一键保留免费结局、补出付费隐藏结局、写入解锁条件和正向定价；页面新增一键付费线状态、节点收益预估、主路径/付费路径对比和风险定位。
- 发布变现新增商用运营面：发布前风险提示、价格风险、付费路径风险、微信支付提示、支付失败重试、支付宝协议到期隐藏说明、pending 未支付不解锁说明。
- 短剧生成新增第二业务交付面：生成后细修、生产导出、互动升级、视频回填四项可见，让普通短剧生成结果能进入交付包，而不是停在一次性生成。
- 本地验证：`npm run build` 通过，`npm run lint` 通过；本地 Vite + API 打开后桌面和 390px 移动宽度无横向溢出，关键新增模块可见，控制台 0 error。
- 新增客户演示文档：`docs/customer-demo-path-20260530.md`，覆盖 3 分钟从生成、剧情编辑、发布变现到微信 0.01 元真实支付和数据回流的讲解路径。
- 已部署上线包：`playdrama-studio-aliyun-20260530-125311.zip`，SHA256 `79D1DBBBA07655D9E905C8ED762E41232CDBB56AD12043D55EE0C2FCFDA41CC9`；线上构建资源为 `assets/index-DOSgPnFi.css`、`assets/index-CxyuaQFe.js`。
- 部署后验证：`verify-postgres` 为 `46/46 PASS`；线上全链路 smoke 为 `15/15 PASS`；支付 provider smoke 为 `8/8 PASS`；商用 smoke 为 `13/13 PASS`，readiness 为 `17/17 pass`，Decision `GO`。本轮 smoke 临时数据已清理。

## 2026-05-30 客户试用台与收款运营台上线
- 主线目标：让客户登录后能在总览页按 `手机号登录 -> 生成/创建短剧 -> 保存预览 -> 发布收款 -> 数据回流` 自助跑完整试用路径，不再靠口头讲解。
- 总览页新增 `客户试用工作台`：展示 5 步闭环、4 个证据指标、每一步的下一步按钮，可直接跳到生成短剧、剧情台、预览、发布收款和数据查看。
- 支付订单数据拆分为两套口径：播放器解锁继续按当前 `sessionId` 读取，避免误解锁；发布变现页的运营账本读取当前发布包全量订单，用于运营查看真实客户支付、待支付、失败和退款。
- 发布变现页新增 `收款运营台`：展示回调验签、权益回写、异常队列、待支付跟进，并补充待支付、失败、已支付、退款/撤权的运营处理说明。
- 订单明细升级：订单行展示金额、回调/创建时间、微信交易单或商户单尾号，并把“已写入解锁节点 / 待支付不解锁 / 失败复核”等处理结论直接放在行内。
- 本地验证：`npm run build` PASS，`npm run lint` PASS；本地桌面和 390px 移动端浏览器检查无横向溢出，新增客户试用台和收款运营台可见。
- 线上部署包：`playdrama-studio-aliyun-20260530-163324.zip`，SHA256 `30183F77FD0D8C24C68EE2AD7E10C6A3970E39B4F006B2FB52C73A2E66B35E7D`。
- 线上构建资源：`assets/index-C10lr5le.css`、`assets/index-BiGiG5QY.js`。
- 线上验证：`verify-postgres` 为 `46/46 PASS`；支付 provider smoke 为 `8/8 PASS`；商用 smoke 为 `13/13 PASS`；线上端到端 smoke 为 `15/15 PASS`；smoke 临时数据已执行 `cleanup-smoke` 清理。
- 线上浏览器检查：`https://playdrama.tokenaicloud.com/studio` 可见客户试用台；发布变现页可见收款运营台和全量订单文案；390px 移动端无横向溢出，console 0 error。

## 2026-05-31 一键客户试用模式与演示脚本
- 主线目标：继续把平台从“看起来能用”推进到“真的能卖、敢给客户试用”，优先补客户演示现场最关键的确定感。
- 总览页 `客户试用工作台` 新增 `启动试用模式`：点击后会重置独立试用 session、清空旧订单口径、切到微信优先、把发布包状态置为待重新生成，并一键补齐付费隐藏线。
- 试用模式会把当前作品配置成 `Paid Ending`、`Unlisted`、`Beta` 和 `0.01` 元验收价格，避免客户演示时误用 9.9 元商业定价或过期支付宝通道。
- 客户试用台新增运行状态条和 `客户演示脚本`：按 00:00 双业务线、00:40 付费隐藏线、01:30 微信 0.01 元、02:20 数据回流的节奏，3 分钟能讲清楚生成、互动制作、发布收款和运营回流。
- 本地验证：`npm run build` PASS，`npm run lint` PASS；本地桌面和 390px 移动端浏览器检查无横向溢出，试用按钮、运行状态、0.01 元文案和演示脚本均可见。
- 线上部署包：`playdrama-studio-aliyun-20260531-125202.zip`，SHA256 `6C53F4FEB75BF6A6DCAFA7BB833DF9A579A2184EA510AE811304AC3E3DD5FBBE`。
- 线上构建资源：`assets/index-Beh1GTSi.css`、`assets/index-CRSYEutB.js`。
- 线上验证：`verify-postgres` 为 `46/46 PASS`；支付 provider smoke 为 `8/8 PASS`；商用 smoke 为 `13/13 PASS`；线上端到端 smoke 为 `15/15 PASS`；smoke 临时数据已执行 `cleanup-smoke` 清理。
- 线上浏览器检查：`https://playdrama.tokenaicloud.com/studio` 可见 `启动试用模式`、`客户演示脚本` 和 `收款运营台`；桌面与 390px 移动端无横向溢出，console 0 error。
- 本地和服务器输出已清理：本地 `output` 仅保留宣传图、路演 PPT 和最新上线包；服务器 `/root/playdrama-upload` 仅保留 `playdrama-studio-aliyun-20260531-125202.zip`。
- 真实微信 0.01 CNY 复验通过：订单 `ord_0c1e36bd-290a-439b-89ca-d5da125edd98` 已由微信回调置为 `paid`，`paidAt=2026-05-31T06:20:29.115Z`，微信交易号 `4200003042202605317935973888`，付费结局 `S03` 已通过 session 订单接口和全量运营账本回读解锁。
## 2026-05-31 上线守护台与订单运营补齐
- 主线目标：把发布变现页从展示型页面推进到客户试用时可运营、可排障、可导出订单、可解释上线风险的商用控制台。
- 后端新增受登录保护的 `/api/ops/launch-guard`：汇总存储、商用门禁、微信支付回调、滞留待支付、失败/退款订单、AI 生成任务失败和超时任务，输出 `ready / warning / blocked` 守护信号和异常队列。
- 后端新增受登录保护的 `PATCH /api/payment/orders/:orderId`：允许运营把订单标记为 `failed`、登记 `refunded` 撤权、或把失败/退款订单恢复为 `pending`；禁止人工直接改成 `paid`，保留 `opsNote`、操作者、前后状态和审计记录。
- 发布变现页新增 `上线守护台`：显示订单总量、待处理订单、AI 异常、最近更新时间、5 类守护信号和异常队列；未登录用户无法访问守护数据。
- 收款运营台新增订单搜索、CSV 导出、刷新守护和人工处理动作；订单明细支持按订单号、微信交易号、节点和运营备注检索，导出字段包含订单状态、金额、发布包、会话、权益节点、微信交易号和运营备注。
- 本地验证：`node --check server/index.mjs` PASS；`npm run build` PASS；`npm run lint` PASS；本地 `/api/ops/launch-guard` 返回正常；桌面和 390px 移动端浏览器检查无横向溢出，守护台、订单导出和人工处理动作可见。
- 线上部署包：`playdrama-studio-aliyun-20260531-151645.zip`，SHA256 `18B8A612D04CEFDF371080D68461299A3BF291E854498DD7B237A90B975713F2`。
- 线上构建资源：`assets/index-C8VAAjwU.css`、`assets/index-B_5Lpe39.js`。
- 线上验证：`verify-postgres` 为 `46/46 PASS`；支付 provider smoke `8/8 PASS`；商用 smoke `13/13 PASS`；线上端到端 smoke `15/15 PASS`；`/api/ops/launch-guard` 未登录访问返回 `401`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio` 已登录会话可见 `上线守护台`、`异常队列`、`导出订单`、`刷新守护` 和订单搜索；桌面与 390px 移动端无横向溢出，稳定刷新后 console 0 error。

## 2026-05-31 普通人创作入口上线
- 主线目标：让普通用户不必理解专业工作台，先用一句话想法、类型、时长和创作目标生成可交付短剧草稿。
- 首页新增 `普通人创作` 面板：一句话想法、类型切换、时长切换、`直接试卖 / 互动体验 / 普通短剧` 三种目标、生成预览和 4 步交付路径。
- `一键生成草稿` 会把低门槛输入自动补成专业创作表单，复用现有 `generate-project` 后台队列、AI usage 成本记录、AI 导演页、普通短剧导出和互动升级能力。
- `直接试卖` 默认生成付费结局结构，试卖价传入 `CNY 3.9`；`互动体验` 与 `普通短剧` 走免费体验，后续可升级互动短剧。
- 本地验证：`npm run build` PASS；`npm run lint` PASS；本地浏览器桌面与 390px 移动端无横向溢出；实际点击 `一键生成草稿` 已生成 7 节点、12 分镜、10 条视频队列并进入 AI 导演页。
- 线上部署包：`playdrama-studio-aliyun-20260531-154229.zip`，SHA256 `285F18CB55A21EDBDD06FD0F8CB825A2EE7EAEFD91A5F18A2E1DEC51730C244D`。
- 线上构建资源：`assets/index-DAFdxu_h.css`、`assets/index-qdX6NN3r.js`。
- 线上验证：`verify-postgres` 为 `46/46 PASS`；支付 provider smoke `8/8 PASS`；商用 smoke `13/13 PASS`；线上端到端 smoke `15/15 PASS`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio` 可见 `普通人创作`、`一键生成草稿`、`进入专业表单`、`直接试卖`；桌面与 390px 移动端无横向溢出，稳定刷新后 console 0 error。

## 2026-06-03 商用级短剧视频生产流水线
- 主线目标：把“普通短剧生成”从一次性脚本/分镜生成，推进到可给客户试用的生产交付流水线：真实供应商识别、批量任务提交、失败重试、结果预览、成片交付包导出和上线验收状态。
- 后端新增视频商用能力：`/api/projects/:projectId/video/jobs/batch` 支持按镜头批量创建视频任务；`/api/video/jobs/:jobId/retry` 支持基于原任务重试；任务 request 会记录 `batchId`、`sequenceIndex`、`retryOf`、`deliveryUse` 和 `qualityGate`，便于后续回溯、排障和交付。
- `/api/video/provider` 已补充 `commercial` 状态：展示 live submit 限额、prompt 批次上限、是否可提交真实供应商、是否可重试、是否可导出交付清单和下一步建议。线上当前 `VIDEO_PROVIDER=dashscope`，DashScope/Qwen key 与 MiniMax key 均已配置；`VIDEO_LIVE_SUBMIT_LIMIT=1`，避免误触发大量真实视频扣费。
- 前端 AI 导演页新增“视频生产队列”商用看板：视频供应商、镜头提交、结果预览、失败恢复、成片交付五张状态卡；支持生成下一条/生成 Prompt 批次、刷新任务、失败重试、导出成片交付包。
- “一键生成草稿”后现在会留在 AI 导演页，并直接显示普通短剧生产结果与视频生产队列；已修复生成后跳到 AI 页但队列面板不可见的问题。
- 成片交付包导出当前为 Markdown final-cut manifest：按镜头顺序列出 clip、sourceUrl、任务 ID、失败/缺失镜头和剪辑说明。注意：还未做 FFmpeg/云剪辑自动拼接成单个 MP4；下一步若要“真正一键成片”，应补视频合成 worker、云存储归档和 CDN 播放地址回填。
- 本地验证：`npm run build` PASS；`npm run lint` PASS；本地 API smoke 创建项目后批量生成 2 个视频任务、重试 1 个任务、列表回读 3 个任务 PASS。
- 本地浏览器验证：桌面端 AI 导演页可见视频生产队列；点击“生成 Prompt 批次”后进入 10/10 镜头任务池；390px 移动端无横向溢出，队列卡片单列展示，console 0 error。
- 上线包：`playdrama-studio-aliyun-20260603-140502.zip`；SHA256 `B984D1215796F1FB3FD4B797A92CB0DAA6F8DE84E3A05B4A345C46945959DD58`。
- 线上构建资源：`assets/index-DVqoPomf.css`、`assets/index-DwDIswoJ.js`。
- 线上部署验证：`verify-postgres` 为 `46/46 PASS`；支付 provider smoke `8/8 PASS`；商用 smoke `13/13 PASS`；readiness `17/17 pass`，Decision `GO`；端到端 online smoke `15/15 PASS`。
- 线上视频流水线 smoke 为避免真实扣费，临时使用 `VIDEO_PROVIDER=stub` 验证接口闭环：provider 响应、项目创建、批量任务创建、prompt-ready 状态、retryOf 重试和任务列表回读共 `6/6 PASS`；验证后已恢复线上真实 provider 配置并重启服务。

## 2026-06-04 对标大厂双业务入口与成片合成
- 产品对标：主 UI 和创作流程先对标 `即梦 AI / 剪映生态`，因为它覆盖文生图、图生图、文生视频、图生视频、智能画布和故事创作等 AI 创作入口；视频生产引擎能力参考 `可灵 AI`，重点关注文生视频、图生视频、多图参考、视频延展、对口型等生产能力。
- 平台定位已收敛为两个业务入口：`互动短剧制作` 是主业务，承接剧情图谱、玩家选择、付费隐藏线、H5/小程序发布、微信收款、订单和渠道数据回流；`常规短剧生成` 是第二业务，承接 brief -> 剧本/角色/分镜/视频队列/真实素材预览/失败重试/交付清单/MP4 合成。
- 前端首页和总览页已改成明确双入口：首屏显示 `互动短剧制作 + 常规短剧生成`，操作按钮为 `制作互动短剧` 和 `生成常规短剧`；总览页业务卡补齐两条路径的客户价值和三步流程，避免把互动制作和普通短剧生成混成一个入口。
- AI 导演页新增 `合成 MP4` 能力：视频生产队列可从成功镜头或手动 clips 创建最终成片任务，页面显示合成状态、镜头数、刷新、下载 MP4、下载 manifest 和失败/交接态重试。
- 后端新增 `final_video_renders` 表和 API：`GET /api/projects/:projectId/video/renders`、`POST /api/projects/:projectId/video/renders`、`POST /api/video/renders/:renderId/retry`，以及公开只读资源 `/api/video/renders/:id/file`、`/api/video/renders/:id/manifest`。
- 成片 worker 使用 FFmpeg `visual-cut-v1`：把镜头素材规范化为 720x1280、24fps、H.264 MP4 visual segments，再 concat 为 `final.mp4`；如果线上缺 FFmpeg，会进入 `handoff-ready` 并产出 manifest，不会误报成功。
- 数据迁移和校验已同步：`docs/database-schema.sql`、`server/verify-postgres.mjs`、`server/import-json-to-postgres.mjs`、`server/cleanup-online-smoke.mjs` 均已支持 `final_video_renders`；线上 `verify-postgres` 已升为 `49/49 PASS`。
- 线上部署包：`playdrama-studio-aliyun-20260604-090250.zip`；SHA256 `70B296281FD4BEF934EE01DE8B343C808FC7423D49D1265FA332FEF98973DB93`；线上构建资源为 `assets/index-vcPwilK3.css`、`assets/index-D3QMs58m.js`。
- 线上服务器已安装 FFmpeg：Ubuntu apt 包 `ffmpeg 4.4.2-0ubuntu0.22.04.1`；线上服务已完成 schema apply、systemd restart、nginx reload 和健康检查。
- 验证结果：本地 `node --check server/index.mjs` PASS、`npm run build` PASS、`npm run lint` PASS；本地 FFmpeg render smoke 成功产出 MP4；桌面和 390px 移动端浏览器检查无横向溢出、console 0 error。
- 线上验证：支付 provider smoke `8/8 PASS`；商用 smoke `13/13 PASS`；online smoke `15/15 PASS`；线上临时数据库 render smoke 成功产出 `final.mp4`，且未触发真实视频供应商扣费。
- 当前限制：MP4 合成已达到可交付的视觉成片闭环，但暂未做自动配乐、字幕烧录、音频混流、云存储归档和 CDN 长期地址；下一步如要继续超过大厂体验，应补 `声音/字幕/包装模板/成片版本管理/客户审片批注`。

## 2026-06-04 成片交付台 v2：字幕、音轨、版本和审片
- 主线目标：把 `常规短剧生成` 从“能合成 MP4”继续推进到“客户可审片、可下载、可继续精剪”的商用交付台。
- 后端成片任务增强：`final_video_renders.request/response` 现在记录 `version`、`deliveryProfile`、`audioPolicy`、`subtitlePolicy`、`captions`、`reviewChecklist` 和 `assets`，不新增表字段，继续复用 `request/response jsonb`，降低线上迁移风险。
- FFmpeg 合成升级：每段素材规范化为 720x1280、24fps、H.264，并统一写入静音 AAC 音轨床；最终 MP4 现在可被 `ffprobe` 检测到 `video + audio` 两条流，后续可继续混入配乐、口播和音效。
- 字幕交付升级：合成任务会自动生成 `captions.srt`，公开只读下载地址为 `/api/video/renders/:id/captions.srt`，manifest/json 里也会回写 `captionsUrl`。
- Manifest 升级：`manifest.md` 增加版本、字幕、音轨、每段字幕文案和审片清单；审片默认包含前三秒钩子、角色/场景连续性、字幕与口播、素材商用授权。
- 前端 AI 导演页升级：原 `final-render-strip` 扩展为成片交付台，显示 MP4 状态、版本、音轨、字幕、审片进度、下载 MP4、下载字幕、合成清单和重试入口；桌面和 390px 移动宽度已检查无横向溢出。
- 本地验证：`node --check server/index.mjs` PASS；`npm run build` PASS；`npm run lint` PASS；本地临时 DB render smoke 成功产出 MP4、SRT、manifest，且 MP4 包含 video/audio 流。
- 线上部署包：`playdrama-studio-aliyun-20260604-161440.zip`；SHA256 `556DF18E2E5FB9637F651F576E974C745DC24DEA968EBEA37FB7FBF74607FEB6`；线上构建资源为 `assets/index-zHpXe4qK.css`、`assets/index-Rz8U7lZg.js`。
- 线上验证：`verify-postgres` 为 `49/49 PASS`；支付 provider smoke `8/8 PASS`；商用 smoke `13/13 PASS`；online smoke `15/15 PASS`；远程临时 DB render smoke 成功产出 MP4、SRT、manifest，且 MP4 包含 video/audio 流。
- 当前限制：默认仍是 `sidecar-srt-v1`，未默认烧录字幕；音轨为静音 AAC 床，不是自动配乐或口播；下一步应补 `配乐/口播混音`、`字幕烧录开关`、`审片批注保存`、`成片版本对比`、`云存储/CDN 长期归档`。

## 2026-06-04 JoyAI-Echo 对标落地：制作记忆库、导演修改和质量验收
- 这轮没有直接接 JoyAI-Echo 模型，因为其开源权重标注为非商用授权，且推理显存成本高；本轮把文章中真正适合 PlayDrama 的能力产品化为常规短剧生成业务里的 `制作记忆库`、`对话式导演修改` 和 `商用质量验收`。
- `常规短剧生成` 生成生产包后，AI 导演页现在会展示 5 组制作记忆：人物记忆、声音记忆、场景风格、分镜上下文、商业卡点，用于锁定角色、声线、场景和付费反转。
- 新增 4 条导演修改动作：局部重生成、前三秒钩子、付费反转、字幕重排。按钮点击会先更新独立状态行，再尝试复制指令，避免浏览器剪贴板权限导致界面无反馈。
- 新增 5 项商用质量验收指标：角色一致性、剧情连贯性、字幕可用性、商用授权、付费卡点；旧生产包会自动回填兼容默认值，避免历史草稿打开时报错。
- 导出内容同步升级：视频 Prompt 包、普通短剧生产包和成片交付包都会写入制作记忆库、导演修改指令和质量验收分，不再只是页面展示。
- 本地验证：`npm.cmd run build` PASS，`npm.cmd run lint` PASS；本地浏览器生成生产包后可见 5 组记忆、4 条导演指令、5 项质量分，375px 移动端无横向溢出，console 0 error。
- 线上部署包：`playdrama-studio-aliyun-20260604-193322.zip`；SHA256 `521004ABBC8A1CA1B3F9187EDA8EC0A234B5CE05D301984C3EB5D263249DBF94`；线上构建资源为 `assets/index-DBTmrCb3.css`、`assets/index-CnzRKJvC.js`。
- 线上验证：`verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；支付 provider smoke `8/8 PASS`；commercial smoke `13/13 PASS`；online smoke `15/15 PASS`；smoke 临时数据已执行 `cleanup-smoke` 清理。
- 下一步建议：把“对话式导演修改”从复制指令升级为真实单镜头重跑 API，补镜头版本对比、批注保存、字幕烧录开关、配乐/口播混音和云存储/CDN 长期归档。

## 2026-06-04 UI/功能检查与 audit 请求风暴修复
- 本轮目标：检查线上 UI 和功能是否达到“敢给客户试用”的稳定度，并修复工作台反复请求 `/api/audit` 导致页面和服务器负载升高的问题。
- 问题定位：`src/App.tsx` 中多个初始化 `useEffect` 依赖 `session` 和 `authProvider` 对象；`refreshTeamState` 每次刷新都会设置新对象，导致 effect 循环触发，再反复拉取 `/api/audit`。
- 修复方式：新增稳定派生值 `hasWorkspaceSession` 和 `authProviderId`，把相关 effect 依赖从易变对象切换为布尔值或 provider id 字符串，保留原有登录、作品库、视频队列和发布任务逻辑。
- 本地验证：`npm.cmd run build` PASS，`npm.cmd run lint` PASS；新前端构建资源为 `assets/index-Dbrw12UF.js`，随后线上重新构建为 `assets/index-BKltTibL.js`。
- 线上部署包：`playdrama-studio-aliyun-20260604-202645.zip`；SHA256 `AACC80D0724105C9704F1A108480B26ADE1044E1F93169B082E4DA2338D8D3F9`；线上构建资源为 `assets/index-DBTmrCb3.css`、`assets/index-BKltTibL.js`。
- 线上服务器验证：`verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；支付 provider smoke `8/8 PASS`；commercial smoke `13/13 PASS`；online smoke `15/15 PASS`；smoke 临时数据已执行 `cleanup-smoke` 清理。
- 浏览器性能复查：登录状态下重新加载 `https://playdrama.tokenaicloud.com/studio?generate=1`，稳定 6 秒内 `/api/audit` 从此前连续刷屏降为 2 次，生成后总计 3 次；console 0 error，桌面和 390px 移动端横向溢出均为 0。
- UI/功能复查：首页双业务入口可见 `制作互动短剧` 和 `生成常规短剧`；剧情编辑页可见 `生成付费线`、节点收益预估、主路径/付费路径对比和风险定位；发布变现页可见微信支付提示、支付宝协议到期隐藏说明、支付失败重试、pending 不解锁、上线守护和订单异常队列。
- 真实生成复查：线上点击 `生成短剧生产包` 成功返回 `已生成大厂级生产包 · qwen / qwen-plus · USD 0.000817`，并回显制作记忆、导演修改、商业质量验收和视频生产队列；未发现 console error。
- UI 结论：平台已经具备试用级功能闭环和两条业务线表达，但工作台二级页面信息密度仍偏高。下一步建议继续做页面级信息架构收敛：每个二级页固定一个主任务区、一个风险/验收区、一个运营动作区，减少客户首次进入时的认知负担。

## 2026-06-06 常规短剧视频生成商用链路修复
- 问题定位：真实生成的普通短剧原片虽然生产包标记为 `9:16`，但 DashScope 返回了 `1920x1080` 横屏素材；供应商原片没有字幕流，前端“预览”直接打开供应商 MP4，客户看到的是未包装半成品。
- 后端修复：DashScope/通义万相提交参数从旧 `size=720*1280` 切换为官方新模型使用的 `parameters.resolution` + `parameters.ratio`，默认 `DASHSCOPE_VIDEO_RESOLUTION=720P`、`ratio=9:16`；任务响应会记录 `requestParameters` 方便排查。
- Prompt 修复：`buildVideoPrompt` 增加 PlayDrama 商用视频约束，明确要求竖屏短剧构图、真人电影感、前三秒钩子，并禁止模型自己生成字幕、标题卡、水印、二维码、可读手机 UI 字、乱码字母；同时传入 `negative_prompt`。
- 字幕预览修复：视频任务 request 增加 `caption/dialogue`，前端提交镜头时自动生成可烧录字幕文案；已完成视频的按钮从“预览”升级为“平台预览”，点击后创建单镜头 `burned-in-srt-v1` 合成任务，输出竖屏字幕审片版，而不是直接给客户看供应商原片。
- 成片包装修复：FFmpeg 片段规范化从黑边 `pad` 升级为模糊背景 + 居中主体的 720x1280 包装；横屏供应商素材也能先生成接近短视频形态的竖屏预览。
- 本地验证：`node --check server/index.mjs` PASS；`npm.cmd run build` PASS；`npx.cmd eslint server/index.mjs src/App.tsx src/api.ts` PASS；本地 FFmpeg 包装烟测输出 `720x1280`、约 9 秒、含 audio 的 MP4。
- 线上部署包：`playdrama-studio-aliyun-20260606-120328.zip`；SHA256 `7720248479B299F444F72E7B58D056F195A9EB9A8F22BB6323E11FF30D60279F`；线上构建资源为 `assets/index-z3tXDvG8.js`、`assets/index-cIB3p98-.css`。
- 线上验证：远端 `verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；`deploy:preflight` `8/8 PASS`；`launch:gate` `17/17 PASS`；commercial smoke `13/13 PASS`；微信支付 provider smoke `8/8 PASS`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?generate=1&fresh=20260606-120328` 可见常规短剧生成台和生成入口；生产 JS 已包含 `平台预览`、`burned-in-srt-v1`、`single-shot-platform-preview-v1`；console error 0；页面无横向溢出。
- 回滚保留：服务器保留 `/root/playdrama-studio-aliyun.previous-20260606-120328`；本地 `output/release` 和服务器 `/root/playdrama-upload` 已清理到只保留最新上线 zip。
- 下一步建议：继续做“常规短剧生成”的商用质量层，不再只补大框。重点是角色参考图/首帧图进入视频生成、镜头版本对比、字幕断句编辑、配乐/口播混音、成片 CDN 长链、客户审片批注和“普通短剧 -> 互动短剧”的升级转化漏斗。

## 2026-06-06 常规短剧生产路径简化和脚本商用化
- 本轮目标：响应“生产路径要简单，剧本编写、生成视频脚本全部优化到大厂标准”，把 AI 导演页的常规短剧生产从功能堆叠改成 `Brief -> 剧本编写 -> 视频脚本 -> 生成视频 -> 审片交付` 五步流水线。
- 前端生产路径：新增 `series-production-command` 主任务区，按当前状态只给用户一个主按钮：生成剧本和视频脚本、提交视频队列、合成审片版或导出交付包；降低普通用户第一次使用时的判断成本。
- 剧本编写增强：`分集剧本` 升级为 `剧本编写`，展示集纲、冲突、选择和结局；新增 4 个验收点：剧本结构、前三秒、选择冲突、商业卡点，让客户能看出这是可交付生产台，不只是文本草稿。
- 视频脚本增强：`镜头队列` 升级为 `视频脚本`，展示镜头、字幕、Prompt 和参考；新增 4 个验收点：镜头脚本、字幕文案、视频 Prompt、角色参考，导出包同步写入 caption 和镜头 prompt。
- Prompt 商用约束：生产 Review 包和视频脚本导出统一要求真人电影感、9:16 竖屏、角色服化道一致，并禁止字幕、标题卡、可读手机字、UI 选项字直接出现在模型画面里，避免供应商原片出现乱码字母或错误 UI。
- 导出增强：`copyProductionPromptPack` 和 `exportGeneratedProductionPack` 现在会写入大厂生产路径、剧本编写、视频脚本、字幕文案、Prompt 和质量验收，方便交付给剪辑、导演或客户审片。
- UI 触控修复：移动端搜索输入本体高度从 24px 提升到 40/44px，真实可点击目标不再只靠外层容器撑高；线上 390px 检查 `smallTargets=[]`。
- 本地验证：`node --check server/index.mjs` PASS；`npm.cmd run build` PASS；Playwright 本地桌面和 390px 移动端复查均通过，五步路径完整、剧本/视频脚本共 8 个验收点、无横向溢出、console 0 error。`npx.cmd eslint src/App.tsx server/index.mjs` 本轮在本机超时未返回，因此未把 lint 计为通过。
- 线上部署包：`playdrama-studio-aliyun-20260606-125502.zip`；SHA256 `2F9F34477443A0211ADABB1456FD951B29A1B339DC4CEFD14076CDC2D37FC7F6`；线上构建资源为 `assets/index-BkmdTizb.js`、`assets/index-CzZs5XyA.css`。
- 线上环境修正：补写远端 `deploy/cloud-server.env` 的非敏感标记 `PLAYDRAMA_DEPLOY_TARGET=aliyun`，避免阿里云部署误按 Netlify 配置做预检；修改前已保留 `deploy/cloud-server.env.backup-20260606-125502`。
- 备份：已创建并验证 PostgreSQL 备份 `/root/playdrama-backups/playdrama-postgres-20260606-130658.dump`，用于后续员工或 AI 接手前回溯。
- 线上验证：`verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；`deploy:preflight` `8/8 PASS`；`launch:gate` `17/17 PASS`；commercial smoke `13/13 PASS`；微信支付 provider smoke `8/8 PASS`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?generate=1&ui=production-path-20260606-live` 在 390px 移动端可见五步生产路径和主任务按钮，剧本/视频脚本 8 个验收点存在，`scrollWidth=375`、`innerWidth=390`、`smallTargets=[]`、console 0 error。
- 回滚保留：服务器当前保留 `/root/playdrama-studio-aliyun.previous-20260606-125502`；发布上传目录和本地 `output/release` 已清理到只保留最新上线包。
- 下一步建议：继续把“可生成”推进到“可稳定交付”：角色参考图/首帧图入队、镜头版本对比、字幕断句编辑、配乐/口播混音、成片 CDN 长链、客户审片批注闭环，以及普通短剧升级为互动短剧的转化漏斗。

## 2026-06-06 客户试用承接入口上线
- 本轮目标：承接公众号和客户试用流量，解决普通用户首次进入后不知道从哪里开始的问题，让登录后能看到一条 `3 分钟从创意跑到可收款演示` 的清晰路径。
- 前端新增 `customer-onboarding-panel`：放在总览页最靠前的业务内容区，包含 `启动 3 分钟体验`、`进入示例短剧`、`查看收款验收` 三个主动作。
- 双业务入口前置：面板内直接给出 `制作互动短剧` 和 `生成常规短剧` 两张入口卡，分别引导到剧情编辑台和 AI 生成台；启动体验会生成 0.01 元付费隐藏线和独立试用会话，但不会自动提交视频生成或真实支付。
- 试用路径产品化：把客户演示固定成 5 步：手机号登录、生成或创建短剧、保存并预览、发布包收款、数据回流；同步展示 3 个验收证据和 4 段 3 分钟演示脚本。
- 移动端顺序修复：390px 宽度下，顶部栏后直接出现客户试用入口，预发布门禁条后移，避免新用户先看到内部门禁状态；移动端无横向溢出，触控目标均不小于 40px。
- 本地验证：`node --check server/index.mjs` PASS；`npm.cmd run build` PASS；Playwright 桌面和 390px 移动端复查通过，双业务入口、5 步路径、3 个证据、4 段脚本均存在，console 0 error。`npx.cmd eslint src/App.tsx server/index.mjs` 本机仍超时未返回，未计为通过。
- 线上部署包：`playdrama-studio-aliyun-20260606-144154.zip`；SHA256 `682E67E36422CF39E5E7F8BFD21650E17641BC3E9777A081FD1012B8F866CA2B`；线上构建资源为 `assets/index-BZgkTR_y.js`、`assets/index-BS0LNYo6.css`。
- 线上验证：`verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；`deploy:preflight` `8/8 PASS`；`launch:gate` `17/17 PASS`；commercial smoke `13/13 PASS`；微信支付 provider smoke `8/8 PASS`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?ui=trial-onboarding-20260606-live` 在 390px 移动端可见客户试用入口、双业务入口和 5 步路径；`scrollWidth=375`、`innerWidth=390`、`smallTargets=[]`、console 0 error。
- 部署备注：远端部署时 PowerShell here-string 带 CR，导致最后一次 `systemctl is-active` 参数被污染；已用单行命令重新 `systemctl start playdrama`，服务恢复 active 且全套门禁通过。
- 下一步建议：给公众号文章底部补固定 CTA 和试用二维码/联系方式；再做一个“客户试用账号欢迎页”，把试用入口和联系销售动作连起来。

## 2026-06-07 客户试用交付动作补齐
- 本轮目标：继续提升平台 UI 和功能到商用试用标准，让销售、运营或创始人现场演示时能直接复制客户话术和 3 分钟演示脚本，不再口头拼接说明。
- 前端增强：`customer-onboarding-panel` 新增 `customer-onboarding-handoff` 交付动作区，包含 `复制试用邀请`、`复制演示脚本`、`保存当前版本/打开发布链接` 三个按钮。
- 复制内容：试用邀请会说明两条业务线、建议体验顺序和微信 0.01 元验收；若已有发布包，会自动带正式发布链接。演示脚本会输出 3 分钟讲解节点、5 步验收重点、当前进度和发布链接状态。
- 交互反馈：复制成功或失败会回写到客户试用状态条，现场演示时可见反馈；不会自动提交视频生成或触发真实支付。
- 本地验证：`node --check server/index.mjs` PASS；`npm.cmd run build` PASS；`npx.cmd eslint src/App.tsx server/index.mjs` PASS；Playwright 桌面和 390px 移动端复查通过，3 个交付动作、2 个业务入口、5 步路径均存在，复制邀请反馈正常，console 0 error。
- 线上部署包：`playdrama-studio-aliyun-20260607-100039.zip`；SHA256 `6DE4B0674B7297456DA6A8AB2B9574D0039F5E87A70D9F54DDFDA9FB98EFE597`；线上构建资源为 `assets/index-DrFklyua.js`、`assets/index-BFAHDywE.css`。
- 线上验证：`verify-postgres` 为 `49/49 PASS`；`ops.sh health` 本地 node、本地 nginx、公网 health 全部 OK；`deploy:preflight` `8/8 PASS`；`launch:gate` `17/17 PASS`；commercial smoke `13/13 PASS`；微信支付 provider smoke `8/8 PASS`。
- 线上浏览器复查：`https://playdrama.tokenaicloud.com/studio?ui=trial-handoff-20260607-live` 在 390px 移动端可见客户试用入口、复制试用邀请、复制演示脚本和发布链接动作；`scrollWidth=375`、`innerWidth=390`、`smallTargets=[]`、console 0 error。
- 下一步建议：继续做客户侧欢迎页和试用账号分配页，把“公众号看到 -> 联系开通 -> 登录后 3 分钟体验 -> 微信 0.01 元验收”串成可运营漏斗。
